#!/bin/bash


rsync -avz --exclude data/editor-counts.js . www.shilad.com:/var/www/html/www.shilad.com/localness
