import events from 'events';
import config from 'config';

import { DbConfig, Pool, createSchema } from '../src';

events.EventEmitter.defaultMaxListeners = 100;

before('db setup', done => {
    const dbConf: DbConfig = config.get('db');
    console.log('starting tests with Db config:', dbConf);
    Pool.create(dbConf);
    createSchema({ preserve: false })
        .then(done)
        .catch(err => {
            console.error(err);
        });
});
