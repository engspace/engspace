import http from 'http';
import { expect, request } from 'chai';
import { passwordLogin } from '@engspace/server-db';
import { verifyJwt } from '../src/crypto';
import { auth } from './auth';
import { app, config, pool, th, jwtSecret } from '.';

const { serverPort } = config;

describe('Login', () => {
    let userA;
    let server: http.Server;

    before('Create users', async () => {
        return pool.transaction(async (db) => {
            userA = await th.createUser(db, { name: 'a', roles: ['user'] });
            await passwordLogin.create(db, userA.id, 'a');
        });
    });
    before('Start server', (done) => {
        server = app.listen(serverPort, done);
    });

    after(th.cleanTable('user'));

    it('should return bearer token', async () => {
        const resp = await request(server).post('/api/login').send({
            nameOrEmail: 'a',
            password: 'a',
        });
        expect(resp).to.have.status(200);
        expect(resp.body).to.be.an('object');
        expect(resp.body.token).to.be.a('string');
        const authToken = await verifyJwt(resp.body.token, jwtSecret);
        expect(authToken).to.deep.include(auth(userA));
    });

    it('should reject invalid password', async () => {
        const resp = await request(server).post('/api/login').send({
            nameOrEmail: 'a',
            password: 'b',
        });
        expect(resp).to.have.status(403);
    });

    it('should reject invalid username', async () => {
        const resp = await request(server).post('/api/login').send({
            nameOrEmail: 'c',
            password: 'a',
        });
        expect(resp).to.have.status(403);
    });
});
