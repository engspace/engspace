import chai from 'chai';
import HttpStatus from 'http-status-codes';

import { IProject } from '@engspace/core';
import { Pool, UserDao, ProjectDao } from '@engspace/server-db';
import { app } from '../src';

import { usersAndTokens, deleteUsers } from './user';
import { prepareProjects, createProjects } from '@engspace/demo-data';

const { expect } = chai;

export const deleteProjects = async (): Promise<void> => {
    return Pool.connect(db => ProjectDao.deleteAll(db));
};

describe('Projects', () => {
    let userToks;
    let projects;
    before('create users and get tokens', async () => {
        userToks = await usersAndTokens();
    });
    before('prepare projects', async () => {
        projects = await Pool.connect(async db => prepareProjects(db));
    });
    after('clean up users', deleteUsers);

    describe('GET /api/projects/by-code', () => {
        let dbProjects: IProject[];
        before('create projects', async () => {
            dbProjects = await Pool.connect(async db => createProjects(db));
        });
        after('clean up projects', deleteProjects);

        it('should reject unauthorized access', async () => {
            const res = await chai.request(app).get(`/api/projects/by-code/${dbProjects[0].code}`);
            expect(res).to.have.status(HttpStatus.UNAUTHORIZED);
        });

        it('should get project with simple user', async () => {
            const res = await chai
                .request(app)
                .get(`/api/projects/by-code/${dbProjects[0].code}`)
                .set('Authorization', `Bearer ${userToks.tokens.philippe}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.deep.include(dbProjects[0]);
        });
    });

    describe('POST /api/projects', () => {
        after('clean up projects', deleteProjects);

        it('should reject unauthorized access', async () => {
            const res = await chai
                .request(app)
                .post('/api/projects')
                .send(projects[0]);
            expect(res).to.have.status(HttpStatus.UNAUTHORIZED);
        });

        it('should reject non-manager access', async () => {
            const res = await chai
                .request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${userToks.tokens.philippe}`)
                .send(projects[0]);
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should create project', async () => {
            const res = await chai
                .request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${userToks.tokens.ambre}`)
                .send(projects[0]);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            expect(result).to.deep.include(projects[0]);
            const proj = await Pool.connect(async db =>
                ProjectDao.findByCode(db, projects[0].code)
            );
            expect(proj).to.not.be.null;
            expect(proj).to.deep.include(result);
        });
    });

    describe('PUT /api/projects', async () => {
        let dbProjects: IProject[];
        before('create projects', async () => {
            dbProjects = await Pool.connect(async db => createProjects(db));
        });
        after('clean up projects', deleteProjects);

        it('should update project by id', async () => {
            const proj = dbProjects[1];
            const newProj = {
                id: proj.id,
                name: 'New project2 name',
                code: 'proj002.bis',
                description: 'a new description',
                members: [
                    {
                        user: {
                            id: userToks.users.philippe.id,
                        },
                        leader: false,
                        designer: true,
                    },
                    {
                        user: {
                            id: userToks.users.sophie.id,
                        },
                        leader: true,
                        designer: false,
                    },
                ],
            };
            const res = await chai
                .request(app)
                .put('/api/projects')
                .set('Authorization', `Bearer ${userToks.tokens.ambre}`)
                .send(newProj);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            const expected = await Pool.connect(async db => ({
                ...newProj,
                members: await Promise.all(
                    newProj.members.map(async m => ({
                        ...m,
                        user: await UserDao.findById(db, m.user.id),
                    }))
                ),
            }));
            expect(result).to.deep.include(expected);
        });
    });
});
