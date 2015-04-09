#!/bin/bash
#
# Builds data needed by the web visualization.

cp -p ../dat/editor-counts.js ../web/data/ &&
cp -p ../dat/publisher-counts.js ../web/data/ &&
python ./create_articles.py &&
python ./create_domains.py &&
python ./combine.py &&
cp -rp ../results/sources/combined/ ../../web/data/sources &&
cp -rp ../results/editors/combined/ ../../web/data/editors
