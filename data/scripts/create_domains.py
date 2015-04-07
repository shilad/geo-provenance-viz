__author__ = 'shilad'

import collections
import io
import json
import marshal
import os
import subprocess
import sys
import tldextract
import traceback
import urllib2


def warn(message):
    sys.stderr.write(message + '\n')

def open_bz2(path):
    DEVNULL = open(os.devnull, 'w')
    p = subprocess.Popen(["pbzcat", path], stdout = subprocess.PIPE, stderr = DEVNULL)
    return io.open(p.stdout.fileno(), 'r', encoding='utf-8')


def url2registereddomain(url):
    host = url2host(url)
    parts = tldextract.extract(host)
    return parts.registered_domain

def url2host(url):
    # if not url.startswith('http:') and not url.startswith('https:') and not url.startswith('ftp://'):
    #     url = 'http://' + url
    return urllib2.urlparse.urlparse(url).netloc


ALT_NAMES = {
    'Myanmar': 'Burma',
    'French Southern Territories': 'French Southern and Antarctic Lands',
    'Saint Helena': 'Saint Helena, Ascension and Tristan da Cunha',
    'Pitcairn': 'Pitcairn Islands',
    'Vatican': 'Vatican City',
    'Micronesia': 'Federated States of Micronesia',
    'Macedonia': 'Republic of Macedonia',
    'Bahamas': 'The Bahamas',
    'Georgia': 'Georgia (country)',
    'Ireland': 'Republic of Ireland',
    'Palestinian Territory': 'Palestine',
    'Macao': 'Macau',
    'U.S. Virgin Islands': 'United States Virgin Islands',
    'Gambia': 'The Gambia'
}

TITLE_MAPPING = {}


 
def title2iso(title):
    global TITLE_MAPPING
    global ALT_NAMES

    if not TITLE_MAPPING:
        for line in io.open('../raw/geonames.txt', encoding='utf-8'):
            tokens = line.split('\t')
            iso = tokens[0].strip().lower()
            t = tokens[4]
            TITLE_MAPPING[t + ' (en)'] = iso
            if t in ALT_NAMES:
                TITLE_MAPPING[ALT_NAMES[t] + ' (en)'] = iso

    return TITLE_MAPPING.get(title)


def write_top_domains():
    make_key = lambda *parts: intern('@@'.join(parts).encode('ascii', 'ignore'))
    counts = collections.defaultdict(collections.Counter)
    inferred = read_inferred_urls()
    for record in read_urls():
        url = record['url']
        if url not in inferred: continue
        lang = record['language']
        acountry = title2iso(record['countryTitle'])
        if not acountry: continue
        domain = record['effectiveDomain2']
        scountry = inferred[url]
        keys = [
             make_key('all', 'all', 'all'),
             make_key('all', 'all', scountry),
             make_key(lang, 'all', 'all'),
             make_key('all', acountry, 'all'),
             make_key('all', acountry, scountry),
             make_key(lang, 'all', scountry),
             make_key(lang, acountry, 'all'),
             make_key(lang, acountry, scountry),
        ]
        for k in keys:
            counts[k][domain] += 1

    for key in counts:
        (lang, acountry, scountry) = key.split('@@')
        path_dir = '../results/sources/domains/%s/%s' % (lang, acountry)
        path = '%s/%s.js' % (path_dir, scountry)
        if not os.path.exists(path_dir):
            os.makedirs(path_dir)
        f = io.open(path, 'w', encoding='utf-8')
        f.write(u'[\n')
        top_total = 0
        for (i, (domain, count)) in enumerate(counts[key].most_common(100)):
            f.write(u'%s,\n' % json.dumps([domain, count], f))
            top_total += count
        total = sum(counts[key].values())
        f.write(u'%s\n]\n' % json.dumps(['other', total - top_total], f))

def read_urls():
    f = open_bz2('../raw/source_urls.tsv.bz2')
    fields = None
    for (i, line) in enumerate(f):
        if i % 100000 == 0:
            warn('processing url %d' % i)
        tokens = [f.strip() for f in line.split('\t')]
        if not fields:
            fields = tokens
        elif len(fields) != len(tokens):
            warn('invalid line: %s' % `line`)
        else:
            yield dict(zip(fields, tokens))

def read_inferred_urls(threshold=0.85):
    p = '../cache/inferred_urls.%s.bin' % threshold
    if os.path.isfile(p):
        f = open(p, 'rb')
        result = marshal.load(f)
        f.close()
        warn('loaded %d from cache file %s' % (len(result), p))
        return result
    f = open_bz2('../raw/web-viz.results.txt.bz2')
    n = 0
    results = {}
    for line in f:
        n += 1
        if n % 10000 == 0:
            warn('doing line %d, size of dict is' % n)
        try:
            tokens = line.split('\t')
            (url, conf, dist) = tokens[:3]
            if not dist: continue
            dist = eval(dist)
            top_val = max(dist.values())
            if top_val > threshold:
                top_country = [c for c in dist.keys() if dist[c] == top_val][0]
                results[url] = top_country
        except:
            warn('error processing line ' + `line`)
            traceback.print_exc()
    f.close()
    f = open(p, 'wb')
    marshal.dump(results, f)
    f.close()
    return results

if __name__ == '__main__':
    write_top_domains()
