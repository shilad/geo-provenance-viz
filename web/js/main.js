
window.GP = window.GP || {};

GP.iso2countries = {};
GP.countries = [];
GP.counts = [];
GP.entity = null;

function init_page(entity) {
    GP.entity = entity;

    GP.countries = GP_COUNTRY_DATA;
    GP.countries.forEach(function (c) {
        GP.iso2countries[c.iso] = c;
    });
    console.log('loaded ' + GP.countries.length + ' countries');

    if (entity == 'editor') {
        GP.counts = GP_EDITOR_DATA;
    } else if (entity == 'publisher') {
        GP.counts = GP_PUBLISHER_DATA;
    } else {
        alert("unknown entity: " + entity);
    }
    GP.visualize("en", "au");
}


GP.name2Iso = function(name) {
    if (name == 'all') {
        return 'all';
    }
    var country = null;
    var countries = GP.countries;
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
};

GP.get_data = function(lang, article_iso) {
    var filtered = {};
    var counts = GP.counts;
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
        var key = cc2.toUpperCase();
        filtered[key] = (filtered[key]) ? filtered[key] : 0 + n;
    }

    return filtered;

};

GP.visualize = function(lang, article_iso) {

    var filtered = GP.get_data(lang, article_iso);
    console.log(filtered);
    var total = 0;
    for (var c in filtered) { total += filtered[c]; }

    var colors = {};
    for (var c in filtered) {
        var v = 1.0 * filtered[c] / total;

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
        colors[c.toUpperCase()] = color;
    }
    console.log(colors);


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
                stroke: '#000'
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
            $("input[name='article']").val(GP.iso2countries[iso.toLowerCase()].name);
            $(".jvectormap-label").remove();
            visualize();
        }
    };
    if (article_iso != 'all') {
        //map_params.selectedRegions = article_iso.toUpperCase();
    }
    var map = $('.map-canvas:first-of-type').empty().vectorMap(map_params);

    return false;
};

GP.update_itemized_lists = function(lang, article_iso, filtered) {
    var ordered_countries = GP.keys_sorted_by_value(filtered);
    var total = 0;
    for (var c in filtered) { total += filtered[c]; }

    var cn = GP.iso2countries[c.toLowerCase()].name;
    var n = filtered[c];
    var v = 1.0 * n / total;
    var row = "<tr><td>" + cn + "</td><td>" + GP.addCommas(n) + "</td><td>" + (100.0 * v).toFixed(2) + "%</td></tr>";
    rows += row;

};






