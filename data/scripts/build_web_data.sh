#!/bin/bash
#
# Builds data needed by the web visualization.

#cp -p ../dat/editor-counts.js ../web/data/ &&
#cp -p ../dat/publisher-counts.js ../web/data/ &&
#python ./create_articles.py &&
#python ./create_domains.py &&
python ./combine-localness.py &&
#python ./combine-geoprovenance.py &&
cp -rp ../results/sources/combined-geoprovenance/ ../../web/data/source-geoprovenance &&
cp -rp ../results/sources/combined-localness/ ../../web/data/source-localness &&
cp -rp ../results/editor-geoprovenance/combined/ ../../web/data/editor-geoprovenance &&
cp -rp ../results/editor-localness/combined/ ../../web/data/editor-localness
