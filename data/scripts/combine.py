#!/usr/bin/python -O

from collections import defaultdict 

import io
import json
import os

NUM_ARTICLES = 30
NUM_ALL_DOMAINS = 30
NUM_OTHER_DOMAINS = 3

"""
Creates a series of files with paths: lang/country.js

Each file declares a javascript variable called GP_ITEMIZED_DATA with the following structure:

{
    articles : [
        [ 'United States', 324244, 'http://en.wikipedia.org/w/United_States'],
        [ 'New York City', 32244, 'http://en.wikipedia.org/w/New_York_City'],
        ... other highly viewed articles ...
        [ 'Other', 19473, '']
    ]
    domains : {
        'all' : [
            [ 'nytimes.com', 3984],
            [ 'google.com', 394],
            ... other highly cited domains and counts ...
            [ 'Other', 34243]
        ],
        ''us' : [
            ... same format as 'all' above...
        ]
    }

}
"""


LANGS = set('all,ace,als,ang,ar,arz,as,ast,bar,bn,ca,ce,ckb,cs,cy,da,de,dsb,el,en,es,et,eu,fa,fi,fr,ga,gl,gn,gu,hi,hif,hu,id,ilo,is,it,ja,ka,kab,km,ko,la,lo,lv,map-bms,ml,mr,myv,nds,nds-nl,new,nl,no,oc,pfl,pih,pl,pt,ro,ru,sah,sc,sco,simple,so,sv,te,tg,th,tn,tt,uk,ur,uz,vi,zh'.split(','))

ISOs = set(['all'])
for line in io.open('../raw/geonames.txt', encoding='utf-8'):
    if line[0] == '#': continue
    tokens = line.split('\t')
    iso = tokens[0].strip().lower()
    ISOs.add(iso)

def combine():
    raw = {
        'sources' : read_raw_source_data(),
        'editors' : defaultdict(lambda: defaultdict(list))
    }
    for lang in LANGS:
        print 'doing', lang
        for iso in ISOs:
            for s in ('sources', 'editors'):
                r = combine_one(lang, iso, raw[s][lang][iso])
                d = '../results/%s/combined/%s' % (s, lang)
                if not os.path.exists(d): os.makedirs(d)
                if s == 'editors': del(r['domains'])
                js = json.dumps(r)
                p = '%s/%s.js' % (d, iso)
                f = io.open(p, 'w', encoding='utf-8')
                f.write(u'var GP_ITEMIZED_DATA = %s;\n' % js)
                f.close()

def prune_top(top, k, min_item_count=0, min_total_count=0):
    total = sum(int(i[1]) for i in top)
    if total < min_total_count:
        return []

    remaining = total
    pruned = []
    for row in top[:k]:
        item = row[0]
        count = int(row[1])
        if item.lower() == 'other' or count < min_item_count:
            break
        remaining -= count
        pruned.append(row)

    if not pruned:
        return []

    if remaining > 0:
        pruned.append(['other', remaining])
     
    return pruned


def read_raw_source_data():
    f = io.open('../raw/publisher-counts.js', 'r', encoding='utf-8')
    s = f.read().strip()
    f.close()
    i = s.find('[[')
    s = s[i:-1]
    data = json.loads(s)
    counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    for row in json.loads(s):
        (lang2, c1, _, c2, _, _, n) = row
        for lang_key, country_key in [(lang2, c1), ('all', c1), (lang2, 'all'), ('all', 'all')]:
            counts[lang_key][country_key][c2] += n

    # translate count dictionaries to sorted 2-tuples
    results = defaultdict(lambda: defaultdict(list))

    for lang in counts:
        for c1 in counts[lang]:
            items = list(counts[lang][c1].items())
            items.sort(lambda i1, i2: i2[1] - i1[1])
            results[lang][c1] = items

    return results

def combine_one(lang, c1, raw):
    p = '../results/sources/articles/%s/%s.js' % (lang, c1)
    articles = []
    if os.path.isfile(p):
        f = io.open(p, 'r', encoding='utf-8')
        articles = prune_top(json.load(f), NUM_ARTICLES)
        f.close()

    domains = {}
    for c2 in ISOs:
        p = '../results/sources/domains/%s/%s/%s.js' % (lang, c1, c2)
        if os.path.isfile(p):
            f = io.open(p, 'r', encoding='utf-8')
            max_len = NUM_ALL_DOMAINS if c2 == 'all' else NUM_OTHER_DOMAINS
            pruned = prune_top(json.load(f), max_len, 5, 20)
            if pruned: domains[c2] = pruned
            f.close()

    return  {
        'articles' : articles,
        'domains' : domains,
        'data' : raw
    }


if __name__ == '__main__':
    combine()
