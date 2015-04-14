'use strict';

/* jshint undef: true, unused: true */
/* global log, _util */

var config  = global.config,
    aws     = require('aws-sdk'),
    qs      = require('querystring'),
    ddb     = new aws.DynamoDB({
        accessKeyId: config.AWS.SQS.KEY,
        secretAccessKey: config.AWS.SQS.SECRET,
        region: config.AWS.SQS.REGION,
        logger: log
    }),
    sqs     = new aws.SQS({
        accessKeyId : config.AWS.SQS.KEY,
        secretAccessKey : config.AWS.SQS.SECRET,
        region : config.AWS.SQS.REGION
    });


/**
 * GET /logs
 **/
exports.get_logs = function (req, res, next) {
    var data = _util.get_data(
        [], 
        ['table', 'q', 'by', 'action', 'date_from', 'data_to'], 
        req.query
    ), on_database = 0,

    start = function () {
        var params = {
            TableName : data.table || 'Test'
        };

        if (typeof data === 'string') {
            return next(data);
        }

        params.ScanFilter = {};

        if (data.by) {
            params.ScanFilter.user_id = {
                ComparisonOperator : 'BEGINS_WITH',
                AttributeValueList : [{
                    S : data.by
                }]
            };
        }

        if (data.action) {
            params.ScanFilter.action = {
                ComparisonOperator : 'EQ',
                AttributeValueList : [{
                    S : data.action
                }]
            };
        }

        if (+data.date_from && +data.date_to) {
            params.ScanFilter.created_at = {
                ComparisonOperator : 'BETWEEN',
                AttributeValueList : [
                    { N : data.date_from },
                    { N : data.date_to }
                ]
            };
        }

        if (data.date_from && !params.ScanFilter.created_at) {
            params.ScanFilter.created_at = {
                ComparisonOperator : 'GE',
                AttributeValueList : [{
                    N : data.date_from
                }]
            };
        }

        if (data.date_to && !params.ScanFilter.created_at) {
            params.ScanFilter.created_at = {
                ComparisonOperator : 'LE',
                AttributeValueList : [{
                    N : data.data_to
                }]
            };
        }

        if (data.q) {
            params.ScanFilter.description = {
                ComparisonOperator : 'CONTAINS',
                AttributeValueList : [{
                    S : data.q
                }]
            };
        }

        log.info('Requesting to DynamoDB');
        ddb.scan(params, process_response);
    },

    process_response = function (err, _d) {
        var formatted;

        if (err) {
            return next(err);
        }

        if (!_d) {
            log.warn('No data response from Amazon DynamoDB');
            return next('No data response from Amazon DynamoDB');
        }

        if (!_d.Count) {
            log.warn('No logs for query: ' + qs.stringify(data));
            return next('No logs for query: ' + qs.stringify(data));
        }

        on_database = _d.ScannedCount;

        formatted = _d.Items.map(function (e) {
            e.action = e.action.S;
            e.user_id = e.user_id.S;
            e.description = e.description.S;
            e._id = e._id.S;
            e.created_at = +e.created_at.N;

            return e;
        });

        return send_response(null, formatted);
    },

    send_response = function (err, result) {
        if (err) {
            return next(err);
        }

        return res.send({
            data : result,
            on_database : on_database 
        });
    };

    log.info('Getting logs...');
    start();
};




/**
 * GET /queue
 */
exports.to_sqs = function (req, res, next) {
    var data = _util.get_data(
        [],
        ['created_at', 'description', 'action', 'collection', 'user_id'],
        req.body
    ),
    
    start = function () {
        var _data = {},
            prop,
            count = 0,
            params,
            description = 'N/A';

        log.info('Message received.');

        for (prop in data) {
            count++;
            _data[prop] = {
                DataType : (typeof data[prop] === 'number') ? 'Number' : 'String',
                StringValue : '' + data[prop]
            };
        }

        if (!count) {
            return res.send({
                'message': 'Oke la',
                'sent' : 'No data passed.'
            });
        }

        log.info('Data: '+ _data);

        if (_data.description) {
            description = _data.description.StringValue;
            delete _data.description;
        }

        params = {
            MessageBody : description,
            QueueUrl : config.AWS.SQS.QUEUES.Logs,
            DelaySeconds : 1,
            MessageAttributes : _data
        };

        sqs.sendMessage(params, function (_err) {
            if (_err) {
                log.warn('Message not sent to SQS.');
                return next(_err);
            }
            
            log.info('Message sent to SQS');
            res.send({
                'message': 'Oke la',
                'sent' : data
            });
        });
    };

    start();
};

module.exports = exports;
