'use strict';

var ddb = require(__dirname + '/../controllers/dynamodb');

module.exports = function (r) {

    r.get ('/logs', ddb.get_logs);
    r.post('/queue', ddb.to_sqs);

    /**
    * if endpoint doesn't match
    */
    r.all ('*', function (req, res, next) {
        return next('nothing to do here'); 
    });

    return r;
};
