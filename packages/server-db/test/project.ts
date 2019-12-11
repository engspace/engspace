import { createProjects, DemoProjectSet, prepareProjects } from '@engspace/demo-data';
import chai from 'chai';
import { pool } from '.';
import { ProjectDao } from '../src';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.connect(db => ProjectDao.deleteAll(db));
}

describe('ProjectDao', () => {
    describe('create', () => {
        const projects = prepareProjects();

        after('clean up', deleteAll);

        it('should create project', async () =>
            pool.connect(async db => {
                const returned = await ProjectDao.create(db, projects.chair);
                expect(returned).to.deep.include(projects.chair);
                const created = await ProjectDao.byCode(db, 'chair');
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
                const project = await ProjectDao.byId(db, projects.desk.id);
                expect(project).to.deep.include(projects.desk);
            }));

        it('should find project by code', async () =>
            pool.connect(async db => {
                const project = await ProjectDao.byCode(db, 'desk');
                expect(project).to.deep.include(projects.desk);
            }));
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
                const result = await ProjectDao.search(db, { phrase: 'ch' });
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

                const returned = await ProjectDao.patch(db, projects.chair.id, patch);
                expect(returned).to.include(patch);
                const updated = await ProjectDao.byCode(db, 'chair');
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

                const returned = await ProjectDao.patch(db, projects.desk.id, patch);
                expect(returned).to.include(patch);
                const updated = await ProjectDao.byCode(db, 'drawing-table');
                expect(updated).to.deep.equal({
                    ...projects.desk,
                    ...patch,
                });
            }));
    });
});
