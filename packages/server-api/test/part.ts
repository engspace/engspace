import gql from 'graphql-tag';
import { pool, buildGqlServer } from '.';
import { expect } from 'chai';
import { permsAuth } from './auth';
import {
    createUser,
    createPartFamily,
    createPartBase,
    cleanTables,
    createPart,
    cleanTable,
} from '@engspace/server-db/dist/test-helpers';
import { dedentBlockStringValue } from 'graphql/language/blockString';

const PART_FIELDS = gql`
    fragment PartFields on Part {
        id
        base {
            id
        }
        ref
        designation
        createdBy {
            id
        }
        createdAt
        updatedBy {
            id
        }
        updatedAt
    }
`;

const PART_READ = gql`
    query ReadPart($id: ID!) {
        part(id: $id) {
            ...PartFields
        }
    }
    ${PART_FIELDS}
`;

const PART_CREATE = gql`
    mutation CreatePart($input: PartInput!) {
        partCreate(input: $input) {
            ...PartFields
        }
    }
    ${PART_FIELDS}
`;

const PART_UPDATE = gql`
    mutation UpdatePart($id: ID!, $input: PartUpdateInput!) {
        partUpdate(id: $id, input: $input) {
            ...PartFields
        }
    }
    ${PART_FIELDS}
`;

describe('GraphQL Part', function() {
    let userA;
    let family;
    let partBase;
    before('create res', async function() {
        return pool.transaction(async db => {
            userA = await createUser(db, {
                name: 'user.a',
            });
            family = await createPartFamily(db);
            partBase = await createPartBase(db, family, userA, 'P001', { designation: 'Part 1' });
        });
    });

    after('delete res', cleanTables(pool, ['part_base', 'part_family', 'user']));
    describe('Query', function() {
        let part;
        let bef, aft;
        beforeEach('create part', async function() {
            bef = Date.now();
            part = await pool.transaction(async db => {
                return createPart(db, partBase, userA, 'P001.01');
            });
            aft = Date.now();
        });
        afterEach('delete part', cleanTable(pool, 'part'));

        it('should query a Part', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(userA, ['part.read', 'user.read']));
                return query({
                    query: PART_READ,
                    variables: {
                        id: part.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.part).to.deep.include({
                id: part.id,
                base: { id: partBase.id },
                ref: 'P001.01',
                createdBy: { id: userA.id },
                updatedBy: { id: userA.id },
            });
            expect(data.part.createdAt)
                .to.be.gt(bef)
                .and.lt(aft);
            expect(data.part.updatedAt).to.equal(data.part.createdAt);
        });

        it('should not query a Part without "part.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(userA, ['user.read']));
                return query({
                    query: PART_READ,
                    variables: {
                        id: part.id,
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.read');
            expect(data.part).to.be.null;
        });
    });

    describe('Mutation', function() {
        afterEach(cleanTable(pool, 'part'));
        it('should create a Part', async function() {
            const bef = Date.now();
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(userA, ['part.create', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_CREATE,
                    variables: {
                        input: {
                            baseId: partBase.id,
                            version: '01',
                        },
                    },
                });
            });
            const aft = Date.now();
            expect(errors).to.be.undefined;
            expect(data.partCreate).to.deep.include({
                base: { id: partBase.id },
                ref: 'P001.01',
                designation: 'Part 1',
                createdBy: { id: userA.id },
                updatedBy: { id: userA.id },
            });
            expect(data.partCreate.createdAt)
                .to.be.gt(bef)
                .and.lt(aft);
            expect(data.partCreate.updatedAt).to.equal(data.partCreate.createdAt);
        });

        it('should not create a Part without "part.create"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(db, permsAuth(userA, ['part.read', 'user.read']));
                return mutate({
                    mutation: PART_CREATE,
                    variables: {
                        input: {
                            baseId: partBase.id,
                            version: '01',
                        },
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.create');
            expect(data).to.be.null;
        });

        it('should create a Part with designation override', async function() {
            const bef = Date.now();
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(userA, ['part.create', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_CREATE,
                    variables: {
                        input: {
                            baseId: partBase.id,
                            designation: 'Designation override',
                            version: '01',
                        },
                    },
                });
            });
            const aft = Date.now();
            expect(errors).to.be.undefined;
            expect(data.partCreate).to.deep.include({
                base: { id: partBase.id },
                ref: 'P001.01',
                designation: 'Designation override',
                createdBy: { id: userA.id },
                updatedBy: { id: userA.id },
            });
            expect(data.partCreate.createdAt)
                .to.be.gt(bef)
                .and.lt(aft);
            expect(data.partCreate.updatedAt).to.equal(data.partCreate.createdAt);
        });

        describe('Update', function() {
            let part;
            let userB;
            beforeEach('create part', async function() {
                return pool.transaction(async db => {
                    part = await createPart(db, partBase, userA, 'P001.01');
                    userB = await createUser(db, {
                        name: 'user.b',
                    });
                });
            });

            it('should update a Part', async function() {
                const bef2 = Date.now();
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(userB, ['part.update', 'part.read', 'user.read'])
                    );
                    return mutate({
                        mutation: PART_UPDATE,
                        variables: {
                            id: part.id,
                            input: {
                                designation: 'New designation',
                            },
                        },
                    });
                });
                const aft2 = Date.now();
                expect(errors).to.be.undefined;
                expect(data.partUpdate).to.deep.include({
                    base: { id: partBase.id },
                    ref: 'P001.01',
                    designation: 'New designation',
                    createdBy: { id: userA.id },
                    createdAt: part.createdAt,
                    updatedBy: { id: userB.id },
                });
                expect(data.partUpdate.updatedAt)
                    .to.be.gt(bef2)
                    .and.lt(aft2);
            });
        });
    });
});
