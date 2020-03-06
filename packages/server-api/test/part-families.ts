import { createDemoPartFamilies, partFamilyDao } from '@engspace/server-db';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';
import { cleanTable, transacDemoUsers } from './helpers';

const PARTFAM_FIELDS = gql`
    fragment PartFamFields on PartFamily {
        id
        name
        code
    }
`;

const PARTFAM_READ = gql`
    query ReadPartFamily($id: ID!) {
        partFamily(id: $id) {
            ...PartFamFields
        }
    }
    ${PARTFAM_FIELDS}
`;

const PARTFAM_CREATE = gql`
    mutation CreatePartFamily($partFamily: PartFamilyInput!) {
        partFamilyCreate(partFamily: $partFamily) {
            ...PartFamFields
        }
    }
    ${PARTFAM_FIELDS}
`;

const PARTFAM_UPDATE = gql`
    mutation UpdatePartFamily($id: ID!, $partFamily: PartFamilyInput!) {
        partFamilyUpdate(id: $id, partFamily: $partFamily) {
            ...PartFamFields
        }
    }
    ${PARTFAM_FIELDS}
`;

describe('GraphQL PartFamilies', function() {
    let users;
    before('Create users', async function() {
        users = await transacDemoUsers();
    });
    after('Delete users', cleanTable('user'));

    describe('Query', function() {
        let families;
        before('Create part families', async function() {
            families = await pool.transaction(async db => {
                return createDemoPartFamilies(db, {
                    fam1: {
                        name: 'family 1',
                        code: '1',
                    },
                    fam2: {
                        name: 'family 2',
                        code: '2',
                    },
                    fam3: {
                        name: 'family 3',
                        code: '3',
                    },
                });
            });
        });
        after('Delete part families', async function() {
            await pool.transaction(async db => partFamilyDao.deleteAll(db));
        });

        it('should read part families', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.sophie, ['partfamily.read']));
                return query({
                    query: PARTFAM_READ,
                    variables: {
                        id: families.fam2.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.partFamily).to.deep.include({
                name: 'family 2',
                code: '2',
            });
        });

        it('should not read part families without "partfamily.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.sophie, []));
                return query({
                    query: PARTFAM_READ,
                    variables: {
                        id: families.fam2.id,
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('partfamily.read');
            expect(data.partFamily).to.be.null;
        });
    });

    describe('Mutate', function() {
        afterEach('Delete part families', async function() {
            await pool.transaction(async db => partFamilyDao.deleteAll(db));
        });

        it('should create part family', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.sophie, ['partfamily.create', 'partfamily.read'])
                );
                return mutate({
                    mutation: PARTFAM_CREATE,
                    variables: {
                        partFamily: {
                            name: 'pf',
                            code: '111',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partFamilyCreate).to.deep.include({
                name: 'pf',
                code: '111',
            });
            expect(data.partFamilyCreate.id).to.be.uuid();
        });

        it('should not create part family without "partfamily.create"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { mutate } = buildGqlServer(db, permsAuth(users.sophie, ['partfamily.read']));
                return mutate({
                    mutation: PARTFAM_CREATE,
                    variables: {
                        partFamily: {
                            name: 'pf',
                            code: '111',
                        },
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('partfamily.create');
            expect(data).to.be.null;
        });

        it('should update part family', async function() {
            const fam = await pool.transaction(async db => {
                return partFamilyDao.create(db, {
                    name: 'pf',
                    code: '111',
                });
            });
            const { errors, data } = await pool.connect(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.sophie, ['partfamily.update', 'partfamily.read'])
                );
                return mutate({
                    mutation: PARTFAM_UPDATE,
                    variables: {
                        id: fam.id,
                        partFamily: {
                            name: 'pf2',
                            code: '112',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partFamilyUpdate).to.deep.include({
                id: fam.id,
                name: 'pf2',
                code: '112',
            });
        });

        it('should not update part family without "partfamily.update"', async function() {
            const fam = await pool.transaction(async db => {
                return partFamilyDao.create(db, {
                    name: 'pf',
                    code: '111',
                });
            });
            const { errors, data } = await pool.connect(async db => {
                const { mutate } = buildGqlServer(db, permsAuth(users.sophie, ['partfamily.read']));
                return mutate({
                    mutation: PARTFAM_UPDATE,
                    variables: {
                        id: fam.id,
                        partFamily: {
                            name: 'pf2',
                            code: '112',
                        },
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('partfamily.update');
            expect(data).to.be.null;
        });
    });
});
