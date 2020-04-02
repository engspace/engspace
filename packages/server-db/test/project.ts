import { expect } from 'chai';
import { dao, pool, th } from '.';
import { idType } from '../src/test-helpers';

describe('ProjectDao', () => {
    describe('create', () => {
        afterEach('clean up', th.cleanTable('project'));

        it('should create project', async function() {
            const proj = await pool.transaction(async db => {
                return dao.project.create(db, {
                    code: 'a',
                    name: 'A',
                    description: 'a desc',
                });
            });
            expect(proj).to.deep.include({
                code: 'a',
                name: 'A',
                description: 'a desc',
            });
            expect(proj.id).to.be.a(idType);
        });
    });

    describe('Get', () => {
        let projects;
        before('create projects', async () => {
            projects = await th.transacProjects({
                a: { code: 'a' },
                b: { code: 'b' },
            });
        });
        after('delete projects', th.cleanTable('project'));

        it('should find project by id', async () =>
            pool.connect(async db => {
                const project = await dao.project.byId(db, projects.a.id);
                expect(project).to.deep.include(projects.a);
            }));

        it('should find project by code', async () =>
            pool.connect(async db => {
                const project = await dao.project.byCode(db, 'a');
                expect(project).to.deep.include(projects.a);
            }));
        it('should get by ordered batch', async () => {
            const projs = await pool.connect(db =>
                dao.project.batchByIds(db, [projects.b.id, projects.a.id])
            );
            expect(projs).to.eql([projects.b, projects.a]);
        });
    });

    describe('Search', () => {
        let projects;
        before('create projects', async () => {
            projects = await th.transacProjects({
                chair: { code: 'chair' },
                desk: { code: 'desk' },
            });
        });
        after('delete projects', th.cleanTable('project'));

        it('should find project by partial code', async function() {
            const result = await pool.connect(async db => {
                return dao.project.search(db, { phrase: 'ch' });
            });
            const expected = {
                count: 1,
                projects: [projects.chair],
            };
            expect(result).to.eql(expected);
        });

        it('should find project with member name', async function() {
            const result = await pool.transaction(async db => {
                const user = await th.createUser(db, { name: 'user.a' });
                await dao.projectMember.create(db, {
                    projectId: projects.chair.id,
                    userId: user.id,
                    roles: ['leader'],
                });
                return dao.project.search(db, { member: 'user.a' });
            });

            const expected = {
                count: 1,
                projects: [projects.chair],
            };
            expect(result).to.eql(expected);

            await pool.transaction(async db => {
                await dao.projectMember.deleteAll(db);
                return dao.user.deleteAll(db);
            });
        });

        it('should paginate search', async function() {
            const { res1, res2 } = await pool.connect(async db => {
                const res1 = await dao.project.search(db, { offset: 0, limit: 1 });
                const res2 = await dao.project.search(db, { offset: 1, limit: 1 });
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
                return dao.project.create(db, projAInput);
            });
        });
        afterEach('Delete project', async function() {
            return pool.transaction(async db => dao.project.deleteAll(db));
        });

        it('should update project', async function() {
            const projB = await pool.transaction(async db => {
                return dao.project.updateById(db, projA.id, projBInput);
            });
            expect(projB).to.deep.include({
                id: projA.id,
                ...projBInput,
            });
        });
    });

    describe('Patch', async () => {
        let projects;
        beforeEach('create projects', async () => {
            projects = await th.transacProjects({
                chair: { code: 'chair' },
                desk: { code: 'desk' },
            });
        });
        afterEach('delete projects', th.cleanTable('project'));

        it('should patch project description', async () =>
            pool.connect(async db => {
                const patch = {
                    description: 'A stool chair',
                };

                const returned = await dao.project.patch(db, projects.chair.id, patch);
                expect(returned).to.include(patch);
                const updated = await dao.project.byCode(db, 'chair');
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

                const returned = await dao.project.patch(db, projects.desk.id, patch);
                expect(returned).to.include(patch);
                const updated = await dao.project.byCode(db, 'drawing-table');
                expect(updated).to.deep.equal({
                    ...projects.desk,
                    ...patch,
                });
            }));
    });

    describe('Delete', () => {
        let projects;
        beforeEach('create projects', async () => {
            projects = await th.transacProjects({
                chair: { code: 'chair' },
                desk: { code: 'desk' },
            });
        });
        afterEach('delete projects', th.cleanTable('project'));

        it('should delete by id', async () => {
            await pool.connect(db => dao.project.deleteById(db, projects.chair.id));
            const result = await pool.connect(db => dao.project.search(db, {}));
            expect(result).to.deep.equal({
                count: 1,
                projects: [projects.desk],
            });
        });
    });
});
