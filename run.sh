#!/usr/bin/env bash
echo "Running SQS-DynamoDB Transfer"

[ -d logs ] || mkdir logs

which forever 2>&1 > /dev/null

if [ $? -eq 0 ]
then
    forever stop "sqs-transfer"
    forever start --uid "sqs-transfer" -a -l logs/log.log -e logs/err.log -p . ./app/server.js
else 
    echo 'run sudo npm install forever -g'
fi
