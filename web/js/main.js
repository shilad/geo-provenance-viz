
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
    GP.initHistory();
    GP.initEvents();
    GP.onUrlChange();   // manually trigger a refresh
}

GP.iso2name = function(iso) { return GP.iso2countries[iso.toLowerCase()].name; }

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
        var cc2 = row[3];
        var n = row[6];
        if ((lang == 'all' || l == lang)
        &&  (article_iso == 'all' || cc1 == article_iso)) {
            var key = cc2.toUpperCase();
            if (key in filtered) {
                filtered[key] += n;
            } else {
                filtered[key] = n;
            }
        }
    }

    return filtered;

};

GP.assignMapColor = function(v) {
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
    return color;
};

GP.visualize = function(lang, article_iso) {
    $("span.langName").text((lang == 'all') ? '' : ('the ' + GP_LANGS[lang]));
    if (article_iso == 'all') {
        $(".countryCaption").hide(0);
    } else {
        $(".countryCaption").show(0);
        $("span.countryName").text(GP.iso2name(article_iso));
    }

    var filtered = GP.get_data(lang, article_iso);
    var total = 0;
    for (var c in filtered) { total += filtered[c]; }

    var colors = {};
    for (var c in filtered) {
        var v = 1.0 * filtered[c] / total;
        colors[c.toUpperCase()] = GP.assignMapColor(v);
    }

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
            var examples = GP_ITEMIZED_DATA.domains[code.toLowerCase()];
            var domains = '';
            if (examples) {
                for (var i = 0; i < examples.length; i++) {
                    var n = examples[i][0];
                    if (n != 'other') {
                        domains += '<li>' + n;
                    }
                }
                if (domains) domains = '<br>Top domains: <ul>' + domains + '</ul>';
            }
            var action;
            if (code == article_iso.toUpperCase()) {
                action = 'Click to include<br/>all articles';
            } else {
                action = 'Click to only include <br/>articles about ' + el.html();
            }
            var p = (100.0 * filtered[code] / total).toFixed(2);
            el.html(el.html()+' ('+p+'%)<br/> ' + domains + action);
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
                "stroke-width": 2
            },
            selectedHover: {
            }
        },
        onRegionClick : function(ev, iso) {
            $(".jvectormap-tip").remove();
            iso = iso.toLowerCase();
            var params = GP.url2QueryObj(GP.location().href);
            if (params.country == iso) {
                GP.updateUrl({ 'country' : 'all'})
            } else {
                GP.updateUrl({ 'country' : iso });
            }
        }
    };
    if (article_iso != 'all') {
        map_params.selectedRegions = article_iso.toUpperCase();
        map_params.regionStyle.selected.fill = colors[article_iso.toUpperCase()];
    }
    var map = $('.map-canvas:first-of-type').empty().vectorMap(map_params);

    // Queue up loading of itemized data.
    // This is done by hand instead of using jQuery to prevent an ajax call
    $(".itemized-data tbody").html("<tr><td>Loading...</td></tr>");
    $("#itemized-data-script").remove();

    var script = document.createElement("script");
    script.src = 'data/sources/' + lang + '/' + article_iso + '.js';
    script.id = 'itemized-data-script';
    script.onload = function () {
        GP.update_itemized_lists(lang, article_iso, filtered);
    };
    document.head.appendChild(script);

    return false;
};

GP.update_itemized_lists = function(lang, article_iso, filtered) {

    var data= GP_ITEMIZED_DATA;

    // Construct the country data
    data.countries = [];
    var sorted = GP.keys_sorted_by_value(filtered);
    var otherTotal = 0;
    for (var i = 0; i < sorted.length; i++) {
        var c = sorted[i];
        var n = filtered[c];
        if ( i < 10) {
            data.countries.push([GP.iso2name(c), n]);
        } else {
            otherTotal += n;
        }
    }
    if (otherTotal > 0) data.countries.push(['other', otherTotal]);


    $(".itemized-data .itemized-countries tbody").html(
        GP.make_itemized_rows(data.countries, null)
    );
    $(".itemized-data .itemized-articles tbody").html(
        GP.make_itemized_rows(data.articles, function(row) { return row[2];})
    );
    $(".itemized-data .itemized-sources tbody").html(
        GP.make_itemized_rows(data.domains['all'], function (row) { return 'http://' + row[0]; })
    );
    $(".itemized-data .extended").hide();
    $(".itemized-data .showmore").bind('click', function () {
        $(this).closest("tbody").find("tr.compact").hide(1000);
        $(this).closest("tbody").find("tr.extended").show(1000);
        return false;
    });
    $(".itemized-data .showless").bind('click', function () {
        $(this).closest("tbody").find("tr.extended").hide(1000);
        $(this).closest("tbody").find("tr.compact").delay(1100).show(0);
        return false;
    });
};

