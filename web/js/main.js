
window.GP = window.GP || {};

GP.iso2countries = {};
GP.countries = [];
GP.entity = null;

GP.initShare = function() {
    if (document.URL.indexOf('nonav=true') >= 0) {
        $("nav").remove();
        $("body").css('padding-top', '0');
        $(".popout").show();
        $("div.popout a").attr('href', function () {
            return document.URL.replace('nonav=true&', '').replace('nonav=true', '');
        });
    } else {
        // replace a reference to the URL variable with the actual url
        $("a.fancy-share").attr('href', function (i, href) {
            return href.replace('URL', document.URL);
        }).on('click', function () {
            var href = $(this).attr('href');
            window.open(href, '_blank', 'width = 500, height = 500');
            return false;
        });
    }

};

function init_page(mode, entity) {
    GP.mode = mode;
    GP.entity = entity;

    GP.countries = GP_COUNTRY_DATA;
    GP.countries.forEach(function (c) {
        GP.iso2countries[c.iso] = c;
    });
    console.log('loaded ' + GP.countries.length + ' countries');

    GP.initHistory();
    GP.initEvents();
    GP.onUrlChange();   // manually trigger a refresh
}

GP.iso2name = function(iso) { return GP.iso2countries[iso.toLowerCase()].name; };

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

GP.assignMapColor = function(v) {
    var color;
    if (GP.mode == 'geoprovenance') {
        if (isNaN(v)) {
            color = "#CCCCCC";
        } else if (v < 0.002) {
            color = "#FFFFFF";
        } else if (v <= 0.02) {
            color = "#CEDDEE";
        } else if (v <= 0.10) {
            color = "#93B9DB";
        } else if (v <= 0.20) {
            color = "#5D95C7";
        } else if (v <= 0.50) {
            color = "#3373B5";
        } else {
            color = "#004694";
        }
    } else {
        if (isNaN(v)) {
            color = "#CCCCCC";
        } else if (v < 0.002) {
            color = "#FFFFFF";
        } else if (v <= 0.10) {
            color = "#CEDDEE";
        } else if (v <= 0.25) {
            color = "#93B9DB";
        } else if (v <= 0.50) {
            color = "#5D95C7";
        } else if (v <= 0.75) {
            color = "#3373B5";
        } else {
            color = "#004694";
        }
    }

    return color;
};

GP.update_map = function(lang, article_iso) {
    $("span.langName").text((lang == 'all') ? '' : ('the ' + GP_LANGS[lang]));
    if (article_iso == 'all') {
        $(".countryCaption").hide(0);
    } else {
        $(".countryCaption").show(0);
        $("span.countryName").text(GP.iso2name(article_iso));
    }

    var counts = {};
    var pairs = GP_ITEMIZED_DATA.data;
    for (var i = 0; i < pairs.length; i++) {
        var c = pairs[i][0];
        var n = pairs[i][1];
        counts[c] = n;
    }
    var total;
    if (GP.mode == 'geoprovenance') {
        total = 0.0;
        for (var c in counts) {
            total += counts[c];
        }
    } else {
        total = 1.0;    // numbers are localness, shouldn't be normalized.
    }

    var colors = {};
    for (var c in counts) {
        var v = 1.0 * counts[c] / total;
        colors[c.toUpperCase()] = GP.assignMapColor(v);
    }

    var canvas = $('.map-canvas:first-of-type');

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
            var name = el.html();
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
            if (GP.mode == 'geoprovenance') {
                if (code == article_iso.toUpperCase()) {
                    action = 'Click to remove ' + name + ' filter';
                } else {
                    action = 'Click to filter to<br/>articles about ' + name;
                }
            } else {
                if (code == article_iso.toUpperCase()) {
                    action = 'Click to remove ' + name + ' filter';
                } else {
                    action = 'Click to filter to<br/>articles about ' + name;
                }
            }

            var p = (100.0 * counts[code.toLowerCase()] / total).toFixed(2);
            if (p == 'NaN') p = '0.00';
            el.html(name +' ('+p+'%)<br/> ' + domains + action);
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
            if (canvas.data('clicked')) return;
            canvas.data('clicked', true);

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
    var map = canvas.empty().vectorMap(map_params);
    canvas.data('clicked', false);

    // TODO: click on canvas resets map.
    // The only way I can see to handle a
    //canvas.find(".jvectormap-container > svg").bind('click', function() {
    //});

    return false;
};

GP.update_itemized_lists = function(lang, article_iso) {

    var data =  GP_ITEMIZED_DATA;

    if (GP.mode == 'geoprovenance') {
        $(".itemized-data .itemized-countries tbody").html(
            GP.make_itemized_rows(data.data.map(function (row) { return [GP.iso2name(row[0]), row[1]];}))
        );
    }
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
            klass = '';
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

/**
 * This is done by hand instead of using jQuery to prevent an ajax call
 */
GP.loadScript = function(scriptId, scriptLocation, onLoad) {
    $("#" + scriptId).remove();
    var script = document.createElement("script");
    script.src = scriptLocation;
    script.id = scriptId;
    script.onload = onLoad;
    document.head.appendChild(script);
};

GP.onUrlChange = function() {
    try {
        var location = GP.location();
        var params = $.extend({}, GP.PARAM_DEFAULTS, GP.url2QueryObj(location.href));

        // Queue loading of script
        $(".itemized-data tbody").html("<tr><td>Loading...</td></tr>");
        $(".map-wrapper").spin("huge", "#fff");
        GP.loadScript(
            "itemized-data-script",
            'data/' + GP.entity + '-' + GP.mode + '/' + params.lang + '/' + params.country + '.js',
            function () {
                $(".map-wrapper").spin(false);
                GP.update_map(params.lang, params.country);
                GP.update_itemized_lists(params.lang, params.country);
            });

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
    history.replaceState(null, null, new_url);

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

