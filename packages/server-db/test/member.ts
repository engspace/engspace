import {
    DemoProjectSet,
    DemoUserSet,
    membersInput,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data-input';
import { ProjectMember } from '@engspace/core';
import chai from 'chai';
import { sql } from 'slonik';
import { pool } from '.';
import { createUsers } from './user';
import { createProjects } from './project';
import { memberDao, projectDao, userDao } from '../src';

const { expect } = chai;

export async function createMembers(
    db,
    projects: Promise<DemoProjectSet>,
    users: Promise<DemoUserSet>
): Promise<ProjectMember[]> {
    const [projs, usrs] = await Promise.all([projects, users]);
    return Promise.all(
        membersInput.map(m =>
            memberDao.create(db, {
                projectId: projs[m.project].id,
                userId: usrs[m.user].id,
                roles: m.roles,
            })
        )
    );
}
async function deleteAll(): Promise<void> {
    await pool.connect(db =>
        db.query(sql`
            DELETE from project_member
        `)
    );
}

describe('memberDao', () => {
    let users: DemoUserSet;
    let projects: DemoProjectSet;

    before('Create users and projects', async () => {
        [users, projects] = await pool.connect(async db =>
            Promise.all([createUsers(db, prepareUsers()), createProjects(db, prepareProjects())])
        );
    });

    after('Delete users and projects', async () => {
        await pool.connect(async db => {
            await projectDao.deleteAll(db);
            await userDao.deleteAll(db);
        });
    });

    describe('Create', () => {
        afterEach('delete all members', deleteAll);
        it('should create a project member', async () => {
            const created = await pool.connect(db =>
                memberDao.create(db, {
                    projectId: projects.chair.id,
                    userId: users.tania.id,
                    roles: ['leader'],
                })
            );
            const expected = {
                project: { id: projects.chair.id },
                user: { id: users.tania.id },
                roles: ['leader'],
            };
            expect(created.id).to.be.a('string');
            expect(created).to.deep.include(expected);
        });
    });

    describe('Get members', () => {
        before('create demo members', async () => {
            await pool.transaction(db =>
                createMembers(db, Promise.resolve(projects), Promise.resolve(users))
            );
        });
        after('delete all members', deleteAll);

        it('should get a member project and user id', async () => {
            const taniaChair = await pool.connect(db =>
                memberDao.byProjectAndUserId(db, projects.chair.id, users.tania.id, true)
            );
            expect(taniaChair).to.not.be.null;
            expect(taniaChair.roles).to.have.members(['leader']);
        });

        it('should get null if user not in project', async () => {
            const taniaDesk = await pool.connect(db =>
                memberDao.byProjectAndUserId(db, projects.desk.id, users.tania.id)
            );
            expect(taniaDesk).to.be.null;
        });

        it('should get more than one role if applicable', async () => {
            const alphonseDesk = await pool.connect(db =>
                memberDao.byProjectAndUserId(db, projects.desk.id, users.alphonse.id, true)
            );
            expect(alphonseDesk).to.not.be.null;
            expect(alphonseDesk.roles).to.have.members(['leader', 'designer']);
        });

        it('should get members on a project', async () => {
            const chairMembers = await pool.connect(db =>
                memberDao.byProjectId(db, projects.chair.id)
            );
            expect(chairMembers).to.shallowDeepEqual([
                {
                    user: { id: users.tania.id },
                    project: { id: projects.chair.id },
                },
                {
                    user: { id: users.fatima.id },
                    project: { id: projects.chair.id },
                },
                {
                    user: { id: users.philippe.id },
                    project: { id: projects.chair.id },
                },
                {
                    user: { id: users.pascal.id },
                    project: { id: projects.chair.id },
                },
            ]);
        });
        it('should get all projects from a user', async () => {
            const fatimaMembers = await pool.connect(db => memberDao.byUserId(db, users.fatima.id));
            expect(fatimaMembers).to.have.lengthOf(2);
            expect(fatimaMembers).to.shallowDeepEqual([
                {
                    user: { id: users.fatima.id },
                    project: { id: projects.chair.id },
                },
                {
                    user: { id: users.fatima.id },
                    project: { id: projects.desk.id },
                },
            ]);
        });
    });

    describe('Update member', () => {
        let taniaChair;

        beforeEach('create demo members', async function() {
            taniaChair = await pool.transaction(async db => {
                return memberDao.create(db, {
                    projectId: projects.chair.id,
                    userId: users.tania.id,
                    roles: ['designer'],
                });
            });
        });
        afterEach('delete all members', deleteAll);

        it('should remove all project member roles', async function() {
            const memb = await pool.transaction(async db => {
                return memberDao.updateRolesById(db, taniaChair.id, null);
            });
            expect(memb).to.deep.include({
                project: { id: projects.chair.id },
                user: { id: users.tania.id },
                roles: [],
            });
        });

        it('should change project member roles', async function() {
            const memb = await pool.transaction(async db => {
                return memberDao.updateRolesById(db, taniaChair.id, ['leader', 'engineer']);
            });
            expect(memb).to.deep.include({
                project: { id: projects.chair.id },
                user: { id: users.tania.id },
                roles: ['leader', 'engineer'],
            });
        });
    });

    describe('Delete', () => {
        beforeEach('create demo members', async () => {
            await pool.connect(db =>
                createMembers(db, Promise.resolve(projects), Promise.resolve(users))
            );
        });
        afterEach('delete all members', deleteAll);

        it('should delete a specific member', async () => {
            await pool.connect(db =>
                memberDao.deleteByProjectAndUserId(db, projects.desk.id, users.fatima.id)
            );
            const fatimaMembers = await pool.connect(db => memberDao.byUserId(db, users.fatima.id));
            expect(fatimaMembers).to.shallowDeepEqual([
                {
                    user: { id: users.fatima.id },
                    project: { id: projects.chair.id },
                },
            ]);
        });

        it('should delete members from a project', async () => {
            await pool.connect(db => memberDao.deleteByProjId(db, projects.chair.id));
            const chairMembers = await pool.connect(db =>
                memberDao.byProjectId(db, projects.chair.id)
            );
            expect(chairMembers).to.deep.include.members([]);
        });

        it('should delete a projects from a user', async () => {
            await pool.connect(db => memberDao.deleteByUserId(db, users.fatima.id));
            const fatimaMembers = await pool.connect(db => memberDao.byUserId(db, users.fatima.id));
            expect(fatimaMembers).to.deep.include.members([]);
        });
    });
});
