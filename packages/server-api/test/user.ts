import { User, UserInput } from '@engspace/core';
import { DemoUserSet, prepareUsers, DemoUserInputSet } from '@engspace/demo-data-input';
import { userDao, Db } from '@engspace/server-db';
import chai from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { auth, createAuth, permsAuth } from './auth';

const { expect } = chai;

export async function deleteAllUsers(): Promise<void> {
    await pool.transaction(async db => userDao.deleteAll(db));
}

export async function createUsers(db: Db, users: DemoUserInputSet): Promise<DemoUserSet> {
    const keyVals = await Promise.all(
        Object.entries(users).map(async ([name, input]) => [name, await userDao.create(db, input)])
    );
    return Object.fromEntries(keyVals);
}

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
    const usersInput = prepareUsers();

    describe('Query', () => {
        let users: DemoUserSet;
        let userArr: User[];

        before('Create users', async () => {
            users = await pool.transaction(async db => createUsers(db, usersInput));
            userArr = Object.entries(users).map(kv => kv[1]);
        });

        after(deleteAllUsers);

        it('should read a user with "user.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, ['user.read']));
                return query({
                    query: USER_READ,
                    variables: { id: users.alphonse.id },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.user).to.deep.include(usersInput.alphonse);
        });

        it('should not read a user without "user.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, []));
                return query({
                    query: USER_READ,
                    variables: { id: users.alphonse.id },
                });
            });
            expect(result.errors).to.be.an('array');
            expect(result.data).to.be.an('object');
            expect(result.data.user).to.be.null;
        });

        it('should read a user by name', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.tania));
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
                    variables: { name: 'alphonse' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.userByName).to.deep.include(usersInput.alphonse);
        });

        it('should read a user by email', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.tania));
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
                    variables: { email: 'alphonse@engspace.demo' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.userByEmail).to.deep.include(usersInput.alphonse);
        });

        it('should search all users', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.tania));
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
            expect(result.data.userSearch).to.eql({
                count: 10,
                users: userArr,
            });
        });
    });

    describe('Mutate', () => {
        describe('Create', () => {
            afterEach(deleteAllUsers);

            it('should create user with admin', async () => {
                const result = await pool.transaction(async db => {
                    const auth = await createAuth(db, usersInput.gerard); // admin
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
                            user: usersInput.tania,
                        },
                    });
                });
                expect(result.errors).to.be.undefined;
                expect(result.data).to.be.an('object');
                expect(result.data.userCreate).to.deep.include(usersInput.tania);
            });

            it('should reject create user without admin', async () => {
                const result = await pool.transaction(async db => {
                    const auth = await createAuth(db, usersInput.tania); // user
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
                            user: usersInput.alphonse,
                        },
                    });
                });
                expect(result.errors)
                    .to.be.an('array')
                    .with.lengthOf.at.least(1);
                expect(result.data).to.be.null;
            });
        });

        describe('Update', () => {
            let users: DemoUserSet;

            beforeEach('Create users', async () => {
                users = await pool.transaction(async db => createUsers(db, usersInput));
            });

            afterEach(deleteAllUsers);

            const bob: UserInput = {
                name: 'bob',
                email: 'bob@engspace.test',
                fullName: 'Bob le bricoleur',
                roles: ['Manager'],
            };

            it('should update user with admin role', async () => {
                const result = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, auth(users.gerard)); // admin
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
                            id: users.alphonse.id,
                            user: bob,
                        },
                    });
                });
                expect(result.errors).to.be.undefined;
                expect(result.data).to.be.an('object');
                expect(result.data.userUpdate).to.deep.include({
                    ...bob,
                    id: users.alphonse.id,
                });
            });

            it('should reject update user without admin role', async () => {
                const result = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, auth(users.tania)); // admin
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
                            id: users.alphonse.id,
                            user: bob,
                        },
                    });
                });
                expect(result.errors).to.be.an('array');
                expect(result.data).to.be.null;
            });
        });
    });
});
