'use strict';

/* jshint undef: true, unused: true */
/* global log, config */

var express = require('express'),
    body_parser = require('body-parser'),
    app = express(),
    _app = require(__dirname + '/libs/app'),
    fork = require('child_process').fork,
    parent_process;

global.config = require(__dirname + '/config/config');
global.log = require(__dirname + '/libs/log');
global._util = require(__dirname + '/libs/utility');

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended : false}));
app.disable('x-powered-by');
app.use(_app.powered_by);
app.use(require(__dirname + '/config/routes')(express.Router()));
app.use(_app.error);

app.listen(config.PORT);
log.warn('Started main server. Listening at [%s]', config.PORT);

process.on('uncaughtException', function (err) {
    log.fatal(err);
});

/* -------------------------------------------
 *                                           *
 * Process worker settings beyond this point *
 *                                           *
 * -------------------------------------------*/

parent_process = fork(__dirname + '/worker/parent.js');
log.warn('spawing parent pull. PID: %s', parent_process.pid);

parent_process.on('error', function (e) {
    log.error('Parent Process Error: ' + e);
});

parent_process.on('exit', function (code) {
    log.warn('parent_process exited with code:' + code);
});

parent_process.on('close', function (code) {
    log.warn('parent_process exited with code:' + code);
});

parent_process.on('disconnect', function (msg) {
    log.warn('received disconnect: ' + msg);
});
