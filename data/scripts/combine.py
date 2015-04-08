#!/usr/bin/python -O

import io
import json
import os

NUM_ARTICLES = 100
NUM_ALL_DOMAINS = 100
NUM_OTHER_DOMAINS = 5

"""
Creates a series of files with paths: lang/country.js

Each file declares a javascript variable called ITEMIZED_DATA with the following structure:

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
    for lang in LANGS:
        for iso in ISOs:
            r = combine_one(lang, iso)
            for s in ('sources', 'editors'):
                d = '../results/%s/combined/%s' % (s, lang)
                if not os.path.exists(d): os.makedirs(d)
                if s == 'editors': del(r['domains'])
                js = json.dumps(r)
                p = '%s/%s.js' % (d, iso)
                f = io.open(p, 'w', encoding='utf-8')
                f.write(u'var ITEMIZED_DATA = %s;\n' % js)
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
    

def combine_one(lang, c1):
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
    }


if __name__ == '__main__':
    combine()