GP.make_itemized_rows = function(list, linker) {
    if (!list || list.length == 0) {
        return "<tr><td colspan=3>No data available</td></tr>\n";
    }
    var total = 0.0;
    for (var i = 0; i < list.length; i++) {
        total += list[i][1];
    }
    var totalTop = 0;
    var rows = '';

    var makeRow = function(cssClass, desc, n) {
        var p = (100.0 * n / total).toFixed(2) + '%';
        return "<tr class=\"" + cssClass + "\"><td>" + desc + "</td><td>" + GP.addCommas(n) + "</td><td>" + p + "</td></tr>\n";
    };

    for (var i = 0; i < list.length; i++) {
        var row = list[i];
        var name = row[0];
        var n = row[1];
        var desc;
        if (linker) {
            desc = '<a href=' + linker(row) + '>' + name + '</a>';
        } else {
            desc = name;
        }
        var klass;
        if (i < 10) {
            totalTop += n;
        } else if (i == 10 && name == 'other') {
            klass = "compact";
            totalTop += n;
        } else {
            klass = "extended";
        }
        rows += makeRow(klass, desc, n);
    }

    if (total != totalTop) {
        rows += makeRow("compact", "other", total-totalTop);
        rows += '<tr class="compact"><td colspan="3"><a class="showmore" href="#">show more</a></td></tr>\n'
        rows += '<tr class="extended"><td colspan="3"><a class="showless" href="#">show less</a></td></tr>\n'
    }
    return rows;
};

GP.initEvents = function() {
    $("a.moreLangs").bind('click', function() {
        $(".moreLangsToggle").toggle();
        return false;
    });

};


GP.PARAM_DEFAULTS = {
    'lang'      : 'all',
    'country'   : 'all',
    'mode'      : 'geoprovenance',
    'entity'    : 'sources'
};


GP.location = function() { return window.history.location || window.location };


GP.onUrlChange = function() {
    try {
        var location = GP.location();
        var params = {};
        $.extend(params, GP.PARAM_DEFAULTS, GP.url2QueryObj(location.href));
        GP.visualize(params.lang, params.country);

        // Mark appropriate href links as active.
        $("a.ajax").each(function () {
            var href_params = GP.url2QueryObj(this.href);
            var active = true;
            for (var k in href_params) {
                if (params[k] != href_params[k]) {
                    active = false;
                    break;
                }
            }
            if (active) {
                $(this).addClass("active");
            } else {
                $(this).removeClass("active");
            }
        });
    } catch (e) {
        alert('Exception occurred: ' + GP.formatException(e));
    }
};

GP.updateUrl = function(changed_params) {
    // Calculate new URL params
    var location = GP.location();
    var current_params = GP.url2QueryObj(location.href);
    var new_params = $.extend({}, current_params, changed_params);

    for (var key in GP.PARAM_DEFAULTS) {
        if (new_params[key] == GP.PARAM_DEFAULTS[key]) {
            delete new_params[key];
        }
    }
    if (GP.objectsEqual(current_params, new_params)) {
        return;
    }

    // keep the link in the browser history
    var new_url = location.protocol + '//' + location.host + location.pathname + '?' + $.param(new_params);
    history.pushState(null, null, new_url);

    GP.onUrlChange();

};


GP.initHistory = function() {

    // Handles updating
    $(document).on('click', 'a.ajax', function() {
        // construct the new URL and trigger an update
        GP.updateUrl(GP.url2QueryObj(this.href));

        // do not give a default action
        return false;
    });

    // hang on popstate event triggered by pressing back/forward in browser
    $(window).on('popstate', function(e) {
        GP.onUrlChange();
    });
};

