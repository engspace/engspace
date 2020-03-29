import { CycleState } from '@engspace/core';
import { trackedBy } from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, dao, pool, th } from '.';
import { permsAuth } from './auth';
import { TRACKED_FIELDS } from './helpers';

const PARTREV_DEEPFIELDS = gql`
    fragment PartRevDeepFields on PartRevision {
        id
        revision
        cycleState
        designation
        ...TrackedFields
        part {
            id
            designation
            ref
            ...TrackedFields
            base {
                id
                baseRef
                family {
                    id
                }
                ...TrackedFields
            }
        }
    }
    ${TRACKED_FIELDS}
`;

const PART_CREATENEW = gql`
    mutation CreateNewPart($input: PartCreateNewInput!) {
        partCreateNew(input: $input) {
            ...PartRevDeepFields
        }
    }
    ${PARTREV_DEEPFIELDS}
`;

const PART_FORK = gql`
    mutation ForkPart($input: PartForkInput!) {
        partFork(input: $input) {
            ...PartRevDeepFields
        }
    }
    ${PARTREV_DEEPFIELDS}
`;

const PART_REVISE = gql`
    mutation RevisePart($input: PartRevisionInput!) {
        partRevise(input: $input) {
            ...PartRevDeepFields
        }
    }
    ${PARTREV_DEEPFIELDS}
`;

const PART_UPDATE = gql`
    mutation UpdatePart($id: ID!, $input: PartUpdateInput!) {
        partUpdate(id: $id, input: $input) {
            id
            base {
                id
            }
            ref
            designation
            ...TrackedFields
        }
    }
    ${TRACKED_FIELDS}
`;

