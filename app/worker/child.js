'use strict';

/* jshint latedef : false */
/* global require, process, __dirname */

var log     = require(__dirname + '/../libs/log'),
    config  = require(__dirname + '/../config/config'),
    uuid    = require('node-uuid'),
    AWS     = require('aws-sdk'),
    async   = require('async'),
    ddb     = require('dynamodb').ddb({
        accessKeyId: config.AWS.SQS.KEY,
        secretAccessKey: config.AWS.SQS.SECRET
    }),
    sqs     = new AWS.SQS({
        accessKeyId : config.AWS.SQS.KEY,
        secretAccessKey : config.AWS.SQS.SECRET,
        region : config.AWS.SQS.REGION
    }),

    start = function () {
        sqs.receiveMessage({
            QueueUrl : process.env.url,
            MaxNumberOfMessages : +config.AWS.SQS.RETRIEVED_MESSAGE,
            MessageAttributeNames : ['All'],
            /* lock message visibility for 30 seconds */
            VisibilityTimeout : 30,
        }, receive_message);
    },

    receive_message = function (err, data) {
        if (err) {
            return end_process(err);
        }

        if (!data) {
            log.warn('Data Object missing.');
            return end_process(err);
        }

        if (data.Messages) {
            async.map(data.Messages,
                function (message, cb) {
                    var collection = 'Misc',
                        item = {};

                    try {                
                        item = {
                            created_at : +message.MessageAttributes.created_at.StringValue,
                            user_id : message.MessageAttributes.user_id.StringValue,
                            action : message.MessageAttributes.action.StringValue,
                            description : message.Body,
                            _id : uuid.v4()
                        };
                        collection = message.MessageAttributes.collection.StringValue;
                        log.info('[%s] Saving to [%s]', process.pid, collection);
                    } catch (e) {
                        log.error('[%s] Error: [%s]', process.pid, e);
                        log.info('[%s] Saving to [Misc]', process.pid);

                        for (var prop in message.MessageAttributes) {
                            item[prop] = message.MessageAttributes[prop].StringValue;
                        }

                        item._id = uuid.v4();
                    }
                    ddb.putItem(
                        collection,
                        item, {},
                        function (_err, _res, _cap) {
                            if (_err) {
                                log.error('Failed to save to dynamodb.', _err);                   
                            }

                            cb(null, { err: _err, res: _res, cap: _cap, message: message});
                        }
                    );
                }, send_messages);
            return;
        }

        log.info('Request has no message.');
        process.exit(0);
    },

    send_messages = function (err, data) {
        async.each(data,
            function (item, cb) {
                delete_message(item.err, item.res, item.cap, item.message, cb);
            },
            end_process);
    },

    delete_message = function (err, res, cap, data, cb) {
        var collection;

        if (err) {
            if(err.code === 'ResourceNotFoundException') {
                collection = data.MessageAttributes.collection.StringValue;
                log.warn('[%s] Collection not found, Creating: [%s]', process.pid, collection);

                return ddb.createTable(
                    collection, {
                        hash: ['_id', ddb.schemaTypes().string]
                    }, {
                        read: 10,
                        write: 10
                    },
                    create_collection
                );
            }

            return end_process(err);
        }

        if (res) {
            log.info(res);
        }

        if (cap) {
            log.info('[%s] Read capacity consumed: ', process.pid, cap);
        }

        sqs.deleteMessage({
                QueueUrl : process.env.url,
                ReceiptHandle : data.ReceiptHandle
            },
            function (_err) {
                if (_err) {
                    log.warn(err);
                }

                log.info('[%s] successfully deleted message! I\'m from Spawner: [%s]', 
                    process.pid, process.env.spawner_id);
                return cb();
            }
        );
    },

    create_collection = function (err) {
        if (err) {
            log.warn('[%s] Creating collection, Wait la...', process.pid);
            return end_process(err);
        }

        log.info('[%s] Collection created. I\'m from Spawner: [%s]', process.pid, process.env.spawner_id);
        process.exit(0);
    },

    end_process = function (err) {
        if (err) {
            log.warn(err);

            process.exit(1);
        }

        process.exit(0);
    };

process.on('uncaughtException', function (err) {
    log.error('Exception: ' + err);
});

process.on('message', function (msg) {
    log.info(msg.pid + ': ' + msg.data);
});

log.info('[%s] Child spawned...', process.pid);

start();

