import { idType } from '@engspace/server-db';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, dao, pool, th } from '.';
import { permsAuth } from './auth';

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
        projectMember(memberId: $id) {
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

const MEMBER_CREATE = gql`
    mutation CreateMember($input: ProjectMemberInput!) {
        projectAddMember(input: $input) {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

const MEMBER_UPDATE = gql`
    mutation UpdateMember($id: ID!, $roles: [String!]!) {
        projectUpdateMemberRoles(memberId: $id, roles: $roles) {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

export const MEMBER_DELETE = gql`
    mutation DeleteMember($id: ID!) {
        projectDeleteMember(memberId: $id) {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

describe('GraphQL ProjectMember', function() {
    let users;
    let projects;
    before('Create users and projects', async function() {
        return pool.transaction(async db => {
            users = await th.createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
            });
            projects = await th.createProjects(db, {
                a: { code: 'a' },
                b: { name: 'b' },
            });
        });
    });

    after('Delete users and projects', async function() {
        return pool.transaction(async db => {
            await dao.project.deleteAll(db);
            await dao.user.deleteAll(db);
        });
    });

    describe('Query', function() {
        let members;

        before('Create members', async function() {
            members = await pool.transaction(async db => {
                return {
                    aa: await th.createMember(db, projects.a, users.a, ['role1']),
                    bb: await th.createMember(db, projects.b, users.b, ['role2']),
                    ab: await th.createMember(db, projects.a, users.b, ['role3', 'role4']),
                    bc: await th.createMember(db, projects.b, users.c, ['role5', 'role6']),
                };
            });
        });

        after('Delete members', async function() {
            return pool.transaction(async db => {
                await dao.projectMember.deleteAll(db);
            });
        });

        it('should read a single member', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ,
                    variables: { id: members.aa.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.projectMember).to.eql(members.aa);
        });

        it('should not read a single member without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ,
                    variables: { id: members.aa.id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(data.projectMember).to.be.null;
        });

        it('should read by user and project', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJUSER,
                    variables: { projectId: projects.a.id, userId: users.b.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.projectMemberByProjectAndUserId).to.be.an('object');
            expect(data.projectMemberByProjectAndUserId).to.deep.include(members.ab);
            expect(data.projectMemberByProjectAndUserId.roles).to.have.members(['role3', 'role4']);
        });

        it('should not read by user and project without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJUSER,
                    variables: { projectId: projects.a.id, userId: users.b.id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(errors[0].message).to.contain('member.read');
            expect(data.projectMemberByProjectAndUserId).to.be.null;
        });

        it('should read project members', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJ,
                    variables: { projectId: projects.b.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.project).to.be.an('object');
            const p = data.project;
            expect(p.members).to.be.an('array');

            expect(p.members).to.include.deep.members([
                {
                    id: members.bb.id,
                    project: { id: projects.b.id },
                    user: { id: users.b.id },
                    roles: ['role2'],
                },
                {
                    id: members.bc.id,
                    project: { id: projects.b.id },
                    user: { id: users.c.id },
                    roles: ['role5', 'role6'],
                },
            ]);
        });

        it('should not read project members without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYPROJ,
                    variables: { projectId: projects.b.id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(data.project).to.be.null;
        });

        it('should read user membership', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['member.read', 'user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYUSER,
                    variables: { userId: users.b.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.user).to.be.an('object');
            const u = data.user;
            expect(u.membership).to.be.an('array');
            expect(u.membership).to.have.deep.members([members.bb, members.ab]);
        });

        it('should not read user membership without "member.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['user.read', 'project.read'])
                );
                return query({
                    query: MEMBER_READ_BYUSER,
                    variables: { userId: users.b.id },
                });
            });
            expect(errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(data.user).to.be.null;
        });
    });

    describe('Mutation', function() {
        afterEach('Delete members', async function() {
            return pool.transaction(async db => {
                await dao.projectMember.deleteAll(db);
            });
        });

        describe('Create', function() {
            it('should create a member', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, [
                            'member.create',
                            'member.read',
                            'project.read',
                            'user.read',
                        ])
                    );
                    return mutate({
                        mutation: MEMBER_CREATE,
                        variables: {
                            input: {
                                projectId: projects.a.id,
                                userId: users.a.id,
                                roles: ['user', 'designer', 'some other role'],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.projectAddMember.id).to.be.a(idType);
                expect(data.projectAddMember).to.deep.include({
                    project: { id: projects.a.id },
                    user: { id: users.a.id },
                });
                expect(data.projectAddMember.roles).to.have.members([
                    'user',
                    'some other role',
                    'designer',
                ]);
            });
            it('should create a member using project perms', async function() {
                // give to c leader role on b project
                await pool.transaction(async db => {
                    return dao.projectMember.create(db, {
                        projectId: projects.b.id,
                        userId: users.c.id,
                        roles: ['leader'],
                    });
                });
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.c, ['member.read', 'project.read', 'user.read'])
                    );
                    return mutate({
                        mutation: MEMBER_CREATE,
                        variables: {
                            input: {
                                projectId: projects.b.id,
                                userId: users.a.id,
                                roles: ['user', 'designer', 'some other role'],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.projectAddMember.id).to.be.a(idType);
                expect(data.projectAddMember).to.deep.include({
                    project: { id: projects.b.id },
                    user: { id: users.a.id },
                });
                expect(data.projectAddMember.roles).to.have.members([
                    'user',
                    'some other role',
                    'designer',
                ]);
            });

            it('should not create a member without "member.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['member.read', 'project.read', 'user.read'])
                    );
                    return mutate({
                        mutation: MEMBER_CREATE,
                        variables: {
                            input: {
                                projectId: projects.a.id,
                                userId: users.b.id,
                                roles: ['user', 'designer', 'some other role'],
                            },
                        },
                    });
                });
                expect(errors)
                    .to.be.an('array')
                    .with.lengthOf.at.least(1);
                expect(errors[0].message).to.contain('member.create');
                expect(data).to.be.null;
            });
        });

        describe('Update', function() {
            it('should update member roles with "member.update"', async function() {
                const { memId, errors, data } = await pool.transaction(async db => {
                    const m = await dao.projectMember.create(db, {
                        projectId: projects.a.id,
                        userId: users.a.id,
                        roles: ['user', 'designer', 'some other role'],
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, [
                            'member.update',
                            'member.read',
                            'project.read',
                            'user.read',
                        ])
                    );
                    const { errors, data } = await mutate({
                        mutation: MEMBER_UPDATE,
                        variables: { id: m.id, roles: ['leader', 'designer'] },
                    });
                    return { memId: m.id, errors, data };
                });
                expect(errors).to.be.undefined;
                expect(data.projectUpdateMemberRoles.id).to.equal(memId);
                expect(data.projectUpdateMemberRoles.roles).to.have.members(['designer', 'leader']);
            });

            it('should not update member roles without "member.update"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const m = await dao.projectMember.create(db, {
                        projectId: projects.a.id,
                        userId: users.a.id,
                        roles: ['user', 'designer', 'some other role'],
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['member.read', 'project.read', 'user.read'])
                    );
                    return await mutate({
                        mutation: MEMBER_UPDATE,
                        variables: { id: m.id, roles: ['leader', 'designer'] },
                    });
                });
                expect(errors)
                    .to.be.an('array')
                    .with.lengthOf.at.least(1);
                expect(data).to.be.null;
            });
        });

        describe('Delete', function() {
            it('should delete a member with "member.delete"', async function() {
                const { mem, errors, data } = await pool.transaction(async db => {
                    const m = await dao.projectMember.create(db, {
                        projectId: projects.a.id,
                        userId: users.a.id,
                        roles: ['user', 'designer', 'some other role'],
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, [
                            'member.delete',
                            'member.read',
                            'project.read',
                            'user.read',
                        ])
                    );
                    const { errors, data } = await mutate({
                        mutation: MEMBER_DELETE,
                        variables: { id: m.id },
                    });
                    return { mem: await dao.projectMember.byId(db, m.id), errors, data };
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.projectDeleteMember).to.be.an('object');
                expect(mem).to.be.null;
            });

            it('should not delete a member without "member.delete"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const m = await dao.projectMember.create(db, {
                        projectId: projects.a.id,
                        userId: users.a.id,
                        roles: ['user', 'designer', 'some other role'],
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['member.read', 'project.read', 'user.read'])
                    );
                    return await mutate({
                        mutation: MEMBER_DELETE,
                        variables: { id: m.id },
                    });
                });
                expect(errors)
                    .to.be.an('array')
                    .with.lengthOf.at.least(1);
                expect(data).to.be.null;
            });
        });
    });
});
