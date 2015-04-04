#!/bin/bash

export PGPASSWORD=wikibrain
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LANGUAGE=en_US.UTF-8

export CLASSPATH=""
export MAVEN_OPTS="-Dmaven.repo.local=/export/scratch/shilad/.m2"
export PATH="/export/scratch/shilad/apache-maven-3.2.1/bin:$PATH"
export JAVA_OPTS="-d64 -server -Xmx220G -da"
export WB_JAVA_OPTS="$JAVA_OPTS"

./wb-java.sh org.wikibrain.Loader -l "en,de,fr,ru,nl,pl,es,it,uk,sv,ca,vi,zh,pt,fa,ro,uz,eu,no,ja,cs,ar,hu,da,fi,et,ur,gu,id,ko,cy,el,hi,ka,simple,sco,gl,lv,th,te,ce,als,bn,ilo,ml,bar,nds,new,mr,arz,tt,ckb,ga,nds-nl,is,la,sah,sc,dsb,as,km,tn,oc,pfl,tg,ast,ace,ang,pih,so,map-bms,hif,lo,myv,gn,kab" -s spatial -s concepts -s wikidata -c geoprovenance.conf -h 32
./wb-java.sh org.macalester.geoprovenance.ExportPageViews -c ./geoprovenance.conf