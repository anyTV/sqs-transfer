'use strict';

/* jshint latedef: false  */
/* global require, process, __dirname */

var fork    = require('child_process').fork,
    AWS     = require('aws-sdk'),
    config  = require(__dirname + '/../config/config'),
    log     = require(__dirname + '/../libs/log'),
    ddb     = require('dynamodb').ddb({
        accessKeyId: config.AWS.SQS.KEY,
        secretAccessKey: config.AWS.SQS.SECRET
    }),
    sqs = new AWS.SQS({
        accessKeyId: config.AWS.SQS.KEY,
        secretAccessKey: config.AWS.SQS.SECRET,
        region: config.AWS.SQS.REGION
    }),
    queue = config.AWS.SQS.QUEUES.Logs,

    spawner_call_count = 0,

    start = function () {
        ddb.listTables({}, run);
    },

    run = function (err, res) {
        if (!res) {
            return log.error('Resource was undefined. Check ' + 
                            'configuration %s', __dirname + '/../config/config.js');
        }

        log.info('Listing tables ', res.TableNames);

        if (!~res.TableNames.indexOf('Misc')) {
            ddb.createTable(
                'Misc', {
                    hash: ['_id', ddb.schemaTypes().string]
                }, {
                    read: 10,
                    write: 10
                },
                function (_err, _details) {
                    log.warn('database creation: ', _err || _details);
                }
            );
        }

        setInterval(spawner, config.SPAWN_TIME);
    },

    spawner = function () {
        spawner_call_count++;
        sqs.getQueueAttributes({
            QueueUrl: queue,
            AttributeNames: ['All']
        }, worker);
    },

    worker = function (err, data) {
        var proc;

        if (err) {
            log.error(err);
        }

        if (!+data.Attributes.ApproximateNumberOfMessages) {
            return log.warn('No message la :(');
        }

        process.env.remainingVisibleMessages = +data.Attributes.ApproximateNumberOfMessages;

        log.info({
            cc: process.env.CURRENT_CHILD_SIZE,
            mx: config.MAX_CHILD,
            av: config.MAX_CHILD - process.env.CURRENT_CHILD_SIZE,
            rvm: process.env.remainingVisibleMessages
        });

        /** XXX process.env apparently converts everything to string from time to time
         *  so be careful with that shit. cheerio! --#!/bin/bash
         */
        while (config.MAX_CHILD > process.env.CURRENT_CHILD_SIZE &&
            (+process.env.remainingVisibleMessages > 
            ((config.MAX_CHILD - +process.env.CURRENT_CHILD_SIZE) * config.AWS.SQS.RETRIEVED_MESSAGE) ||
            +process.env.remainingVisibleMessages > 0)) {

            /** XXX always check for proc if terminated successfully, we don't 
             *  orphaned processes.. :( -- #!/bin/bash
             */
            proc = fork(
                __dirname + '/child.js', [], {
                    env: {
                        url: queue,
                        spawner_id : spawner_call_count
                    }
                }
            );

            /* jshint ignore:start */
            proc.on('exit', function (code) {
                log.warn('Child close code [%s]', code);

                process.env.CURRENT_CHILD_SIZE--;

                log.info('Running child [%s]', process.env.CURRENT_CHILD_SIZE);

                if (!code) {
                    process.env.remainingVisibleMessages -= config.AWS.SQS.RETRIEVED_MESSAGE;
                }
            });
            /* jshint ignore:end */

            process.env.CURRENT_CHILD_SIZE++;
            log.info('Running child [%s]', process.env.CURRENT_CHILD_SIZE);
        }
    };

log.info('Parent spawned :)');

process.on('uncaughtException', function (err) {
    log.error('Exception: ' + err);
});

process.on('message', function (msg) {
    log.info({
        msg: 'message received from child'
    });
    log.info(msg.pid + ': ' + msg.data);

    if (msg.child_close) {
        process.env.CURRENT_CHILD_SIZE--;
    }
});

process.env.CURRENT_CHILD_SIZE = 0;
process.env.remainingVisibleMessages = 0;

start();

