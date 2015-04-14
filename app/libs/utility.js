'use strict';

exports.get_data = function(reqd, optional, body) {
    var i = reqd.length,
        ret = {},
        temp;

    while (i--) {
        if (!body[temp = reqd[i]] || body[temp] instanceof Array) {
            return temp + ' is missing';
        }
        ret[temp] = body[temp];
    }

    i = optional.length;

    while (i--) {
        if (body[temp = optional[i]]) {
            ret[temp] = body[temp];
        }
    }
    return ret;
};

module.exports = exports;
