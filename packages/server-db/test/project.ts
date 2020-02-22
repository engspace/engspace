import { DemoProjectSet, DemoProjectInputSet, prepareProjects } from '@engspace/demo-data-input';
import chai from 'chai';
import { pool } from '.';
import { projectDao, Db } from '../src';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.connect(db => projectDao.deleteAll(db));
}

export async function createProjects(db: Db, projs: DemoProjectInputSet): Promise<DemoProjectSet> {
    const keyVals = await Promise.all(
        Object.entries(projs).map(async ([code, input]) => [
            code,
            await projectDao.create(db, input),
        ])
    );
    return Object.fromEntries(keyVals);
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

        it('should find project by partial code', async () =>
            pool.connect(async db => {
                const expected = {
                    count: 1,
                    projects: [projects.chair],
                };
                const result = await projectDao.search(db, { phrase: 'ch' });
                expect(result).to.eql(expected);
            }));
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
