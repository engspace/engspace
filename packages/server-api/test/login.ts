import { DemoUserSet, prepareUsers } from '@engspace/demo-data-input';
import { expect, request } from 'chai';
import config from 'config';
import http from 'http';
import { sql } from 'slonik';
import { api, pool } from '.';
import { auth } from './auth';
import { createUsers } from './user';
import { verifyJwt } from '../src/crypto';
import { authJwtSecret } from '../src/internal';
import { Db, loginDao } from '@engspace/server-db';

async function deleteAll(): Promise<void> {
    await pool.transaction(async db => db.query(sql`DELETE FROM "user"`));
}

async function createLogins(db: Db, users: Promise<DemoUserSet>): Promise<void> {
    const usrs = await users;
    for (const name in usrs) {
        await loginDao.create(db, usrs[name].id, name);
    }
}

describe('Login', () => {
    const usersInput = prepareUsers();
    let users: DemoUserSet;
    let server: http.Server;

    before('Create users', async () => {
        users = await pool.transaction(async db => {
            const usrs = createUsers(db, usersInput);
            await createLogins(db, usrs);
            return usrs;
        });
    });
    before('Start server', done => {
        const { port } = config.get('server');
        server = api.koa.listen(port, done);
    });

    after(deleteAll);

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
