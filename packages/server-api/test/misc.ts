import { cleanTable, transacUsersAB } from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { signJwt, verifyJwt } from '../src/crypto';
import { permsAuth } from './auth';

describe('Miscellaneous', function() {
    let users;
    before('Create users', async function() {
        users = await transacUsersAB(pool);
    });

    after('Delete users', cleanTable(pool, 'user'));

    describe('Crypto', function() {
        it('should verify a valid token', async function() {
            const tokStr = await signJwt(
                {
                    a: 'a',
                    b: 'b',
                },
                'secret',
                {}
            );
            const obj = await verifyJwt(tokStr, 'secret');
            expect(obj).to.deep.include({
                a: 'a',
                b: 'b',
            });
        });
        it('should fail to verify with wrong secret', async function() {
            const tokStr = await signJwt(
                {
                    a: 'a',
                    b: 'b',
                },
                'secret',
                {}
            );
            const fail = verifyJwt(tokStr, 'wrong secret');
            await expect(fail).to.be.rejectedWith('invalid signature');
        });

        it('should fail to sign with secret empty', async function() {
            const fail = signJwt({ a: 'a', b: 'b' }, '', {});
            await expect(fail).to.be.rejectedWith('secret');
        });
    });

    describe('GraphQL DateTime', function() {
        const iso = '2020-01-01T12:00:00.000Z';
        const ms = 1577880000000;

        it('reads graphql DateTime from Value', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
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
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
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
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
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
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
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
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
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
