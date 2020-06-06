import { expect } from 'chai';
import { Project, User } from '@engspace/core';
import { Dict, idType } from '../src/test-helpers';
import { dao, pool, th } from '.';

describe('ProjectMemberDao', () => {
    let users: Dict<User>;
    let projects: Dict<Project>;

    before('Create users and projects', async () => {
        [users, projects] = await pool.connect(async (db) =>
            Promise.all([
                th.createUsers(db, {
                    a: {
                        name: 'user.a',
                    },
                    b: {
                        name: 'user.b',
                    },
                    c: {
                        name: 'user.c',
                    },
                }),
                th.createProjects(db, {
                    a: {
                        code: 'proja',
                    },
                    b: {
                        code: 'projb',
                    },
                }),
            ])
        );
    });

    after('Delete users and projects', th.cleanTables(['project', 'user']));

    describe('Create', () => {
        afterEach('delete all members', th.cleanTable('project_member'));
        it('should create a project member', async () => {
            const mem = await pool.transaction((db) =>
                dao.projectMember.create(db, {
                    projectId: projects.a.id,
                    userId: users.b.id,
                    roles: ['role1'],
                })
            );
            expect(mem.id).to.be.a(idType);
            expect(mem).to.deep.include({
                project: { id: projects.a.id },
                user: { id: users.b.id },
                roles: ['role1'],
            });
        });
    });

    describe('Get members', () => {
        let members;
        before('create members', async () => {
            members = await pool.transaction(async (db) => {
                return {
                    aa: await th.createMember(db, projects.a, users.a, ['role1']),
                    bb: await th.createMember(db, projects.b, users.b, ['role2']),
                    ab: await th.createMember(db, projects.a, users.b, ['role3', 'role4']),
                    bc: await th.createMember(db, projects.b, users.c, ['role5', 'role6']),
                };
            });
        });
        after('delete all members', th.cleanTable('project_member'));

        it('should get a member project and user id', async () => {
            const aa = await pool.connect((db) =>
                dao.projectMember.byProjectAndUserId(db, projects.a.id, users.a.id)
            );
            expect(aa).to.not.be.null;
            expect(aa.id).to.be.a(idType);
            expect(aa.roles).to.be.undefined;
        });

        it('should get a member project and user id and roles', async () => {
            const aa = await pool.connect((db) =>
                dao.projectMember.byProjectAndUserId(db, projects.a.id, users.a.id, true)
            );
            expect(aa).to.not.be.null;
            expect(aa.id).to.be.a(idType);
            expect(aa.roles).to.have.members(['role1']);
        });

        it('should get null if user not in project', async () => {
            const ac = await pool.connect((db) =>
                dao.projectMember.byProjectAndUserId(db, projects.a.id, users.c.id)
            );
            expect(ac).to.be.null;
        });

        it('should get more than one role if applicable', async () => {
            const ab = await pool.connect((db) =>
                dao.projectMember.byProjectAndUserId(db, projects.a.id, users.b.id, true)
            );
            expect(ab).to.not.be.null;
            expect(ab.id).to.be.a(idType);
            expect(ab.roles).to.have.members(['role3', 'role4']);
        });

        it('should get members on a project', async () => {
            const b = await pool.connect((db) => dao.projectMember.byProjectId(db, projects.b.id));
            expect(b).to.include.deep.members([
                {
                    id: members.bb.id,
                    project: { id: projects.b.id },
                    user: { id: users.b.id },
                },
                {
                    id: members.bc.id,
                    project: { id: projects.b.id },
                    user: { id: users.c.id },
                },
            ]);
        });
        it('should get all projects from a user', async () => {
            const b = await pool.connect((db) => dao.projectMember.byUserId(db, users.b.id));
            expect(b).to.have.deep.members([
                {
                    id: members.bb.id,
                    project: { id: projects.b.id },
                    user: { id: users.b.id },
                },
                {
                    id: members.ab.id,
                    project: { id: projects.a.id },
                    user: { id: users.b.id },
                },
            ]);
        });
    });

    describe('Update member', () => {
        let aa;

        beforeEach('create members', async function () {
            aa = await th.transacMember(projects.a, users.a, ['role1']);
        });
        afterEach('delete all members', th.cleanTable('project_member'));

        it('should remove all project member roles', async function () {
            const memb = await pool.transaction(async (db) => {
                return dao.projectMember.updateRolesById(db, aa.id, null);
            });
            expect(memb).to.deep.include({
                project: { id: projects.a.id },
                user: { id: users.a.id },
                roles: [],
            });
        });

        it('should change project member roles', async function () {
            const memb = await pool.transaction(async (db) => {
                return dao.projectMember.updateRolesById(db, aa.id, ['role2', 'role3']);
            });
            expect(memb).to.deep.include({
                project: { id: projects.a.id },
                user: { id: users.a.id },
                roles: ['role2', 'role3'],
            });
        });
    });

    describe('Delete', () => {
        let members;
        beforeEach('create members', async () => {
            members = await pool.transaction(async (db) => {
                return {
                    aa: await th.createMember(db, projects.a, users.a, ['role1']),
                    bb: await th.createMember(db, projects.b, users.b, ['role2']),
                    ab: await th.createMember(db, projects.a, users.b, ['role3', 'role4']),
                    bc: await th.createMember(db, projects.b, users.c, ['role5', 'role6']),
                };
            });
        });
        afterEach('delete all members', th.cleanTable('project_member'));

        it('should delete a specific member', async () => {
            await pool.connect((db) =>
                dao.projectMember.deleteByProjectAndUserId(db, projects.b.id, users.b.id)
            );
            const userB = await pool.connect((db) => dao.projectMember.byUserId(db, users.b.id));
            expect(userB).to.have.deep.members([
                {
                    id: members.ab.id,
                    project: { id: projects.a.id },
                    user: { id: users.b.id },
                },
            ]);
        });

        it('should delete members from a project', async () => {
            await pool.connect((db) => dao.projectMember.deleteByProjId(db, projects.a.id));
            const projA = await pool.connect((db) =>
                dao.projectMember.byProjectId(db, projects.a.id)
            );
            expect(projA).to.deep.include.members([]);
        });

        it('should delete a projects from a user', async () => {
            await pool.connect((db) => dao.projectMember.deleteByUserId(db, users.b.id));
            const userB = await pool.connect((db) => dao.projectMember.byUserId(db, users.b.id));
            expect(userB).to.deep.include.members([]);
        });
    });
});
