#!/usr/bin/python -O

import bz2
import codecs
import json
import os
import sys

def warn(message):
    sys.stderr.write(message + '\n')


def write(rows):
    (lang, country) = rows[0][:2]
    d = '../results/sources/%s' % lang
    if not os.path.isdir(d):
        os.mkdir(d)
    f = codecs.open(d + '/%s_articles.js' % country, 'w', encoding='utf-8')
    f.write('var GP_ITEMIZED_ARTICLES = [\n')
    for r in rows:
        json.dump(r, f)
        if r is not rows[-1]:
            f.write(',')
        f.write('\n')
    f.write(']\n')
    f.close()


f = codecs.EncodedFile(bz2.BZ2File('../raw/lang_country_views.txt.bz2', 'rb'), 'utf-8')
rows = []

prevLine = None
prevKey = None
for line in f:
    if line == prevLine:
        continue

    tokens = line.split('\t')
    if len(tokens) != 5:
        warn('invalid line: %s' % `line`)
        continue

    (lang, country, count, article, url) = [t.strip() for t in tokens]
    if int(count) == 0:
        continue

    key = (lang, country)

    if prevKey and key != prevKey:
        write(rows)
        rows = []

    rows.append(tokens)

    prevKey = key
    prevLine = line


