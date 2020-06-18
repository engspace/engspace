import { expect } from 'chai';
import gql from 'graphql-tag';
import { expTrackedTime } from '@engspace/server-db';
import { ApprovalDecision, PartCycle, ChangeCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';
import { buildGqlServer, dao, pool, th } from '.';

describe('GraphQL Change - Mutations - Cycle', function () {
    let users;
    let fam;
    let ch1;
    let parts;
    let ch2;
    let reviews;

    before(async function () {
        return pool.transaction(async (db) => {
            users = {
                a: await th.createUser(db, { name: 'a' }),
                b: await th.createUser(db, { name: 'b' }),
                c: await th.createUser(db, { name: 'c' }),
            };
            fam = await th.createPartFamily(db);
        });
    });
    after(th.cleanTables(['part_family', 'user']));

    beforeEach(async function () {
        return pool.transaction(async (db) => {
            ch1 = await th.createChange(db, users.a, 'CH-001', {}, { bumpCounter: true });
            await dao.change.updateCycle(db, ch1.id, ChangeCycle.Engineering, users.a.id);
            parts = {
                p1: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P001.A', designation: 'PART 1' },
                    { withRev1: { change: ch1, cycle: PartCycle.Release }, bumpFamCounter: true }
                ),
                p2: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P002.A', designation: 'PART 2' },
                    { withRev1: { change: ch1, cycle: PartCycle.Release }, bumpFamCounter: true }
                ),
                p3: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P003.A', designation: 'PART 3' },
                    { withRev1: { change: ch1, cycle: PartCycle.Release }, bumpFamCounter: true }
                ),
            };
            ch2 = await th.createChange(
                db,
                users.a,
                'CH-002',
                {
                    description: 'A change',
                    partCreations: [
                        {
                            familyId: fam.id,
                            designation: 'PART 4',
                            version: 'A',
                        },
                        {
                            familyId: fam.id,
                            designation: 'PART 5',
                            version: 'K',
                        },
                    ],
                    partForks: [
                        {
                            partId: parts.p1.id,
                            version: 'B',
                            comments: "this part doesn't work",
                        },
                    ],
                    partRevisions: [
                        {
                            partId: parts.p2.id,
                        },
                    ],
                    reviewerIds: [users.a.id, users.b.id],
                },
                {
                    bumpCounter: true,
                }
            );
            reviews = {
                a: await dao.changeReview.byRequestAndAssigneeId(db, ch2.id, users.a.id),
                b: await dao.changeReview.byRequestAndAssigneeId(db, ch2.id, users.b.id),
            };
        });
    });

    this.afterEach(
        th.cleanTables([
            'change_part_create',
            'change_part_fork',
            'change_part_revision',
            'change_review',
            'part_revision',
            'part',
            'change',
        ])
    );
    afterEach(th.resetFamilyCounters());
    afterEach(th.resetChangeCounter());

    describe('#changeSubmit', function () {
        const CHANGEREQ_SUBMIT = gql`
            mutation SubmitChange($id: ID!) {
                changeSubmit(id: $id) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;
        it('should start a change validation', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_SUBMIT,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            const partCreations = ch2.partCreations.map((obj) => ({
                id: obj.id,
            }));
            const partForks = ch2.partForks.map((obj) => ({
                id: obj.id,
            }));
            const partRevisions = ch2.partRevisions.map((obj) => ({
                id: obj.id,
            }));
            const reviews = ch2.reviews.map((obj) => ({
                id: obj.id,
            }));
            expect(data.changeSubmit).to.containSubset({
                description: ch2.description,
                cycle: ChangeCycle.Evaluation,
                partCreations,
                partForks,
                partRevisions,
                reviews,
            });
            expTrackedTime(expect, data.changeSubmit);
        });

        it('should not submit a change without "change.update"', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: CHANGEREQ_SUBMIT,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('change.update');
        });

        it('should not submit a change that is in ENGINEERING state', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Engineering, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_SUBMIT,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('ENGINEERING');
        });

        it('should not start a change EVALUATION from unauthorized user', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.c, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_SUBMIT,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain(users.c.fullName);
        });
    });

    describe('#changeReview', function () {
        const CHANGEREQ_REVIEW = gql`
            mutation ReviewChangeReq($id: ID!, $input: ChangeReviewInput!) {
                changeReview(id: $id, input: $input) {
                    id
                    assignee {
                        id
                    }
                    decision
                    comments
                    change {
                        id
                        state
                    }
                }
            }
        `;

        this.beforeEach('switch to validation mode', async function () {
            return pool.transaction((db) =>
                dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id)
            );
        });

        it('should reject a change', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.review',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_REVIEW,
                    variables: {
                        id: ch2.id,
                        input: {
                            decision: ApprovalDecision.Rejected,
                            comments: 'Not good enough',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeReview).to.deep.include({
                id: reviews.a.id,
                assignee: { id: users.a.id },
                decision: ApprovalDecision.Rejected,
                comments: 'Not good enough',
                change: {
                    id: ch2.id,
                    state: ApprovalDecision.Rejected,
                },
            });
        });

        it('should approve a change', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.b, [
                        'change.review',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_REVIEW,
                    variables: {
                        id: ch2.id,
                        input: {
                            decision: ApprovalDecision.Approved,
                            comments: 'Good for me',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeReview).to.deep.include({
                id: reviews.b.id,
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Approved,
                comments: 'Good for me',
                change: {
                    id: ch2.id,
                    state: ApprovalDecision.Pending, // pending users.a's decision
                },
            });
        });

        it('should approve a change with reserve', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.review',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_REVIEW,
                    variables: {
                        id: ch2.id,
                        input: {
                            decision: ApprovalDecision.Reserved,
                            comments: 'Better next time',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeReview).to.deep.include({
                id: reviews.a.id,
                assignee: { id: users.a.id },
                decision: ApprovalDecision.Reserved,
                comments: 'Better next time',
                change: {
                    id: ch2.id,
                    state: ApprovalDecision.Pending, // pending users.b's decision
                },
            });
        });

        it('should not review a change without "change.review"', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: CHANGEREQ_REVIEW,
                    variables: {
                        id: ch2.id,
                        input: {
                            decision: ApprovalDecision.Rejected,
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('change.review');
        });

        it('should not review a change if not assigned', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.c, [
                        'change.review',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_REVIEW,
                    variables: {
                        id: ch2.id,
                        input: {
                            decision: ApprovalDecision.Rejected,
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain(users.c.fullName);
        });

        it('should not allow to review a change not in EVALUATION', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Preparation, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.review',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_REVIEW,
                    variables: {
                        id: ch2.id,
                        input: {
                            decision: ApprovalDecision.Rejected,
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message.toLocaleLowerCase()).to.contain('validation');
        });
    });

    describe('#changeWithdraw', function () {
        const CHANGEREQ_WITHDRAW = gql`
            mutation WithdrawChangeRequst($id: ID!) {
                changeWithdraw(id: $id) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        it('should withdraw a change', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_WITHDRAW,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeWithdraw).to.containSubset({
                id: ch2.id,
                description: 'A change',
                cycle: ChangeCycle.Preparation,
            });
        });

        it('should not withdraw a change from PREPARATION cycle', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_WITHDRAW,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain('PREPARATION');
        });

        it('should not withdraw a change from ENGINEERING cycle', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Engineering, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_WITHDRAW,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain('ENGINEERING');
        });

        it('should not withdraw a change from CANCELLED cycle', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Cancelled, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_WITHDRAW,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain('CANCELLED');
        });

        it('should not withdraw a change without "change.update"', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_WITHDRAW,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain('change.update');
        });

        it('should not withdraw a change from unauthorized editor', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.c, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_WITHDRAW,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain(users.c.fullName);
        });
    });

    describe('#changeApprove', function () {
        const CHANGEREQ_APPROVE = gql`
            mutation ApproveChange($id: ID!) {
                changeApprove(id: $id) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        it('should approve a change', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                await Promise.all([
                    dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id),
                    dao.changeReview.update(db, reviews.a.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.a.id,
                    }),
                    dao.changeReview.update(db, reviews.b.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.b.id,
                    }),
                ]);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_APPROVE,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeApprove.createdParts).to.have.lengthOf(3);
            expect(data.changeApprove.revisedParts).to.have.lengthOf(1);
            expect(data.changeApprove).to.containSubset({
                id: ch2.id,
                name: 'CH-002',
                description: 'A change',
                cycle: ChangeCycle.Engineering,
                createdParts: [
                    {
                        ref: 'P004.A',
                        designation: 'PART 4',
                        family: { id: fam.id },
                    },
                    {
                        ref: 'P005.K',
                        designation: 'PART 5',
                        family: { id: fam.id },
                    },
                    {
                        ref: 'P001.B',
                        designation: 'PART 1',
                        family: { id: fam.id },
                    },
                ],
                revisedParts: [
                    {
                        part: {
                            id: parts.p2.id,
                        },
                        revision: 2,
                        cycle: PartCycle.Edition,
                    },
                ],
            });
        });

        it('should not approve a change in PREPARATION cycle', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_APPROVE,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain('PREPARATION');
        });

        it('should not approve a change in CANCELLED cycle', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Cancelled, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_APPROVE,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain('CANCELLED');
        });

        it('should not approve a change that has missing approvals', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_APPROVE,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain('approval');
        });

        it('should not approve a change from unauthorized editor', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await Promise.all([
                    dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id),
                    dao.changeReview.update(db, reviews.a.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.a.id,
                    }),
                    dao.changeReview.update(db, reviews.b.id, {
                        decision: ApprovalDecision.Approved,
                        userId: users.b.id,
                    }),
                ]);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.c, [
                        'change.update',
                        'change.read',
                        'part.create',
                        'part.revise',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_APPROVE,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.undefined;
            expect(errors[0].message).to.contain(users.c.fullName);
        });
    });

    describe('#changeCancel', function () {
        const CHANGEREQ_CANCEL = gql`
            mutation CancelChange($id: ID!) {
                changeCancel(id: $id) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;
        it('should cancel a change from PREPARATION cycle', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CANCEL,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeCancel).to.containSubset({
                id: ch2.id,
                description: 'A change',
                cycle: ChangeCycle.Cancelled,
            });
        });

        it('should cancel a change from EVALUATION cycle', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Evaluation, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CANCEL,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeCancel).to.containSubset({
                id: ch2.id,
                description: 'A change',
                cycle: ChangeCycle.Cancelled,
            });
        });

        it('should not cancel a change from ENGINEERING cycle', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Engineering, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CANCEL,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('ENGINEERING');
        });

        it('should not cancel a change from CANCELLED cycle', async function () {
            const { errors } = await pool.transaction(async (db) => {
                await dao.change.updateCycle(db, ch2.id, ChangeCycle.Cancelled, users.a.id);
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CANCEL,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('CANCELLED');
        });

        it('should not cancel a change from without "change.update"', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: CHANGEREQ_CANCEL,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('change.update');
        });

        it('should not cancel a change if not editor', async function () {
            const { errors } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.c, [
                        'change.update',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CANCEL,
                    variables: {
                        id: ch2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain(users.c.fullName);
        });
    });
});
