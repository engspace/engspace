import { memberDao, projectDao } from '@engspace/server-db';
import { expect, request } from 'chai';
import { print } from 'graphql/language/printer';
import { api, pool, serverPort } from '.';
import { signJwt } from '../src/crypto';
import { bearerToken, permsAuth } from './auth';
import { cleanTable, transacDemoProjects, transacDemoUsers } from './helpers';
import { MEMBER_DELETE } from './member';
import { PROJECT_CREATE, PROJECT_READ, PROJECT_UPDATE } from './project';

describe('End to end GraphQL', function() {
    let users;

    before('Create users', async function() {
        users = await transacDemoUsers();
    });

    after('Delete users', cleanTable('user'));

    let server;

    before('Start server', done => {
        server = api.koa.listen(serverPort, done);
    });

    describe('General', function() {
        afterEach(cleanTable('project'));

        it('should return 404 if unmatched resource', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['project.read']));
            const resp = await request(server)
                .get('/not_a_resource')
                .set('Authorization', `Bearer ${token}`);
            expect(resp).to.have.status(404);
        });

        it('should return 401 if unmatched resource without auth', async function() {
            const resp = await request(server).get('/not_a_resource');
            expect(resp).to.have.status(401);
        });

        it('confirms token', async function() {
            const token = await bearerToken(permsAuth(users.philippe, []));
            const resp = await request(server)
                .get('/api/check_token')
                .set('Authorization', `Bearer ${token}`);
            expect(resp).to.have.status(200);
        });

        it('GraphQL may not use PATCH and get 405', async function() {
            const proj = await pool.transaction(async db => {
                return projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const token = await bearerToken(
                permsAuth(users.philippe, ['project.read', 'project.create'])
            );
            const resp = await request(server)
                .patch('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: print(PROJECT_UPDATE),
                    variables: {
                        id: proj.id,
                        project: {
                            name: 'projectname',
                            code: 'projectcode',
                            description: 'project description',
                        },
                    },
                });
            expect(resp).to.have.status(405);
        });

        it('GraphQL may not use PUT and get 405', async function() {
            const proj = await pool.transaction(async db => {
                return projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const token = await bearerToken(
                permsAuth(users.philippe, ['project.read', 'project.create'])
            );
            const resp = await request(server)
                .put('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: print(PROJECT_UPDATE),
                    variables: {
                        id: proj.id,
                        project: {
                            name: 'projectname',
                            code: 'projectcode',
                            description: 'project description',
                        },
                    },
                });
            expect(resp).to.have.status(405);
        });

        it('GraphQL may not use DELETE and get 405', async function() {
            const mem = await pool.transaction(async db => {
                const proj = await projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
                return memberDao.create(db, {
                    projectId: proj.id,
                    userId: users.sophie.id,
                    roles: ['leader'],
                });
            });
            const token = await bearerToken(
                permsAuth(users.sophie, [
                    'project.read',
                    'user.read',
                    'member.delete',
                    'member.read',
                ])
            );
            const resp = await request(server)
                .put('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: print(MEMBER_DELETE),
                    variables: {
                        id: mem.id,
                    },
                });
            expect(resp).to.have.status(405);
        });
    });

    describe('Query / GET', function() {
        let projects;

        before('Create projects', async function() {
            projects = await transacDemoProjects();
        });

        after(cleanTable('project'));

        it('read project values with GET', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['project.read']));
            const resp = await request(server)
                .get('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    query: print(PROJECT_READ),
                    variables: JSON.stringify({
                        id: projects.chair.id,
                    }),
                });
            expect(resp).to.have.status(200);
            expect(resp).to.have.property('body');
            const { errors, data } = resp.body;
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.project).to.deep.include({
                ...projects.chair,
            });
        });

        it('also works without "Bearer" keyword"', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['project.read']));
            const resp = await request(server)
                .get('/api/graphql')
                .set('Authorization', `${token}`)
                .query({
                    query: print(PROJECT_READ),
                    variables: JSON.stringify({
                        id: projects.chair.id,
                    }),
                });
            expect(resp).to.have.status(200);
            expect(resp).to.have.property('body');
            const { errors, data } = resp.body;
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.project).to.deep.include({
                ...projects.chair,
            });
        });

        it('returns 400 in case of wrong query', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['project.read']));
            const resp = await request(server)
                .get('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    query: 'not a query',
                });
            expect(resp).to.have.status(400);
        });

        it('returns 200 and error if missing permission', async function() {
            const token = await bearerToken(permsAuth(users.philippe, []));
            const resp = await request(server)
                .get('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    query: print(PROJECT_READ),
                    variables: JSON.stringify({
                        id: projects.chair.id,
                    }),
                });
            expect(resp).to.have.status(200);
            expect(resp).to.have.property('body');
            const { errors, data } = resp.body;
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('project.read');
            expect(data).to.be.an('object');
            expect(data.project).to.be.null;
        });

        it('returns 401 if no auth', async function() {
            const resp = await request(server)
                .get('/api/graphql')
                .query({
                    query: print(PROJECT_READ),
                    variables: JSON.stringify({
                        id: projects.chair.id,
                    }),
                });
            expect(resp).to.have.status(401);
        });

        it('returns 403 if false token', async function() {
            const auth = permsAuth(users.philippe, ['project.read']);
            const token = signJwt(auth, 'false secret', { expiresIn: '12H' });
            const resp = await request(server)
                .get('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    query: print(PROJECT_READ),
                    variables: JSON.stringify({
                        id: projects.chair.id,
                    }),
                });
            expect(resp).to.have.status(403);
        });
    });

    describe('Mutation / POST', function() {
        it('should create a project', async function() {
            const token = await bearerToken(
                permsAuth(users.philippe, ['project.read', 'project.create'])
            );
            const resp = await request(server)
                .post('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: print(PROJECT_CREATE),
                    variables: {
                        project: {
                            name: 'projectname',
                            code: 'projectcode',
                            description: 'project description',
                        },
                    },
                });
            expect(resp).to.have.status(200);
            expect(resp).to.have.property('body');
            const { errors, data } = resp.body;
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.projectCreate).to.deep.include({
                name: 'projectname',
                code: 'projectcode',
                description: 'project description',
            });
        });

        it('should return 400 if wrong query', async function() {
            const token = await bearerToken(
                permsAuth(users.philippe, ['project.read', 'project.create'])
            );
            const resp = await request(server)
                .post('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: 'not a mutation',
                });
            expect(resp).to.have.status(400);
        });

        it('should return 200 and error if missing permission', async function() {
            const token = await bearerToken(permsAuth(users.philippe, []));
            const resp = await request(server)
                .post('/api/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: print(PROJECT_CREATE),
                    variables: {
                        project: {
                            name: 'projectname',
                            code: 'projectcode',
                            description: 'project description',
                        },
                    },
                });
            expect(resp).to.have.status(200);
            expect(resp).to.have.property('body');
            const { errors, data } = resp.body;
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('project.create');
            expect(data).to.be.null;
        });

        it('should return 401 if no auth', async function() {
            const resp = await request(server)
                .post('/api/graphql')
                .send({
                    query: print(PROJECT_CREATE),
                    variables: {
                        name: 'projectname',
                        code: 'projectcode',
                        description: 'project description',
                    },
                });
            expect(resp).to.have.status(401);
        });
    });
});
