import {
    asyncKeyMap,
    DemoProjectInputSet,
    DemoProjectSet,
    prepareProjects,
} from '@engspace/demo-data-input';
import { expect } from 'chai';
import { pool } from '.';
import { Db, projectDao, memberDao, userDao } from '../src';

async function deleteAll(): Promise<void> {
    await pool.connect(db => projectDao.deleteAll(db));
}

export async function createProjects(db: Db, projs: DemoProjectInputSet): Promise<DemoProjectSet> {
    return asyncKeyMap(projs, async p => projectDao.create(db, p));
}

describe('projectDao', () => {
    describe('create', () => {
        const projects = prepareProjects();

        after('clean up', deleteAll);

        it('should create project', async () =>
            pool.connect(async db => {
                const returned = await projectDao.create(db, projects.chair);
                expect(returned).to.deep.include(projects.chair);
                const created = await projectDao.byCode(db, 'chair');
                expect(created.id).to.equal(returned.id);
                expect(created).to.deep.include(projects.chair);
            }));
    });

    describe('Get', () => {
        let projects: DemoProjectSet;
        before('create projects', async () => {
            projects = await pool.connect(db => createProjects(db, prepareProjects()));
        });
        after('delete projects', deleteAll);

        it('should find project by id', async () =>
            pool.connect(async db => {
                const project = await projectDao.byId(db, projects.desk.id);
                expect(project).to.deep.include(projects.desk);
            }));

        it('should find project by code', async () =>
            pool.connect(async db => {
                const project = await projectDao.byCode(db, 'desk');
                expect(project).to.deep.include(projects.desk);
            }));
        it('should get by ordered batch', async () => {
            const projs = await pool.connect(db =>
                projectDao.batchByIds(db, [projects.desk.id, projects.chair.id])
            );
            expect(projs).to.eql([projects.desk, projects.chair]);
        });
    });

    describe('Search', () => {
        let projects: DemoProjectSet;
        before('create projects', async () => {
            projects = await pool.connect(db => createProjects(db, prepareProjects()));
        });
        after('delete projects', deleteAll);

        it('should find project by partial code', async function() {
            const result = await pool.connect(async db => {
                return projectDao.search(db, { phrase: 'ch' });
            });
            const expected = {
                count: 1,
                projects: [projects.chair],
            };
            expect(result).to.eql(expected);
        });

        it('should find project with member name', async function() {
            const result = await pool.connect(async db => {
                const user = await userDao.create(db, {
                    name: 'user.a',
                    email: 'user.a@domain.net',
                    fullName: 'User A',
                });
                await memberDao.create(db, {
                    projectId: projects.chair.id,
                    userId: user.id,
                    roles: ['leader'],
                });
                return projectDao.search(db, { member: 'user.a' });
            });

            const expected = {
                count: 1,
                projects: [projects.chair],
            };
            expect(result).to.eql(expected);

            await pool.transaction(async db => {
                await memberDao.deleteAll(db);
                return userDao.deleteAll(db);
            });
        });

        it('should paginate search', async function() {
            const { res1, res2 } = await pool.connect(async db => {
                const res1 = await projectDao.search(db, { offset: 0, limit: 1 });
                const res2 = await projectDao.search(db, { offset: 1, limit: 1 });
                return { res1, res2 };
            });
            expect(res1.count).to.eql(2);
            expect(res2.count).to.eql(2);
            expect(res1.projects)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(res2.projects)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(res1.projects[0].id).to.satisfy(
                id => id === projects.chair.id || id === projects.desk.id
            );
            expect(res2.projects[0].id).to.satisfy(
                id => id === projects.chair.id || id === projects.desk.id
            );
            expect(res1.projects[0].id).to.not.eql(res2.projects[0].id);
        });
    });

    describe('Update', function() {
        const projAInput = {
            name: 'project a',
            code: 'proja',
            description: 'project a description',
        };
        const projBInput = {
            name: 'project b',
            code: 'projb',
            description: 'project b description',
        };
        let projA;
        beforeEach('Create Project A', async function() {
            projA = await pool.transaction(async db => {
                return projectDao.create(db, projAInput);
            });
        });
        afterEach('Delete project', async function() {
            return pool.transaction(async db => projectDao.deleteAll(db));
        });

        it('should update project', async function() {
            const projB = await pool.transaction(async db => {
                return projectDao.updateById(db, projA.id, projBInput);
            });
            expect(projB).to.deep.include({
                id: projA.id,
                ...projBInput,
            });
        });
    });

    describe('Patch', async () => {
        let projects: DemoProjectSet;
        beforeEach('create projects', async () => {
            projects = await pool.connect(db => createProjects(db, prepareProjects()));
        });
        afterEach('delete projects', deleteAll);

        it('should patch project description', async () =>
            pool.connect(async db => {
                const patch = {
                    description: 'A stool chair',
                };

                const returned = await projectDao.patch(db, projects.chair.id, patch);
                expect(returned).to.include(patch);
                const updated = await projectDao.byCode(db, 'chair');
                expect(updated).to.deep.equal({
                    ...projects.chair,
                    ...patch,
                });
            }));

        it('should patch project code', async () =>
            pool.connect(async db => {
                const patch = {
                    code: 'drawing-table',
                };

                const returned = await projectDao.patch(db, projects.desk.id, patch);
                expect(returned).to.include(patch);
                const updated = await projectDao.byCode(db, 'drawing-table');
                expect(updated).to.deep.equal({
                    ...projects.desk,
                    ...patch,
                });
            }));
    });

    describe('Delete', () => {
        let projects: DemoProjectSet;
        beforeEach('create projects', async () => {
            projects = await pool.connect(db => createProjects(db, prepareProjects()));
        });
        afterEach('delete projects', deleteAll);

        it('should delete by id', async () => {
            await pool.connect(db => projectDao.deleteById(db, projects.chair.id));
            const result = await pool.connect(db => projectDao.search(db, {}));
            expect(result).to.deep.equal({
                count: 1,
                projects: [projects.desk],
            });
        });
    });
});