describe('GraphQL Part - Mutations', function() {
    let users;
    let family;
    before('create res', async function() {
        return pool.transaction(async db => {
            users = await th.createUsersAB(db);
            family = await th.createPartFamily(db, { code: 'P' });
        });
    });
    after('delete res', th.cleanTables(['part_base', 'part_family', 'user']));

    afterEach(th.cleanTables(['part_revision', 'part', 'part_base']));
    afterEach(th.resetFamilyCounters());

    describe('partCreateNew', function() {
        it('should create a new Part', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_CREATENEW,
                    variables: {
                        input: {
                            familyId: family.id,
                            initialVersion: '01',
                            designation: 'SOME NEW PART',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partCreateNew).to.deep.include({
                revision: 1,
                designation: 'SOME NEW PART',
                cycleState: CycleState.Edition,
                ...trackedBy(users.a),
            });
            expect(data.partCreateNew.part).to.deep.include({
                ref: 'P001.01',
                designation: 'SOME NEW PART',
                ...trackedBy(users.a),
            });
            expect(data.partCreateNew.part.base).to.deep.include({
                baseRef: 'P001',
                ...trackedBy(users.a),
                family: { id: family.id },
            });
        });

        it('should not create a new Part without "part.create"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_CREATENEW,
                    variables: {
                        input: {
                            familyId: family.id,
                            initialVersion: '01',
                            designation: 'SOME NEW PART',
                        },
                    },
                });
            });
            expect(errors).to.be.not.empty;
            expect(errors[0].message).to.contain('part.create');
            expect(data).to.be.null;
            const counts = await pool.transaction(async db => {
                return [
                    await dao.partBase.rowCount(db),
                    await dao.part.rowCount(db),
                    await dao.partRevision.rowCount(db),
                    (await dao.partFamily.byId(db, family.id)).counter,
                ];
            });
            expect(counts).to.eql([0, 0, 0, 0]);
        });
    });

    describe('partFork', function() {
        let partBase;
        let part;
        let partRev;
        beforeEach(function() {
            return pool.transaction(async db => {
                partBase = await th.createPartBase(db, family, users.a, 'P001');
                part = await th.createPart(db, partBase, users.a, 'P001.01', {
                    designation: 'SOME EXISTING PART',
                });
                partRev = await th.createPartRev(db, part, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(th.cleanTables(['part_revision', 'part', 'part_base']));
        this.afterEach(th.resetFamilyCounters());

        it('should create a fork of a part', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_FORK,
                    variables: {
                        input: {
                            partId: part.id,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;

            expect(data.partFork).to.deep.include({
                revision: 1,
                designation: 'SOME EXISTING PART',
                cycleState: CycleState.Edition,
                ...trackedBy(users.b),
            });
            expect(data.partFork.id).to.be.uuid();
            expect(data.partFork.id).to.not.equal(partRev.id);
            expect(data.partFork.part).to.deep.include({
                ref: 'P001.02',
                designation: 'SOME EXISTING PART',
                ...trackedBy(users.b),
            });
            expect(data.partFork.part.id).to.be.uuid();
            expect(data.partFork.part.id).to.not.equal(part.id);
            expect(data.partFork.part.base).to.deep.include({
                id: partBase.id,
                baseRef: 'P001',
                ...trackedBy(users.a),
                family: { id: family.id },
            });
        });

        it('should create a fork of a part with new designation', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_FORK,
                    variables: {
                        input: {
                            partId: part.id,
                            designation: 'NEW EXISTING PART',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;

            expect(data.partFork).to.deep.include({
                revision: 1,
                designation: 'NEW EXISTING PART',
                cycleState: CycleState.Edition,
                ...trackedBy(users.b),
            });
            expect(data.partFork.id).to.be.uuid();
            expect(data.partFork.id).to.not.equal(partRev.id);
            expect(data.partFork.part).to.deep.include({
                ref: 'P001.02',
                designation: 'NEW EXISTING PART',
                ...trackedBy(users.b),
            });
            expect(data.partFork.part.id).to.be.uuid();
            expect(data.partFork.part.id).to.not.equal(part.id);
            expect(data.partFork.part.base).to.deep.include({
                id: partBase.id,
                baseRef: 'P001',
                ...trackedBy(users.a),
                family: { id: family.id },
            });
        });

        it('should create a fork of a part with specified version', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_FORK,
                    variables: {
                        input: {
                            partId: part.id,
                            version: '52',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;

            expect(data.partFork).to.deep.include({
                revision: 1,
                designation: 'SOME EXISTING PART',
                cycleState: CycleState.Edition,
                ...trackedBy(users.b),
            });
            expect(data.partFork.id).to.be.uuid();
            expect(data.partFork.id).to.not.equal(partRev.id);
            expect(data.partFork.part).to.deep.include({
                ref: 'P001.52',
                designation: 'SOME EXISTING PART',
                ...trackedBy(users.b),
            });
            expect(data.partFork.part.id).to.be.uuid();
            expect(data.partFork.part.id).to.not.equal(part.id);
            expect(data.partFork.part.base).to.deep.include({
                id: partBase.id,
                baseRef: 'P001',
                ...trackedBy(users.a),
                family: { id: family.id },
            });
        });

        it('should not create a fork without "part.create"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_FORK,
                    variables: {
                        input: {
                            partId: part.id,
                        },
                    },
                });
            });
            expect(errors).to.be.not.empty;
            expect(errors[0].message).to.contain('part.create');

            expect(data).to.be.null;
        });
    });

    describe('partRevise', function() {
        let partBase;
        let part;
        let partRev;
        beforeEach(function() {
            return pool.transaction(async db => {
                partBase = await th.createPartBase(db, family, users.a, 'P001');
                part = await th.createPart(db, partBase, users.a, 'P001.01', {
                    designation: 'SOME EXISTING PART',
                });
                partRev = await th.createPartRev(db, part, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(th.cleanTables(['part_revision', 'part', 'part_base']));
        this.afterEach(th.resetFamilyCounters());

        it('should revise a part', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_REVISE,
                    variables: {
                        input: {
                            partId: part.id,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;

            expect(data.partRevise).to.deep.include({
                revision: 2,
                designation: 'SOME EXISTING PART',
                cycleState: CycleState.Edition,
                ...trackedBy(users.b),
            });
            expect(data.partRevise.id).to.be.uuid();
            expect(data.partRevise.id).to.not.equal(partRev.id);
            expect(data.partRevise.part).to.deep.include({
                id: part.id,
                ref: 'P001.01',
                designation: 'SOME EXISTING PART',
                ...trackedBy(users.a),
            });
            expect(data.partRevise.part.base).to.deep.include({
                id: partBase.id,
                baseRef: 'P001',
                ...trackedBy(users.a),
                family: { id: family.id },
            });
        });

        it('should revise a part with specific designation', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_REVISE,
                    variables: {
                        input: {
                            partId: part.id,
                            designation: 'NEW EXISTING PART',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;

            expect(data.partRevise).to.deep.include({
                revision: 2,
                designation: 'NEW EXISTING PART',
                cycleState: CycleState.Edition,
                ...trackedBy(users.b),
            });
            expect(data.partRevise.id).to.be.uuid();
            expect(data.partRevise.id).to.not.equal(partRev.id);
            expect(data.partRevise.part).to.deep.include({
                id: part.id,
                ref: 'P001.01',
                designation: 'SOME EXISTING PART',
                ...trackedBy(users.a),
            });
            expect(data.partRevise.part.base).to.deep.include({
                id: partBase.id,
                baseRef: 'P001',
                ...trackedBy(users.a),
                family: { id: family.id },
            });
        });

        it('should not revise a part without "part.create"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_REVISE,
                    variables: {
                        input: {
                            partId: part.id,
                        },
                    },
                });
            });
            expect(errors).to.be.not.empty;
            expect(errors[0].message).to.contain('part.create');

            expect(data).to.be.null;
        });
    });

    describe('partUpdate', function() {
        let partBase;
        let part;
        beforeEach(function() {
            return pool.transaction(async db => {
                partBase = await th.createPartBase(db, family, users.a, 'P001');
                part = await th.createPart(db, partBase, users.a, 'P001.01', {
                    designation: 'SOME EXISTING PART',
                });
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(th.cleanTables(['part', 'part_base']));
        this.afterEach(th.resetFamilyCounters());

        it('should update a Part', async function() {
            const bef2 = Date.now();
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.update', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_UPDATE,
                    variables: {
                        id: part.id,
                        input: {
                            designation: 'NEW DESIGNATION',
                        },
                    },
                });
            });
            const aft2 = Date.now();
            expect(errors).to.be.undefined;
            expect(data.partUpdate).to.deep.include({
                base: { id: partBase.id },
                ref: 'P001.01',
                designation: 'NEW DESIGNATION',
                ...trackedBy(users.a, users.b),
                createdAt: part.createdAt,
            });
            expect(data.partUpdate.updatedAt)
                .to.be.gt(bef2)
                .and.lt(aft2);
            expect(data.partUpdate.updatedAt).to.be.gt(data.partUpdate.createdAt);
        });

        it('should not update a Part without "part.update"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_UPDATE,
                    variables: {
                        id: part.id,
                        input: {
                            designation: 'NEW DESIGNATION',
                        },
                    },
                });
            });
            expect(errors).to.be.not.empty;
            expect(errors[0].message).to.contain('part.update');
            expect(data).to.be.null;
        });
    });
});
