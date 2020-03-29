import { expect, request } from 'chai';
import { api, config, dao, pool, th } from '.';

const { serverPort } = config;

describe('HTTP /api/first_admin', function() {
    let server;

    before('Start server', done => {
        server = api.koa.listen(serverPort, done);
    });

    afterEach('Delete users', async function() {
        return pool.transaction(async db => dao.user.deleteAll(db));
    });

    describe('Get', function() {
        it('should return false if no admin exists', async function() {
            const resp = await request(server).get('/api/first_admin');
            expect(resp).to.have.status(200);
            expect(resp).to.be.json;
            expect(resp.body).to.deep.include({
                hasAdmin: false,
            });
        });
        it('should return true if admin exist', async function() {
            await th.transacUser({ name: 'a', roles: ['admin'] });
            const resp = await request(server).get('/api/first_admin');
            expect(resp).to.have.status(200);
            expect(resp).to.be.json;
            expect(resp.body).to.deep.include({
                hasAdmin: true,
            });
        });
    });
    describe('Post', function() {
        it('should create first admin', async function() {
            const resp = await request(server)
                .post('/api/first_admin')
                .send({
                    email: 'a@a.net',
                    name: 'a',
                    fullName: 'A',
                    password: 'mot-de-passe',
                });
            expect(resp).to.have.status(200);
            expect(resp).to.be.json;
            expect(resp.body).to.deep.include({
                email: 'a@a.net',
                name: 'a',
                fullName: 'A',
                roles: ['admin'],
            });
            expect(resp.body).to.have.property('id');
            expect(resp.body.id).to.be.uuid();
        });
        it('should not create first admin if admin exists', async function() {
            await th.transacUser({ name: 'a', roles: ['admin'] });
            const resp = await request(server)
                .post('/api/first_admin')
                .send({
                    email: 'b@a.net',
                    name: 'b',
                    fullName: 'B',
                    password: 'mot-de-passe',
                });
            expect(resp).to.have.status(403);
        });
    });
});
