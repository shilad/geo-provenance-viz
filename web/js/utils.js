
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


/**
 * Given a URL, returns a query string.
 * @param url
 */
GP.url2QueryObj = function(url) {
    if (!url) {
        return {};
    }
    var i = url.indexOf('?');
    if (i < 0) {
        return {};
    }
    var queryStr = url.slice(i+1);
    i = queryStr.indexOf('#');
    if (i >= 0) {
        queryStr = queryStr.slice(0, i);
    }
    queryStr = queryStr.trim();
    if (queryStr.length > 0) {
        return $.deparam(queryStr);
    } else {
        return {};
    }
};

/**
 * From http://stackoverflow.com/a/23385887/141245
 * @param exc
 * @returns {string}
 */
GP.formatException = function(exc) {
    var exmsg = "";
    if (exc.message) {
        exmsg += exc.message;
    }
    if (exc.stack) {
        exmsg += ' | stack: ' + exc.stack;
    }
    return exmsg;
};

/**
 * From http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
 * @param x
 * @param y
 * @returns {boolean}
 */
GP.objectsEqual = function( x, y ) {
    if ( x === y ) return true;
    // if both x and y are null or undefined and exactly the same

    if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
    // if they are not strictly equal, they both need to be Objects

    if ( x.constructor !== y.constructor ) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

    for ( var p in x ) {
        if ( ! x.hasOwnProperty( p ) ) continue;
        // other properties were tested using x.constructor === y.constructor

        if ( ! y.hasOwnProperty( p ) ) return false;
        // allows to compare x[ p ] and y[ p ] when set to undefined

        if ( x[ p ] === y[ p ] ) continue;
        // if they have the same strict value or identity then they are equal

        if ( typeof( x[ p ] ) !== "object" ) return false;
        // Numbers, Strings, Functions, Booleans must be strictly equal

        if ( ! Object.equals( x[ p ],  y[ p ] ) ) return false;
        // Objects and Arrays must be tested recursively
    }

    for ( p in y ) {
        if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) return false;
        // allows x[ p ] to be set to undefined
    }
    return true;
};


