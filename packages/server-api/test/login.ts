import { DemoUserSet, prepareUsers } from '@engspace/demo-data-input';
import { createDemoLogins, createDemoUsers } from '@engspace/server-db/dist/populate-demo';
import { cleanTable } from '@engspace/server-db/dist/test-helpers';
import { expect, request } from 'chai';
import http from 'http';
import { api, config, pool } from '.';
import { verifyJwt } from '../src/crypto';
import { authJwtSecret } from '../src/internal';
import { auth } from './auth';

const { serverPort } = config;

describe('Login', () => {
    const usersInput = prepareUsers();
    let users: DemoUserSet;
    let server: http.Server;

    before('Create users', async () => {
        users = await pool.transaction(async db => {
            const usrs = createDemoUsers(db, usersInput);
            await createDemoLogins(db, usrs);
            return usrs;
        });
    });
    before('Start server', done => {
        server = api.koa.listen(serverPort, done);
    });

    after(cleanTable(pool, 'user'));

    it('should return bearer token', async () => {
        const resp = await request(server)
            .post('/api/login')
            .send({
                nameOrEmail: 'gerard',
                password: 'gerard',
            });
        expect(resp.body).to.be.an('object');
        expect(resp.body.token).to.be.a('string');
        const authToken = await verifyJwt(resp.body.token, authJwtSecret);
        expect(authToken).to.deep.include(auth(users.gerard));
    });
});
