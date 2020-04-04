import { ApprovalDecision, CycleState, User, ValidationResult } from '@engspace/core';
import { Dict, idType, trackedBy } from '@engspace/server-db';
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
            family {
                id
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
            decision
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
    after('delete res', th.cleanTables(['part_family', 'user']));

    afterEach(th.cleanTables(['part_revision', 'part']));
    afterEach(th.resetFamilyCounters());

    describe('partCreate', function() {
        const PART_CREATENEW = gql`
            mutation CreateNewPart($input: PartCreateInput!) {
                partCreate(input: $input) {
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
                            initialVersion: 'A',
                            designation: 'SOME NEW PART',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partCreate).to.deep.include({
                revision: 1,
                designation: 'SOME NEW PART',
                cycleState: CycleState.Edition,
                ...trackedBy(users.a),
            });
            expect(data.partCreate.part).to.deep.include({
                ref: 'P001.A',
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
                            initialVersion: 'A',
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
                    await dao.part.rowCount(db),
                    await dao.partRevision.rowCount(db),
                    (await dao.partFamily.byId(db, family.id)).counter,
                ];
            });
            expect(counts).to.eql([0, 0, 0]);
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

        let part;
        let partRev;
        beforeEach(function() {
            return pool.transaction(async db => {
                part = await th.createPart(db, family, users.a, {
                    designation: 'SOME EXISTING PART',
                });
                partRev = await th.createPartRev(db, part, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(th.cleanTables(['part_revision', 'part']));
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
            expect(data.partFork.id).to.be.a(idType);
            expect(data.partFork.id).to.not.equal(partRev.id);
            expect(data.partFork.part).to.deep.include({
                ref: 'P001.B',
                designation: 'SOME EXISTING PART',
                ...trackedBy(users.b),
                family: { id: family.id },
            });
            expect(data.partFork.part.id).to.be.a(idType);
            expect(data.partFork.part.id).to.not.equal(part.id);
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
            expect(data.partFork.id).to.be.a(idType);
            expect(data.partFork.id).to.not.equal(partRev.id);
            expect(data.partFork.part).to.deep.include({
                ref: 'P001.B',
                family: { id: family.id },
                designation: 'NEW EXISTING PART',
                ...trackedBy(users.b),
            });
            expect(data.partFork.part.id).to.be.a(idType);
            expect(data.partFork.part.id).to.not.equal(part.id);
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
                            version: 'K',
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
            expect(data.partFork.id).to.be.a(idType);
            expect(data.partFork.id).to.not.equal(partRev.id);
            expect(data.partFork.part).to.deep.include({
                ref: 'P001.K',
                designation: 'SOME EXISTING PART',
                ...trackedBy(users.b),
                family: { id: family.id },
            });
            expect(data.partFork.part.id).to.be.a(idType);
            expect(data.partFork.part.id).to.not.equal(part.id);
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

    describe('partUpdate', function() {
        const PART_UPDATE = gql`
            mutation UpdatePart($id: ID!, $input: PartUpdateInput!) {
                partUpdate(id: $id, input: $input) {
                    id
                    family {
                        id
                    }
                    ref
                    designation
                    ...TrackedFields
                }
            }
            ${TRACKED_FIELDS}
        `;

        let part;
        beforeEach(function() {
            return pool.transaction(async db => {
                part = await th.createPart(db, family, users.a, {
                    designation: 'SOME EXISTING PART',
                });
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(th.cleanTables(['part']));
        this.afterEach(th.resetFamilyCounters());

        it('should update a Part', async function() {
            const bef2 = Date.now();
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['part.update', 'part.read', 'partfamily.read', 'user.read'])
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
                family: { id: family.id },
                ref: 'P001.A',
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
                    permsAuth(users.b, ['part.read', 'partfamily.read', 'user.read'])
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

    describe('partRevise', function() {
        const PART_REVISE = gql`
            mutation RevisePart($input: PartRevisionInput!) {
                partRevise(input: $input) {
                    ...PartRevDeepFields
                }
            }
            ${PARTREV_DEEPFIELDS}
        `;

        let part;
        let partRev;
        beforeEach(function() {
            return pool.transaction(async db => {
                part = await th.createPart(db, family, users.a, {
                    designation: 'SOME EXISTING PART',
                });
                const pr = await th.createPartRev(db, part, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
                partRev = await dao.partRevision.updateCycleState(db, pr.id, CycleState.Release);
            });
        });
        this.afterEach(th.cleanTables(['part_revision', 'part']));
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
            expect(data.partRevise.id).to.be.a(idType);
            expect(data.partRevise.id).to.not.equal(partRev.id);
            expect(data.partRevise.part).to.deep.include({
                id: part.id,
                ref: 'P001.A',
                designation: 'SOME EXISTING PART',
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
            expect(data.partRevise.id).to.be.a(idType);
            expect(data.partRevise.id).to.not.equal(partRev.id);
            expect(data.partRevise.part).to.deep.include({
                id: part.id,
                ref: 'P001.A',
                designation: 'SOME EXISTING PART',
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
        let part;
        let partRev;
        beforeEach(function() {
            return pool.transaction(async db => {
                part = await th.createPart(db, family, users.a, {
                    designation: 'SOME EXISTING PART',
                });
                partRev = await th.createPartRev(db, part, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(
            th.cleanTables(['part_approval', 'part_validation', 'part_revision', 'part'])
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
                    cycleState: CycleState.Validation,
                },
                state: ApprovalDecision.Pending,
                result: null,
                comments: null,
                ...trackedBy(users.a),
            });
            expect(data.partStartValidation.id).to.be.a(idType);
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
                    decision: ApprovalDecision.Pending,
                    comments: null,
                    ...trackedBy(users.a),
                });
                expect(approvals[i].id).to.be.a(idType);
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

        it('should not start a validation of a part that is not in edition mode', async function() {
            await pool.transaction(async db => {
                return dao.partRevision.updateCycleState(db, partRev.id, CycleState.Release);
            });
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
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('edition');
            expect(data).to.be.null;
        });
    });

    describe('partUpdateApproval', async function() {
        const PARTAPPR_UPDATE = gql`
            mutation UpdatePartAppr($id: ID!, $input: PartApprovalUpdateInput!) {
                partUpdateApproval(id: $id, input: $input) {
                    id
                    assignee {
                        id
                    }
                    decision
                    comments
                    validation {
                        state
                    }
                }
            }
        `;

        let part;
        let partRev;
        let partVal;
        let partApprs;
        beforeEach(function() {
            return pool.transaction(async db => {
                part = await th.createPart(db, family, users.a, {
                    designation: 'SOME EXISTING PART',
                });
                partRev = await th.createPartRev(db, part, users.a);
                partVal = await th.createPartVal(db, partRev, users.a);
                partApprs = await th.createPartApprovals(db, partVal, users, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(
            th.cleanTables(['part_approval', 'part_validation', 'part_revision', 'part'])
        );
        this.afterEach(th.resetFamilyCounters());

        it('should update a part approval', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTAPPR_UPDATE,
                    variables: {
                        id: partApprs.b.id,
                        input: {
                            decision: ApprovalDecision.Approved,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partUpdateApproval).to.deep.include({
                id: partApprs.b.id,
                decision: ApprovalDecision.Approved,
                assignee: {
                    id: users.b.id,
                },
                comments: null,
                validation: {
                    state: ApprovalDecision.Pending,
                },
            });
        });

        it('should update a part approval with comments', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTAPPR_UPDATE,
                    variables: {
                        id: partApprs.b.id,
                        input: {
                            decision: ApprovalDecision.Approved,
                            comments: 'sucks, but fine...',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partUpdateApproval).to.deep.include({
                id: partApprs.b.id,
                decision: ApprovalDecision.Approved,
                assignee: {
                    id: users.b.id,
                },
                comments: 'sucks, but fine...',
                validation: {
                    state: ApprovalDecision.Pending,
                },
            });
        });

        it('should not update someone else part approval', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.update', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTAPPR_UPDATE,
                    variables: {
                        id: partApprs.b.id,
                        input: {
                            decision: ApprovalDecision.Approved,
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain(users.b.email);
            expect(data).to.be.null;
        });

        it('rejecting a part approval should reject validation', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTAPPR_UPDATE,
                    variables: {
                        id: partApprs.b.id,
                        input: {
                            decision: ApprovalDecision.Rejected,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partUpdateApproval).to.deep.include({
                id: partApprs.b.id,
                decision: ApprovalDecision.Rejected,
                assignee: {
                    id: users.b.id,
                },
                comments: null,
                validation: {
                    state: ApprovalDecision.Rejected,
                },
            });
        });

        it('all assignees approved should approve validation', async function() {
            await pool.transaction(async db => {
                return Promise.all([
                    dao.partApproval.update(db, partApprs.a.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.a.id,
                    }),
                    dao.partApproval.update(db, partApprs.b.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.b.id,
                    }),
                    dao.partApproval.update(db, partApprs.c.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.c.id,
                    }),
                    dao.partApproval.update(db, partApprs.d.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.d.id,
                    }),
                ]);
            });
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.e, ['partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTAPPR_UPDATE,
                    variables: {
                        id: partApprs.e.id,
                        input: {
                            decision: ApprovalDecision.Approved,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partUpdateApproval).to.deep.include({
                validation: {
                    state: ApprovalDecision.Approved,
                },
            });
        });
    });

    describe('partCloseValidation', function() {
        const PARTVAL_CLOSE = gql`
            mutation ClosePartVal($id: ID!, $input: PartValidationCloseInput!) {
                partCloseValidation(id: $id, input: $input) {
                    result
                    comments
                    ...TrackedFields
                    partRev {
                        cycleState
                    }
                }
            }
            ${TRACKED_FIELDS}
        `;

        let part;
        let partRev;
        let partVal;
        let partApprs;
        beforeEach(function() {
            return pool.transaction(async db => {
                part = await th.createPart(db, family, users.a, {
                    designation: 'SOME EXISTING PART',
                });
                partRev = await th.createPartRev(db, part, users.a);
                partVal = await th.createPartVal(db, partRev, users.a);
                partApprs = await th.createPartApprovals(db, partVal, users, users.a);
                await dao.partFamily.bumpCounterById(db, family.id);
            });
        });
        this.afterEach(
            th.cleanTables(['part_approval', 'part_validation', 'part_revision', 'part'])
        );
        this.afterEach(th.resetFamilyCounters());

        async function setApprovals(apprs: ApprovalDecision[]): Promise<void> {
            await pool.transaction(async db => {
                return Promise.all([
                    dao.partApproval.update(db, partApprs.a.id, {
                        decision: apprs[0],
                        userId: users.a.id,
                    }),
                    dao.partApproval.update(db, partApprs.b.id, {
                        decision: apprs[1],
                        userId: users.b.id,
                    }),
                    dao.partApproval.update(db, partApprs.c.id, {
                        decision: apprs[2],
                        userId: users.c.id,
                    }),
                    dao.partApproval.update(db, partApprs.d.id, {
                        decision: apprs[3],
                        userId: users.d.id,
                    }),
                    dao.partApproval.update(db, partApprs.e.id, {
                        decision: apprs[4],
                        userId: users.e.id,
                    }),
                ]);
            });
        }

        it('should release a part if validation is approved', async function() {
            await setApprovals(new Array(5).fill(ApprovalDecision.Approved));
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.update', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTVAL_CLOSE,
                    variables: {
                        id: partVal.id,
                        input: {
                            result: ValidationResult.Release,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partCloseValidation).to.deep.include({
                result: ValidationResult.Release,
                comments: null,
                ...trackedBy(users.a),
                partRev: {
                    cycleState: CycleState.Release,
                },
            });
        });

        it('should not release with a pending validation', async function() {
            await setApprovals([
                ApprovalDecision.Approved,
                ApprovalDecision.Pending,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
            ]);
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.update', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTVAL_CLOSE,
                    variables: {
                        id: partVal.id,
                        input: {
                            result: ValidationResult.Release,
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('PENDING');
            expect(data).to.be.null;
        });

        it('should not release with a rejected validation', async function() {
            await setApprovals([
                ApprovalDecision.Approved,
                ApprovalDecision.Rejected,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
            ]);
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.update', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTVAL_CLOSE,
                    variables: {
                        id: partVal.id,
                        input: {
                            result: ValidationResult.Release,
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('REJECTED');
            expect(data).to.be.null;
        });

        it('should not close someone else validation', async function() {
            await setApprovals([
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
            ]);
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, ['partval.update', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTVAL_CLOSE,
                    variables: {
                        id: partVal.id,
                        input: {
                            result: ValidationResult.Release,
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain(users.a.email);
            expect(data).to.be.null;
        });

        it('should try-again whatever the status', async function() {
            await setApprovals([
                ApprovalDecision.Approved,
                ApprovalDecision.Rejected,
                ApprovalDecision.Pending,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
            ]);
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.update', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTVAL_CLOSE,
                    variables: {
                        id: partVal.id,
                        input: {
                            result: ValidationResult.TryAgain,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partCloseValidation).to.deep.include({
                result: ValidationResult.TryAgain,
                comments: null,
                ...trackedBy(users.a),
                partRev: {
                    cycleState: CycleState.Edition,
                },
            });
        });

        it('should cancel whatever the status', async function() {
            await setApprovals([
                ApprovalDecision.Approved,
                ApprovalDecision.Rejected,
                ApprovalDecision.Pending,
                ApprovalDecision.Approved,
                ApprovalDecision.Approved,
            ]);
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.update', 'partval.read', 'part.read', 'user.read'])
                );
                return mutate({
                    mutation: PARTVAL_CLOSE,
                    variables: {
                        id: partVal.id,
                        input: {
                            result: ValidationResult.Cancel,
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partCloseValidation).to.deep.include({
                result: ValidationResult.Cancel,
                comments: null,
                ...trackedBy(users.a),
                partRev: {
                    cycleState: CycleState.Cancelled,
                },
            });
        });
    });
});
