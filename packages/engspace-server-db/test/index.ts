import events from 'events';
import config from 'config';

import { DbConfig, DbPool, createDbPool } from '../src';

events.EventEmitter.defaultMaxListeners = 100;

export let pool: DbPool;

before('db setup', function(done) {
    this.timeout(5000);
    const dbConf: DbConfig = config.get('db');
    console.log('starting tests with Db config:', dbConf);
    createDbPool(dbConf).then(p => {
        pool = p;
        done();
    });
});
