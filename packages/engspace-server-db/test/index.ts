import events from 'events';
import config from 'config';

import { DbConfig, Pool } from '../src';

events.EventEmitter.defaultMaxListeners = 100;

before('db setup', function(done) {
    this.timeout(5000);
    const dbConf: DbConfig = config.get('db');
    console.log('starting tests with Db config:', dbConf);
    Pool.init(dbConf)
        .then(done)
        .catch(err => {
            console.error(err);
        });
});
