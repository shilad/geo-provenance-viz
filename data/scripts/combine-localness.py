#!/usr/bin/python -O

from collections import defaultdict 

import io
import json
import os

NUM_ARTICLES = 30
NUM_DOMAINS = 30

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
    data : {
        ['us', 0.75],
        ['ca', 0.15],
        ...
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
    for s in ('sources',):
        raw = read_raw_source_data()
        localness = make_localness(raw)
        for lang in LANGS:
            print 'doing', s, lang
            for iso in ISOs:
                r = localness[lang][iso]
                d = '../results/%s/combined-localness/%s' % (s, lang)
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


def make_localness(raw_data):
    result = {}

    for lang in LANGS:
        print 'preparing data for', lang

        result[lang] = {}

        # step 1: calculate localness, etc.
        localness = {}
        domains = defaultdict(list)

        for iso in ISOs:
            p = '../results/sources/domains/%s/%s/%s.js' % (lang, iso, iso)
            if os.path.isfile(p):
                f = io.open(p, 'r', encoding='utf-8')
                domains[iso] = prune_top(json.load(f), 3, 5, 20)
                localness[iso] = 1.0 * raw_data[lang][iso][iso] / sum(raw_data[lang][iso].values())
                f.close()

        localness_items = localness.items()
        localness_items.sort(lambda i1, i2: cmp(i2[1], i1[1]))

        for iso in ISOs:
            p = '../results/sources/articles/%s/%s.js' % (lang, iso)
            articles = []
            if os.path.isfile(p):
                f = io.open(p, 'r', encoding='utf-8')
                articles = prune_top(json.load(f), NUM_ARTICLES)
                f.close()

            domains2 = dict(domains)

            p = '../results/sources/domains/%s/%s/%s.js' % (lang, iso, iso)
            if os.path.isfile(p):
                f = io.open(p, 'r', encoding='utf-8')
                pruned = prune_top(json.load(f), NUM_DOMAINS, 5, 20)
                if pruned: domains2['all'] = pruned
                f.close()

            r = { 
                'domains' : domains2,
                'articles' : articles,
                'data' : localness_items
            }
            result[lang][iso] = r 

    return result


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

    return counts

if __name__ == '__main__':
    combine()
