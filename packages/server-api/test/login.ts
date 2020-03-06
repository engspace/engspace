import { DemoUserSet, prepareUsers } from '@engspace/demo-data-input';
import { createDemoLogins, createDemoUsers } from '@engspace/server-db';
import { expect, request } from 'chai';
import config from 'config';
import http from 'http';
import { api, pool } from '.';
import { verifyJwt } from '../src/crypto';
import { authJwtSecret } from '../src/internal';
import { auth } from './auth';
import { cleanTable } from './helpers';

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
        const { port } = config.get('server');
        server = api.koa.listen(port, done);
    });

    after(cleanTable('user'));

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
