import { prepareUsers, createUsers, DemoUserSet } from '@engspace/demo-data';
import chai from 'chai';
import gql from 'graphql-tag';
import { sql } from 'slonik';
import { buildGqlServer, pool } from '.';
import { createAuth, auth } from './auth';
import { User, UserInput } from '@engspace/core';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.transaction(async db => db.query(sql`DELETE FROM "user"`));
}

export const USER_FIELDS = gql`
    fragment UserFields on User {
        id
        name
        email
        fullName
    }
`;

describe('GraphQL User', () => {
    const users = prepareUsers();

    describe('Query', () => {
        let dbUsers: DemoUserSet;
        let dbUserArr: User[];

        before('Create users', async () => {
            dbUsers = await pool.transaction(async db => createUsers(db, users));
            dbUserArr = Object.entries(dbUsers).map(kv => kv[1]);
        });

        after(deleteAll);

        it('should get a user', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(dbUsers.tania));
                return query({
                    query: gql`
                        query GetUser($id: ID!) {
                            user(id: $id) {
                                ...UserFields
                                roles
                            }
                        }
                        ${USER_FIELDS}
                    `,
                    variables: { id: dbUsers.alphonse.id },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.not.be.null;
            expect(result.data.user).to.deep.include(users.alphonse);
        });

        it('should get a user by name', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(dbUsers.tania));
                return query({
                    query: gql`
                        query GetUserByName($name: String!) {
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
            expect(result.data).to.not.be.null;
            expect(result.data.userByName).to.deep.include(users.alphonse);
        });

        it('should get a user by email', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(dbUsers.tania));
                return query({
                    query: gql`
                        query GetUserByEmail($email: String!) {
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
            expect(result.data).to.not.be.null;
            expect(result.data.userByEmail).to.deep.include(users.alphonse);
        });

        it('should search all users', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(dbUsers.tania));
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
            expect(result.data).to.not.be.null;
            expect(result.data.userSearch).to.eql({
                count: 10,
                users: dbUserArr,
            });
        });
    });

    describe('Mutate', () => {
        describe('Create', () => {
            afterEach(deleteAll);

            it('should create user with admin', async () => {
                const result = await pool.transaction(async db => {
                    const auth = await createAuth(db, users.gerard); // admin
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
                            user: users.tania,
                        },
                    });
                });
                expect(result.errors).to.be.undefined;
                expect(result.data).to.not.be.null;
                expect(result.data.userCreate).to.deep.include(users.tania);
            });

            it('should reject create user without admin', async () => {
                const result = await pool.transaction(async db => {
                    const auth = await createAuth(db, users.tania); // user
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
                            user: users.alphonse,
                        },
                    });
                });
                expect(result.errors).to.have.length;
                expect(result.data).to.be.null;
            });
        });

        describe('Update', () => {
            let dbUsers: DemoUserSet;

            beforeEach('Create users', async () => {
                dbUsers = await pool.transaction(async db => createUsers(db, users));
            });

            afterEach(deleteAll);

            const bob: UserInput = {
                name: 'bob',
                email: 'bob@engspace.test',
                fullName: 'Bob le bricoleur',
                roles: ['Manager'],
            };

            it('should update user with admin role', async () => {
                const result = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, auth(dbUsers.gerard)); // admin
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
                            id: dbUsers.alphonse.id,
                            user: bob,
                        },
                    });
                });
                expect(result.errors).to.be.undefined;
                expect(result.data).to.not.be.null;
                expect(result.data.userUpdate).to.deep.include({
                    ...bob,
                    id: dbUsers.alphonse.id,
                });
            });

            it('should reject update user without admin role', async () => {
                const result = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, auth(dbUsers.tania)); // admin
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
                            id: dbUsers.alphonse.id,
                            user: bob,
                        },
                    });
                });
                expect(result.errors).to.have.length;
                expect(result.data).to.be.null;
            });
        });
    });
});
