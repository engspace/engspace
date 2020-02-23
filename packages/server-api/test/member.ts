import { ProjectMember } from '@engspace/core';
import {
    DemoProjectSet,
    DemoUserSet,
    membersInput,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data-input';
import { memberDao, userDao, projectDao } from '@engspace/server-db';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';
import { createProjects } from './project';
import { createUsers } from './user';

async function createMembers(
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

const MEMBER_FIELDS = gql`
    fragment MemberFields on ProjectMember {
        id
        roles
        user {
            id
        }
        project {
            id
        }
    }
`;

const MEMBER_READ = gql`
    query ReadMember($id: ID!) {
        projectMember(id: $id) {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

const MEMBER_READ_BYPROJUSER = gql`
    query ReadMemberByProjectAndUser($projectId: ID!, $userId: ID!) {
        projectMemberByProjectAndUserId(projectId: $projectId, userId: $userId) {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

const MEMBER_READ_BYPROJ = gql`
    query ReadProjectMembers($projectId: ID!) {
        project(id: $projectId) {
            members {
                ...MemberFields
            }
        }
    }
    ${MEMBER_FIELDS}
`;

const MEMBER_READ_BYUSER = gql`
    query ReadUserMembership($userId: ID!) {
        user(id: $userId) {
            membership {
                ...MemberFields
            }
        }
    }
    ${MEMBER_FIELDS}
`;

describe('GraphQL members', function() {
    const usersInput = prepareUsers();
    const projectsInput = prepareProjects();

    describe('Query', function() {
        let projects;
        let users;
        let members;

        before('Create users, projects and members', async function() {
            return pool.transaction(async db => {
                users = await createUsers(db, usersInput);
                projects = await createProjects(db, projectsInput);
                members = await createMembers(
                    db,
                    Promise.resolve(projects),
                    Promise.resolve(users)
                );
            });
        });

        after('Delete users, projects and members', async function() {
            return pool.transaction(async db => {
                await memberDao.deleteAll(db);
                await projectDao.deleteAll(db);
                await userDao.deleteAll(db);
            });
        });

        it('should read a single member with "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ,
                    variables: { id: members[0].id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.projectMember).to.eql(members[0]);
        });

        it('should not read a single member without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ,
                    variables: { id: members[0].id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(data.projectMember).to.be.null;
        });

        it('should read by user and project with "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJUSER,
                    variables: { projectId: projects.desk.id, userId: users.alphonse.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.projectMemberByProjectAndUserId).to.be.an('object');
            const m = data.projectMemberByProjectAndUserId;
            expect(m.id).to.be.uuid();
            expect(m).to.deep.include({
                project: { id: projects.desk.id },
                user: { id: users.alphonse.id },
            });
            expect(m.roles).to.have.members(['leader', 'designer']);
        });

        it('should not read by user and project without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJUSER,
                    variables: { projectId: projects.desk.id, userId: users.alphonse.id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(data.projectMemberByProjectAndUserId).to.be.null;
        });

        it('should read project members with "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJ,
                    variables: { projectId: projects.desk.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.project).to.be.an('object');
            const p = data.project;
            expect(p.members).to.be.an('array');
            const deskMembers = members.filter(m => m.project.id === projects.desk.id);
            for (const dm of deskMembers) {
                if (!dm.roles) {
                    dm.roles = [];
                }
            }
            expect(p.members).to.have.deep.members(deskMembers);
        });

        it('should not read project members without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJ,
                    variables: { projectId: projects.desk.id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(data.project).to.be.null;
        });

        it('should read user membership with "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYUSER,
                    variables: { userId: users.alphonse.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.user).to.be.an('object');
            const u = data.user;
            expect(u.membership).to.be.an('array');
            const alphonseMembership = members.filter(m => m.user.id === users.alphonse.id);
            for (const am of alphonseMembership) {
                if (!am.roles) {
                    am.roles = [];
                }
            }
            expect(u.membership).to.have.deep.members(alphonseMembership);
        });

        it('should not read user membership without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYUSER,
                    variables: { userId: users.alphonse.id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(data.user).to.be.null;
        });
    });
});
