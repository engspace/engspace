import { prepareUsers } from '@engspace/demo-data';
import chai from 'chai';
import gql from 'graphql-tag';
import { sql } from 'slonik';
import { buildGqlServer, pool } from '.';
import { createAuth } from './auth';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.connect(async db => db.query(sql`DELETE FROM "user"`));
}

describe('GraphQL User', () => {
    describe('Create', () => {
        const users = prepareUsers();

        afterEach(deleteAll);

        it('should create user', async () => {
            const result = await pool.connect(async db => {
                const auth = await createAuth(db, users.gerard); // admin
                const { mutate } = buildGqlServer(db, auth);
                return mutate({
                    mutation: gql`
                        mutation CreateUser($user: UserInput!) {
                            userCreate(user: $user) {
                                id
                                name
                                email
                                fullName
                                roles
                            }
                        }
                    `,
                    variables: {
                        user: users.tania,
                    },
                });
            });
            expect(result.data.userCreate).to.deep.include(users.tania);
        });
    });
});
