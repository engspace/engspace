import chai from 'chai';
import { createUsers, createProjects, prepareProjects } from '@engspace/demo-data';
import { User, Project } from '@engspace/core';
import { Pool, ProjectDao, UserDao } from '../src';

const { expect } = chai;

describe('ProjectDao', () => {
    let dbUsers: User[];
    let projects: Project[];
    before('make projects', async () => {
        projects = await Pool.connect(async db => {
            dbUsers = await createUsers(db);
            return prepareProjects(db);
        });
    });
    after('clean up', async () =>
        Pool.connect(async db => {
            await ProjectDao.deleteAll(db);
            await UserDao.deleteAll(db);
        })
    );

    describe('create', () => {
        after('clean up', async () => Pool.connect(async db => ProjectDao.deleteAll(db)));

        it('should create project', async () =>
            Pool.connect(async db => {
                const returned = await ProjectDao.create(db, projects[0]);
                expect(returned).to.deep.include(projects[0]);
                const created = await ProjectDao.findByCode(db, projects[0].code);
                expect(created.id).to.equal(returned.id);
                expect(created).to.deep.include(projects[0]);
            }));
    });

    describe('find, update', () => {
        let dbProjects: Project[];
        before('populate projects', async () =>
            Pool.connect(async db => {
                dbProjects = await createProjects(db);
            })
        );

        it('should find project by id', async () =>
            Pool.connect(async db => {
                const project = await ProjectDao.findById(db, dbProjects[0].id as number);
                expect(project).to.deep.include(dbProjects[0]);
            }));

        it('should find project by code', async () =>
            Pool.connect(async db => {
                const project = await ProjectDao.findByCode(db, dbProjects[0].code);
                expect(project).to.deep.include(dbProjects[0]);
            }));

        it('should update project by id', async () =>
            Pool.connect(async db => {
                const proj: Project = {
                    id: dbProjects[1].id as number,
                    code: 'a_new_code',
                    name: 'a new name',
                    description: 'a new description',
                    members: [
                        {
                            user: dbUsers.find(u => u.name === 'alphonse') as User,
                            designer: true,
                            leader: true,
                        },
                        {
                            user: dbUsers.find(u => u.name === 'fatima') as User,
                            designer: true,
                            leader: true,
                        },
                        {
                            user: dbUsers.find(u => u.name === 'philippe') as User,
                            designer: true,
                            leader: false,
                        },
                    ],
                };
                const returned = await ProjectDao.updateById(db, proj);
                expect(returned).to.deep.include(proj);
                const updated = await ProjectDao.findById(db, proj.id as number);
                expect(updated).to.deep.include(proj);
            }));
    });
});
