import { UserInput } from '@engspace/core';
import { userDao } from '@engspace/server-db';
import {
    cleanTable,
    transacUser,
    transacUsers,
    transacUsersAB,
} from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';

export const USER_FIELDS = gql`
    fragment UserFields on User {
        id
        name
        email
        fullName
    }
`;

const USER_READ = gql`
    query ReadUser($id: ID!) {
        user(id: $id) {
            ...UserFields
            roles
        }
    }
    ${USER_FIELDS}
`;

describe('GraphQL User', () => {
    describe('Query', () => {
        let users;

        before('Create users', async () => {
            users = await transacUsers(pool, {
                dupond: { name: 'dupond', roles: ['role1'] },
                dupont: { name: 'dupont', roles: ['role1', 'role2'] },
                haddock: { name: 'haddock', roles: ['role1', 'role2', 'role3'] },
            });
        });

        after(cleanTable(pool, 'user'));

        it('should read a user with "user.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.dupond, ['user.read']));
                return query({
                    query: USER_READ,
                    variables: { id: users.dupont.id },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.user).to.deep.include(users.dupont);
        });

        it('should not read a user without "user.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.dupond, []));
                return query({
                    query: USER_READ,
                    variables: { id: users.dupont.id },
                });
            });
            expect(result.errors).to.be.an('array');
            expect(result.data).to.be.an('object');
            expect(result.data.user).to.be.null;
        });

        it('should read a user by name', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.haddock, ['user.read']));
                return query({
                    query: gql`
                        query ReadUserByName($name: String!) {
                            userByName(name: $name) {
                                ...UserFields
                                roles
                            }
                        }
                        ${USER_FIELDS}
                    `,
                    variables: { name: 'dupont' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.userByName).to.deep.include(users.dupont);
        });

        it('should read a user by email', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.haddock, ['user.read']));
                return query({
                    query: gql`
                        query ReadUserByEmail($email: String!) {
                            userByEmail(email: $email) {
                                ...UserFields
                                roles
                            }
                        }
                        ${USER_FIELDS}
                    `,
                    variables: { email: 'dupont@engspace.net' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.userByEmail).to.deep.include(users.dupont);
        });

        it('should search all users', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.haddock, ['user.read']));
                return query({
                    query: gql`
                        query SearchAllUsers {
                            userSearch {
                                count
                                users {
                                    ...UserFields
                                    roles
                                }
                            }
                        }
                        ${USER_FIELDS}
                    `,
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.userSearch).to.deep.include({
                count: 3,
            });
            expect(result.data.userSearch.users).to.have.deep.members([
                users.dupond,
                users.dupont,
                users.haddock,
            ]);
        });
    });

    describe('Mutate', () => {
        describe('Create', () => {
            let userA;
            beforeEach('create user', async function() {
                userA = transacUser(pool, { name: 'a' });
            });
            afterEach(cleanTable(pool, 'user'));

            it('should create user with "user.create"', async () => {
                const result = await pool.transaction(async db => {
                    const auth = await permsAuth(userA, ['user.create', 'user.read']);
                    const { mutate } = buildGqlServer(db, auth);
                    return mutate({
                        mutation: gql`
                            mutation CreateUser($user: UserInput!) {
                                userCreate(user: $user) {
                                    ...UserFields
                                    roles
                                }
                            }
                            ${USER_FIELDS}
                        `,
                        variables: {
                            user: {
                                name: 'b',
                                email: 'b@b.net',
                                fullName: 'User B',
                                roles: ['role1', 'role2'],
                            },
                        },
                    });
                });
                expect(result.errors).to.be.undefined;
                expect(result.data).to.be.an('object');
                expect(result.data.userCreate).to.deep.include({
                    name: 'b',
                    email: 'b@b.net',
                    fullName: 'User B',
                    roles: ['role1', 'role2'],
                });
                expect(result.data.userCreate.id).to.be.uuid();
            });

            it('should reject create user without "user.create"', async () => {
                const result = await pool.transaction(async db => {
                    const auth = await permsAuth(userA, ['user.read']);
                    const { mutate } = buildGqlServer(db, auth);
                    return mutate({
                        mutation: gql`
                            mutation CreateUser($user: UserInput!) {
                                userCreate(user: $user) {
                                    ...UserFields
                                    roles
                                }
                            }
                            ${USER_FIELDS}
                        `,
                        variables: {
                            user: {
                                name: 'b',
                                email: 'b@b.net',
                                fullName: 'User B',
                                roles: ['role1', 'role2'],
                            },
                        },
                    });
                });
                expect(result.errors)
                    .to.be.an('array')
                    .with.lengthOf.at.least(1);
                expect(result.errors[0].message).to.contain('user.create');
                expect(result.data).to.be.null;
            });

            it('should reject create user with invalid email', async () => {
                const result = await pool.transaction(async db => {
                    const auth = await permsAuth(userA, ['user.create', 'user.read']);
                    const { mutate } = buildGqlServer(db, auth);
                    return mutate({
                        mutation: gql`
                            mutation CreateUser($user: UserInput!) {
                                userCreate(user: $user) {
                                    ...UserFields
                                    roles
                                }
                            }
                            ${USER_FIELDS}
                        `,
                        variables: {
                            user: {
                                name: 'b',
                                email: 'not_a_mail.net',
                                fullName: 'User B',
                                roles: ['role1', 'role2'],
                            },
                        },
                    });
                });
                expect(result.errors).to.be.an('array').not.empty;
                expect(result.errors[0].message).to.contain('not_a_mail.net');
                expect(result.data).to.be.null;
            });
        });

        describe('Update', () => {
            let users;

            beforeEach('Create users', async () => {
                users = await transacUsersAB(pool);
            });

            afterEach(cleanTable(pool, 'user'));

            const bob: UserInput = {
                name: 'bob',
                email: 'bob@engspace.test',
                fullName: 'Bob le bricoleur',
                roles: ['manager'],
            };

            it('should update user with "user.update"', async () => {
                const result = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['user.update', 'user.read'])
                    );
                    return mutate({
                        mutation: gql`
                            mutation UpdateUser($id: ID!, $user: UserInput!) {
                                userUpdate(id: $id, user: $user) {
                                    ...UserFields
                                    roles
                                }
                            }
                            ${USER_FIELDS}
                        `,
                        variables: {
                            id: users.b.id,
                            user: bob,
                        },
                    });
                });
                expect(result.errors).to.be.undefined;
                expect(result.data).to.be.an('object');
                expect(result.data.userUpdate).to.deep.include({
                    ...bob,
                    id: users.b.id,
                });
            });

            it('should reject update user without "user.update"', async () => {
                const result = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, permsAuth(users.a, []));
                    return mutate({
                        mutation: gql`
                            mutation UpdateUser($id: ID!, $user: UserInput!) {
                                userUpdate(id: $id, user: $user) {
                                    ...UserFields
                                    roles
                                }
                            }
                            ${USER_FIELDS}
                        `,
                        variables: {
                            id: users.b.id,
                            user: bob,
                        },
                    });
                });
                expect(result.errors).to.be.an('array');
                expect(result.data).to.be.null;
            });

            it('should self-update user', async () => {
                const result = await pool.transaction(async db => {
                    await userDao.updateRoles(db, users.a.id, ['manager']);
                    const { mutate } = buildGqlServer(db, permsAuth(users.a, ['user.read']));
                    return mutate({
                        mutation: gql`
                            mutation UpdateUser($id: ID!, $user: UserInput!) {
                                userUpdate(id: $id, user: $user) {
                                    ...UserFields
                                    roles
                                }
                            }
                            ${USER_FIELDS}
                        `,
                        variables: {
                            id: users.a.id,
                            user: bob,
                        },
                    });
                });
                expect(result.errors).to.be.undefined;
                expect(result.data).to.be.an('object');
                expect(result.data.userUpdate).to.deep.include({
                    ...bob,
                    id: users.a.id,
                });
            });

            it('should not self-update user with role change', async () => {
                const result = await pool.transaction(async db => {
                    await userDao.updateRoles(db, users.a.id, ['user']);
                    const { mutate } = buildGqlServer(db, permsAuth(users.a, ['user.read']));
                    return mutate({
                        mutation: gql`
                            mutation UpdateUser($id: ID!, $user: UserInput!) {
                                userUpdate(id: $id, user: $user) {
                                    ...UserFields
                                    roles
                                }
                            }
                            ${USER_FIELDS}
                        `,
                        variables: {
                            id: users.a.id,
                            user: bob, // self promotion to manager
                        },
                    });
                });
                expect(result.errors).to.be.an('array').not.empty;
                expect(result.errors[0].message).to.contain('user.update');
                expect(result.data).to.be.null;
            });
        });
    });
});
