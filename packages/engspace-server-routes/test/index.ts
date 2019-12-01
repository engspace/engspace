import events from 'events';
import http from 'http';
import chai from 'chai';
import chaiHttp from 'chai-http';
import config from 'config';

import { Pool, DbConfig } from '@engspace/server-db';
import { app } from '../src';

export { app, Pool };

events.EventEmitter.defaultMaxListeners = 100;

chai.use(chaiHttp);
let server: http.Server;

before('db and server setup', function(done) {
    this.timeout(5000);
    const dbConf: DbConfig = config.get('db');
    console.log('starting tests with Db config:', dbConf);
    const now = Date.now();
    Pool.init(dbConf)
        .then(() => {
            const elapsed = Date.now() - now;
            console.log(`db initialized in ${elapsed} ms`);
            const { port } = config.get('server');
            server = app.listen(port, done);
        })
        .catch(err => {
            console.error(err);
        });
});

after('server and db shutdown', done => {
    server.close(async () => {
        done();
    });
});
