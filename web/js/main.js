
var iso2countries = {};
var countries = [];
var counts = [];
var entity = null;


function init_page(entity) {
    window.entity = entity;

    countries = COUNTRY_DATA;
    for (var i = 0; i < countries.length; i++) {
        iso2countries[countries[i].iso] = countries[i];
    }
    console.log('loaded ' + iso2countries.length + ' countries');

    if (entity == 'editor') {
        counts = EDITOR_DATA;
    } else if (entity == 'publisher') {
        counts = PUBLISHER_DATA;
    } else {
        alert("unknown entity: " + entity);
    }
    prepare_data();
    visualize();
}


function countryName2Iso(name) {
    if (name == 'all') {
        return 'all';
    }
    var country = null;
    for (var i = 0; i < countries.length; i++) {
        if (countries[i].name.trim().toLowerCase() == name.trim().toLowerCase()) {
            country = countries[i];
            break;
        }
    }
    if (country) {
        return country.iso;
    } else {
        alert('no known country with name ' + name);
        return null;
    }
}

function visualize() {
    var lang = "en";
    var article_name = "all";
    var publisher_name = "all";
    var article_iso = countryName2Iso(article_name);
    var publisher_iso = countryName2Iso(publisher_name);
    if (!article_iso || !publisher_iso) {
        return;
    }

    // whether to group results by source country (default) or article country
    var by_publisher = (publisher_iso == 'all' || article_iso != 'all');

    console.log(article_iso + ', ' + publisher_iso + ', ' + by_publisher);

    var total = 0;
    var filtered = {};

    for (var i = 0; i < counts.length; i++) {
        var row = counts[i];
        var l = row[0];
        var cc1 = row[1];
        var cc1_native = row[2];
        var cc2 = row[3];
        var cc2_native = row[4];
        var kms = row[5];
        var n = row[6];
        if (lang != 'all' && l != lang) {
            continue;
        }
        if (article_iso != 'all' && cc1 != article_iso) {
            continue;
        }
        if (publisher_iso != 'all' && cc2 != publisher_iso) {
            continue;
        }
        var key = (by_publisher ? cc2 : cc1).toUpperCase();
        if (filtered[key]) {
            filtered[key] += n;
        } else {
            filtered[key] = n;
        }
        total += n;
    }

    var label = "";
    if (lang == 'all') {
        label += 'All WP language editions';
    } else {
        label += 'WP-' + lang + ' language edition';
    }

    if (article_iso == 'all') {
        label += ', all geospatial articles';
    } else {
        label += ', articles in ' + article_name;
    }

    if (publisher_iso == 'all') {
        label += ', ' + entity + 's from all countries';
    } else {
        label += ', ' + entity + 's from ' + publisher_name;
    }

    var div = $("div.results:first-of-type");
    div.find("h4").text(label);

    var provenance = {};
    var colors = {};

    var rows = "";
    var ordered_countries = keys_sorted_by_value(filtered);
    for (var i = 0; i < ordered_countries.length; i++) {
        var c = ordered_countries[i];
        var cn = iso2countries[c.toLowerCase()].name;
        var n = filtered[c];
        var v = 1.0 * n / total;
        var row = "<tr><td>" + cn + "</td><td>" + addCommas(n) + "</td><td>" + (100.0 * v).toFixed(2) + "%</td></tr>";
        rows += row;

        var color;
        if (isNaN(v)) {
            color = "#CCCCCC";
        } else if (v < 0.002) {
            color = "#FFFFFF";
        } else if (v < 0.01) {
            color = "#E6EEF6";
        } else if (v <= 0.02) {
            color = "#CEDDEE";
        } else if (v <= 0.05) {
            color = "#93B9DB";
        } else if (v <= 0.10) {
            color = "#5D95C7";
        } else if (v <= 0.20) {
            color = "#3373B5";
        } else if (v <= 0.50) {
            color = "#305BA2";
        } else {
            color = "#004694";
        }
        colors[c] = color;
    }
    div.find("table.data tbody").html(rows);
    console.log(provenance);


    var map_params = {
        backgroundColor: '#000',
        map: 'world_mill_en',
        series: {
            regions: [{
                min: 0,
                max: 5,
                values: colors
            }]
        },
        onRegionTipShow   : function(e, el, code){
            var p = (100.0 * filtered[code] / total).toFixed(2);
            el.html(el.html()+' ('+p+'%)');
        },
        regionStyle : {
            initial: {
                fill: 'white',
                "fill-opacity": 1,
                stroke: '#000',
            },
            hover: {
                "fill-opacity": 0.8
            },
            selected: {
                stroke: 'red',
                "stroke-width": 1
            },
            selectedHover: {
            }
        },
        onRegionClick : function(e, iso, isSelected) {
            $("input[name='article']").val(iso2countries[iso.toLowerCase()].name);
            $(".jvectormap-label").remove();
            visualize();
        }
    };
    if (article_iso != 'all') {
        map_params.selectedRegions = article_iso.toUpperCase();
    }
    if (publisher_iso!= 'all') {
        map_params.selectedRegions = publisher_iso.toUpperCase();
    }
    var map = $('.map-canvas:first-of-type').empty().vectorMap(map_params);
    var caption = '';
    if (entity == 'publisher' && by_publisher) {
        caption = '# citations from sources in country';
    } else if (entity == 'publisher' && !by_publisher) {
        caption = '# citations in articles about country';
    } else if (entity == 'editor' && by_publisher) {
        caption = '# edits by editors in country';
    } else if (entity == 'editor' && !by_publisher) {
        caption = '# edits for articles about country';
    } else {
        console.log("ARGGHHHH!");
    }
    $(".results table.data thead > tr > th:nth-child(2)").html(caption);

    return false;
}





