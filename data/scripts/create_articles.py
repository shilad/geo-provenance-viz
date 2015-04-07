#!/usr/bin/python -O

import bz2
import codecs
import json
import os
import sys

def warn(message):
    sys.stderr.write(message + '\n')


def write(lang, country, rows):
    d = '../results/sources/articles/%s' % lang
    if not os.path.isdir(d):
        os.mkdir(d)
    f = codecs.open(d + '/%s.js' % country.lower(), 'w', encoding='utf-8')
    f.write('[\n')
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

    tokens = [t.strip() for t in line.split('\t')]
    if len(tokens) != 5:
        warn('invalid line: %s' % `line`)
        continue

    (lang, country, count, article, url) = tokens
    if int(count) == 0:
        continue

    key = (lang, country)

    if rows and key != prevKey:
        write(prevKey[0], prevKey[1], rows)
        rows = []

    rows.append([article, int(count), url])

    prevKey = key
    prevLine = line

if rows:
    write(prevKey[0], prevKey[1], rows)
