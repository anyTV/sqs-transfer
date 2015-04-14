'use strict';

var bunyan = require('bunyan');

exports = bunyan.createLogger({name : 'sqs-dynamo'});

module.exports = exports;
