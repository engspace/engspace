import { CycleState } from '@engspace/core';
import { partBaseDao, partDao, partFamilyDao, partRevisionDao } from '@engspace/server-db';
import {
    cleanTables,
    createPartFamily,
    resetFamilyCounters,
    trackedBy,
} from '@engspace/server-db/dist/test-helpers';
import {
    createPart,
    createPartBase,
    createPartRev,
    createUsersAB,
} from '@engspace/server-db/src/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
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
                designation
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

describe('GraphQL Part - Mutations', function() {
    let users;
    let family;
    before('create res', async function() {
        return pool.transaction(async db => {
            users = await createUsersAB(db);
            family = await createPartFamily(db, { code: 'P' });
        });
    });
    after('delete res', cleanTables(pool, ['part_base', 'part_family', 'user']));

    afterEach(cleanTables(pool, ['part_revision', 'part', 'part_base']));
    afterEach(resetFamilyCounters(pool));

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
                designation: 'SOME NEW PART',
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
                    await partBaseDao.rowCount(db),
                    await partDao.rowCount(db),
                    await partRevisionDao.rowCount(db),
                    (await partFamilyDao.byId(db, family.id)).counter,
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
                partBase = await createPartBase(db, family, users.a, 'P001', {
                    designation: 'SOME EXISTING PART',
                });
                part = await createPart(db, partBase, users.a, 'P001.01');
                partRev = await createPartRev(db, part, users.a);
                await partFamilyDao.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(cleanTables(pool, ['part_revision', 'part', 'part_base']));
        this.afterEach(resetFamilyCounters(pool));

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
                designation: 'SOME EXISTING PART',
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
                designation: 'SOME EXISTING PART',
                ...trackedBy(users.a),
                family: { id: family.id },
            });
        });

        it('should create a fork of a part with next version', async function() {
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
                designation: 'SOME EXISTING PART',
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
});
