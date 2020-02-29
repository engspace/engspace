import { prepareUsers } from '@engspace/demo-data-input';
import { userDao } from '@engspace/server-db';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { auth } from './auth';
import { createUsers } from './user';

describe('Miscellaneous', function() {
    let users;
    before('Create users', async function() {
        return pool.transaction(async db => {
            users = await createUsers(db, prepareUsers());
        });
    });

    after('Delete users', async function() {
        return pool.transaction(async db => {
            await userDao.deleteAll(db);
        });
    });
    describe('GraphQL DateTime', function() {
        const iso = '2020-01-01T12:00:00.000Z';
        const ms = 1577880000000;

        it('reads graphql DateTime from Value', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.sophie));
                return query({
                    query: gql`
                        query TestDateTimeVal($val: DateTime!) {
                            testDateTimeToIso8601(dt: $val)
                        }
                    `,
                    variables: {
                        val: ms,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.testDateTimeToIso8601).to.be.a('string');
            expect(data.testDateTimeToIso8601).to.equal(iso);
        });

        it('reads graphql DateTime from Int Literal', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.sophie));
                return query({
                    query: gql`
                        query TestDateTimeLit {
                            testDateTimeToIso8601(dt: 1577880000000)
                        }
                    `,
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.testDateTimeToIso8601).to.be.a('string');
            expect(data.testDateTimeToIso8601).to.equal(iso);
        });

        it('reads graphql DateTime from String Literal', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.sophie));
                return query({
                    query: gql`
                        query TestDateTimeLit {
                            testDateTimeToIso8601(dt: "2020-01-01T12:00:00Z")
                        }
                    `,
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.testDateTimeToIso8601).to.be.a('string');
            expect(data.testDateTimeToIso8601).to.equal(iso);
        });

        it('errors if cannot parse datetime string', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.sophie));
                return query({
                    query: gql`
                        query TestDateTimeLit {
                            testDateTimeToIso8601(dt: "not_a_date")
                        }
                    `,
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('not_a_date');
            expect(data).to.be.undefined;
        });

        it('errors if supplying invalid type', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.sophie));
                return query({
                    query: gql`
                        query TestDateTimeLit {
                            testDateTimeToIso8601(dt: true)
                        }
                    `,
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('BooleanValue');
            expect(data).to.be.undefined;
        });
    });
});
