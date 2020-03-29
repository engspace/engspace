import { CycleState, User, ApprovalState } from '@engspace/core';
import { trackedBy, Dict } from '@engspace/server-db/dist/test-helpers';
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

const PARTVAL_DEEPFIELDS = gql`
    fragment PartValDeepFields on PartValidation {
        id
        partRev {
            id
            revision
            cycleState
        }
        approvals {
            id
            assignee {
                id
                name
            }
            state
            comments
            ...TrackedFields
        }
        state
        result
        comments
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

describe('GraphQL Part - Mutations', function() {
    let users: Dict<User>;
    let family;
    before('create res', async function() {
        return pool.transaction(async db => {
            users = await th.createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
                d: { name: 'd' },
                e: { name: 'e' },
            });
            family = await th.createPartFamily(db, { code: 'P' });
        });
    });
    after('delete res', th.cleanTables(['part_base', 'part_family', 'user']));

    afterEach(th.cleanTables(['part_revision', 'part', 'part_base']));
    afterEach(th.resetFamilyCounters());

    describe('partCreateNew', function() {
        const PART_CREATENEW = gql`
            mutation CreateNewPart($input: PartCreateNewInput!) {
                partCreateNew(input: $input) {
                    ...PartRevDeepFields
                }
            }
            ${PARTREV_DEEPFIELDS}
        `;

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
        const PART_FORK = gql`
            mutation ForkPart($input: PartForkInput!) {
                partFork(input: $input) {
                    ...PartRevDeepFields
                }
            }
            ${PARTREV_DEEPFIELDS}
        `;

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
        const PART_REVISE = gql`
            mutation RevisePart($input: PartRevisionInput!) {
                partRevise(input: $input) {
                    ...PartRevDeepFields
                }
            }
            ${PARTREV_DEEPFIELDS}
        `;

        let partBase;
        let part;
        let partRev;
        beforeEach(function() {
            return pool.transaction(async db => {
                partBase = await th.createPartBase(db, family, users.a, 'P001');
                part = await th.createPart(db, partBase, users.a, 'P001.01', {
                    designation: 'SOME EXISTING PART',
                });
                const pr = await th.createPartRev(db, part, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
                partRev = await dao.partRevision.updateCycleState(db, pr.id, CycleState.Release);
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

        it('should not revise a part if previous is edition', async function() {
            await pool.transaction(async db => {
                return dao.partRevision.updateCycleState(db, partRev.id, CycleState.Edition);
            });
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_REVISE,
                    variables: {
                        input: { partId: part.id },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message.toLowerCase()).to.contain('edition');
            expect(data).to.be.null;
        });
    });

    describe('partStartValidation', function() {
        const PART_STARTVAL = gql`
            mutation StartPartVal($input: PartValidationInput!) {
                partStartValidation(input: $input) {
                    ...PartValDeepFields
                }
            }
            ${PARTVAL_DEEPFIELDS}
        `;
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
        this.afterEach(
            th.cleanTables([
                'part_approval',
                'part_validation',
                'part_revision',
                'part',
                'part_base',
            ])
        );
        this.afterEach(th.resetFamilyCounters());

        it('should start a validation', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.create', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_STARTVAL,
                    variables: {
                        input: {
                            partRevId: partRev.id,
                            requiredApprovals: Object.values(users).map(u => ({
                                assigneeId: u.id,
                            })),
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partStartValidation).to.deep.include({
                partRev: {
                    id: partRev.id,
                    revision: partRev.revision,
                    cycleState: partRev.cycleState,
                },
                state: ApprovalState.Pending,
                result: null,
                comments: null,
                ...trackedBy(users.a),
            });
            expect(data.partStartValidation.id).to.be.uuid();
            expect(data.partStartValidation.approvals)
                .to.be.an('array')
                .with.lengthOf(5);
            const approvals = data.partStartValidation.approvals.sort((a, b) =>
                a.assignee.name < b.assignee.name ? -1 : 1
            );
            const assignees = Object.values(users).sort((a, b) => (a.name < b.name ? -1 : 1));

            for (let i = 0; i < 5; ++i) {
                expect(approvals[i]).to.deep.include({
                    assignee: {
                        id: assignees[i].id,
                        name: assignees[i].name,
                    },
                    state: ApprovalState.Pending,
                    comments: null,
                    ...trackedBy(users.a),
                });
                expect(approvals[i].id).to.be.uuid();
            }
        });

        it('should not start a validation without "partval.create"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PART_STARTVAL,
                    variables: {
                        input: {
                            partRevId: partRev.id,
                            requiredApprovals: Object.values(users).map(u => ({
                                assigneeId: u.id,
                            })),
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('partval.create');
            expect(data).to.be.null;
        });
    });

    describe('partUpdate', function() {
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
