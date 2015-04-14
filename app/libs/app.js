'use strict';

/* jshint unused: false */
/* global log */

exports.error = function (err, req, res, next) {
    if (err.stack) {
        console.error(err.stack);
    }

    res.status(err.statusCode || 400)
        .send({ error : err.message || err.msg || err });
};


exports.powered_by = function (req, res, next) {
    log.trace('Updating X-Powered-By option');
    res.setHeader('X-Powered-By', 'Lots and lots of hamsters!');
    return next();
};

module.exports = exports;
