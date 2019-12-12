import { ProjectRole } from '@engspace/core';
import {
    createMembers,
    createProjects,
    createUsers,
    DemoProjectSet,
    DemoUserSet,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data';
import chai from 'chai';
import { sql } from 'slonik';
import { pool } from '.';
import { MemberDao, ProjectDao, UserDao } from '../src';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.connect(db =>
        db.query(sql`
            DELETE from project_member
        `)
    );
}

describe('MemberDao', () => {
    let users: DemoUserSet;
    let projects: DemoProjectSet;

    before('Create users and projects', async () => {
        [users, projects] = await pool.connect(async db =>
            Promise.all([createUsers(db, prepareUsers()), createProjects(db, prepareProjects())])
        );
    });

    after('Delete users and projects', async () => {
        await pool.connect(async db => {
            await ProjectDao.deleteAll(db);
            await UserDao.deleteAll(db);
        });
    });

    describe('Create', () => {
        afterEach('delete all members', deleteAll);
        it('should create a project member', async () => {
            const created = await pool.connect(db =>
                MemberDao.create(db, {
                    project: projects.chair,
                    user: users.tania,
                    roles: [ProjectRole.Leader],
                })
            );
            const expected = {
                project: { id: projects.chair.id },
                user: { id: users.tania.id },
                roles: [ProjectRole.Leader],
            };
            expect(created).to.eql(expected);
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
                MemberDao.rolesByProjectAndUserId(db, {
                    projectId: projects.chair.id,
                    userId: users.tania.id,
                })
            );
            expect(taniaChair).to.have.members([ProjectRole.Leader]);
        });

        it('should get null if user not in project', async () => {
            const taniaDesk = await pool.connect(db =>
                MemberDao.rolesByProjectAndUserId(db, {
                    projectId: projects.desk.id,
                    userId: users.tania.id,
                })
            );
            expect(taniaDesk).to.be.null;
        });

        it('should get more than one role if applicable', async () => {
            const alphonseDesk = await pool.connect(db =>
                MemberDao.rolesByProjectAndUserId(db, {
                    projectId: projects.desk.id,
                    userId: users.alphonse.id,
                })
            );
            expect(alphonseDesk).to.have.members([ProjectRole.Leader, ProjectRole.Designer]);
        });

        it('should get members on a project', async () => {
            const chairMembers = await pool.connect(db =>
                MemberDao.byProjectId(db, projects.chair.id)
            );
            expect(chairMembers).to.deep.include.members([
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
            const fatimaMembers = await pool.connect(db => MemberDao.byUserId(db, users.fatima.id));
            expect(fatimaMembers).to.have.lengthOf(2);
            expect(fatimaMembers).to.deep.include.members([
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

    describe('Delete', () => {
        beforeEach('create demo members', async () => {
            await pool.connect(db =>
                createMembers(db, Promise.resolve(projects), Promise.resolve(users))
            );
        });
        afterEach('delete all members', deleteAll);

        it('should delete a specific member', async () => {
            await pool.connect(db =>
                MemberDao.deleteById(db, { projectId: projects.desk.id, userId: users.fatima.id })
            );
            const fatimaMembers = await pool.connect(db => MemberDao.byUserId(db, users.fatima.id));
            expect(fatimaMembers).to.deep.include.members([
                {
                    user: { id: users.fatima.id },
                    project: { id: projects.chair.id },
                },
            ]);
        });

        it('should delete members from a project', async () => {
            await pool.connect(db => MemberDao.deleteByProjId(db, projects.chair.id));
            const chairMembers = await pool.connect(db =>
                MemberDao.byProjectId(db, projects.chair.id)
            );
            expect(chairMembers).to.deep.include.members([]);
        });

        it('should delete a projects from a user', async () => {
            await pool.connect(db => MemberDao.deleteByUserId(db, users.fatima.id));
            const fatimaMembers = await pool.connect(db => MemberDao.byUserId(db, users.fatima.id));
            expect(fatimaMembers).to.deep.include.members([]);
        });
    });
});
