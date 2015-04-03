
window.GP = window.GP || {};

/**
 * From http://stackoverflow.com/questions/5199901/how-to-sort-an-associative-array-by-its-values-in-javascript
 * @param obj
 * @returns {Array}
 */
GP.keys_sorted_by_value = function(obj) {
    var tuples = [];

    for (var key in obj) tuples.push([key, obj[key]]);

    tuples.sort(function(a, b) {
        a = a[1];
        b = b[1];

        return a < b ? +1 : (a > b ? -1 : 0);
    });

    var keys = [];
    for (var i = 0; i < tuples.length; i++) {
        keys.push(tuples[i][0]);
    }
    return keys;
};


/**
 * From http://www.mredkj.com/javascript/numberFormat.html
 * @param nStr
 * @returns {*}
 */
GP.addCommas = function(nStr)
{
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
};