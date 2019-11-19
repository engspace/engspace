import events from 'events';
import http from 'http';
import chai from 'chai';
import chaiHttp from 'chai-http';
import config from 'config';

import { Pool, createSchema } from '@engspace/server-db';
import { app } from '../src';

export { app, Pool };

events.EventEmitter.defaultMaxListeners = 100;

chai.use(chaiHttp);
let server: http.Server;

before('db and server setup', done => {
    Pool.create(config.get('db'));
    createSchema({ preserve: false }).then(() => {
        const { port } = config.get('server');
        server = app.listen(port, done);
    });
});

after('server and db shutdown', done => {
    server.close(async () => {
        done();
    });
});
