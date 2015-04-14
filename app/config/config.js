'use strict';

module.exports = {
    PORT: 5000,
    MAX_CHILD: 10,

    // XXX - this is in fucking ms
    SPAWN_TIME: 3000,

    AWS: {
        SQS: {
            KEY: 'REMOVED_KEY',
            SECRET: 'REMOVED_SECRET',
            REGION: 'us-east-1',
            PROC_TIME: 10000,
            RETRIEVED_MESSAGE: 10,

            QUEUES: {
                'Logs': 'REMOVED_URL'
            }
        }
    }
};

