import { expect } from 'chai';
import gql from 'graphql-tag';
import { sql } from 'slonik';
import { idType, trackedBy, expTrackedTime } from '@engspace/server-db';
import { ApprovalDecision, PartCycle, ChangeRequestCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';
import { buildGqlServer, dao, pool, th } from '.';

describe('GraphQL ChangeRequest - Mutations', function () {
    let users;
    let fam;
    let oldReq;
    let parts;
    let rev1s;

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
            oldReq = await th.createChangeRequest(db, users.a);
            await dao.changeRequest.updateCycle(
                db,
                oldReq.id,
                ChangeRequestCycle.Approved,
                users.a.id
            );
            parts = {
                p1: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P001.A', designation: 'PART 1' },
                    { withRev1: false, changeRequest: oldReq, bumpFamCounter: true }
                ),
                p2: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P002.A', designation: 'PART 2' },
                    { withRev1: false, changeRequest: oldReq, bumpFamCounter: true }
                ),
                p3: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P003.A', designation: 'PART 3' },
                    { withRev1: false, changeRequest: oldReq, bumpFamCounter: true }
                ),
            };
            rev1s = {
                p1: await th.createPartRev(db, parts.p1, oldReq, users.a, {
                    cycle: PartCycle.Release,
                }),
                p2: await th.createPartRev(db, parts.p2, oldReq, users.a, {
                    cycle: PartCycle.Release,
                }),
                p3: await th.createPartRev(db, parts.p3, oldReq, users.a, {
                    cycle: PartCycle.Release,
                }),
            };
        });
    });

    afterEach(th.cleanTables(['part_revision', 'part', 'change_request']));
    afterEach(th.resetFamilyCounters());

    describe('#changeRequestCreate', function () {
        const CHANGEREQ_CREATE = gql`
            mutation CreateChangeReq($input: ChangeRequestInput!) {
                changeRequestCreate(input: $input) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        this.afterEach(
            th.cleanTables([
                'change_part_create',
                'change_part_change',
                'change_part_revision',
                'change_review',
            ])
        );
        this.afterEach(function () {
            return pool.transaction((db) => {
                return db.query(sql`
                    DELETE FROM change_request WHERE id != ${oldReq.id}
                `);
            });
        });

        it('should create an empty change request', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {},
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeRequestCreate).to.deep.include({
                description: null,
                cycle: ChangeRequestCycle.Edition,
                state: null,
                partCreations: [],
                partChanges: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
        });

        it('should create a change request with a description', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {
                            description: 'a revolution',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeRequestCreate).to.deep.include({
                description: 'a revolution',
                cycle: ChangeRequestCycle.Edition,
                state: null,
                partCreations: [],
                partChanges: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
        });

        it('should create a change request with part creations', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {
                            partCreations: [
                                {
                                    familyId: fam.id,
                                    version: 'A',
                                    designation: 'PART A',
                                },
                                {
                                    familyId: fam.id,
                                    version: 'B',
                                    designation: 'PART B',
                                    comments: 'Some comments',
                                },
                            ],
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeRequestCreate).to.containSubset({
                description: null,
                cycle: ChangeRequestCycle.Edition,
                state: null,
                partCreations: [
                    {
                        family: { id: fam.id },
                        version: 'A',
                        designation: 'PART A',
                        comments: null,
                    },
                    {
                        family: { id: fam.id },
                        version: 'B',
                        designation: 'PART B',
                        comments: 'Some comments',
                    },
                ],
                partChanges: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
        });

        it('should create a change request with part change', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {
                            partChanges: [
                                {
                                    partId: parts.p1.id,
                                    version: 'B',
                                },
                                {
                                    partId: parts.p2.id,
                                    version: 'B',
                                    designation: 'PART 2B',
                                    comments: 'Some comments',
                                },
                            ],
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeRequestCreate).to.containSubset({
                description: null,
                cycle: ChangeRequestCycle.Edition,
                state: null,
                partCreations: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.partChanges).to.containSubset([
                {
                    part: { id: parts.p1.id },
                    version: 'B',
                    designation: null,
                    comments: null,
                },
                {
                    part: { id: parts.p2.id },
                    version: 'B',
                    designation: 'PART 2B',
                    comments: 'Some comments',
                },
            ]);
            expect(data.changeRequestCreate.id).to.be.a(idType);
        });

        it('should create a change request with part revision', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {
                            partRevisions: [
                                {
                                    partId: parts.p1.id,
                                },
                                {
                                    partId: parts.p2.id,
                                    designation: 'PART 2 rev2',
                                    comments: 'Some comments',
                                },
                            ],
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeRequestCreate).to.containSubset({
                description: null,
                cycle: ChangeRequestCycle.Edition,
                state: null,
                partCreations: [],
                partChanges: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
            expect(data.changeRequestCreate.partRevisions).to.containSubset([
                {
                    part: { id: parts.p1.id },
                    designation: null,
                    comments: null,
                },
                {
                    part: { id: parts.p2.id },
                    designation: 'PART 2 rev2',
                    comments: 'Some comments',
                },
            ]);
        });

        it('should create a change request with reviewers', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {
                            reviewerIds: [users.a.id, users.b.id],
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeRequestCreate).to.deep.include({
                description: null,
                cycle: ChangeRequestCycle.Edition,
                state: null,
                partCreations: [],
                partChanges: [],
                partRevisions: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
            expect(data.changeRequestCreate.reviews).to.containSubset([
                {
                    assignee: { id: users.a.id },
                    decision: ApprovalDecision.Pending,
                    comments: null,
                },
                {
                    assignee: { id: users.b.id },
                    decision: ApprovalDecision.Pending,
                    comments: null,
                },
            ]);
        });

        it('should not allow a part change with the same version', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {
                            partChanges: [
                                {
                                    partId: parts.p1.id,
                                    version: 'A',
                                },
                            ],
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain(parts.p1.ref);
            expect(data).to.be.null;
        });

        it('should not allow a revision of part in edition', async function () {
            await pool.transaction(async (db) => {
                return dao.partRevision.updateCycleState(db, rev1s.p1.id, PartCycle.Edition);
            });
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, [
                        'change.create',
                        'change.read',
                        'part.read',
                        'partfamily.read',
                        'user.read',
                    ])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {
                            partRevisions: [
                                {
                                    partId: parts.p1.id,
                                },
                            ],
                        },
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message.toLowerCase()).to.contain('edition');
            expect(data).to.be.null;
        });

        it('should not create a change request without "change.create"', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: CHANGEREQ_CREATE,
                    variables: {
                        input: {},
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('change.create');
            expect(data).to.be.null;
        });
    });

    describe('Updates', function () {
        let req;
        let reviews;

        this.beforeEach(async function () {
            return pool.transaction(async (db) => {
                req = await th.createChangeRequest(db, users.a, {
                    description: 'A change request',
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
                    partChanges: [
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
                });
                reviews = {
                    a: await dao.changeReview.byRequestAndAssigneeId(db, req.id, users.a.id),
                    b: await dao.changeReview.byRequestAndAssigneeId(db, req.id, users.b.id),
                };
            });
        });

        this.afterEach(
            th.cleanTables([
                'change_part_create',
                'change_part_change',
                'change_part_revision',
                'change_review',
            ])
        );

        describe('#changeRequestUpdate', function () {
            const CHANGEREQ_UPDATE = gql`
                mutation UpdateChangeReq($id: ID!, $input: ChangeRequestUpdateInput!) {
                    changeRequestUpdate(id: $id, input: $input) {
                        ...ChangeReqDeepFields
                    }
                }
                ${CHANGEREQ_DEEPFIELDS}
            `;

            it('empty change should be no-op', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {},
                        },
                    });
                });
                expect(errors).to.be.undefined;
                const partCreations = req.partCreations.map((obj) => ({
                    id: obj.id,
                }));
                const partChanges = req.partChanges.map((obj) => ({
                    id: obj.id,
                }));
                const partRevisions = req.partRevisions.map((obj) => ({
                    id: obj.id,
                }));
                const reviews = req.reviews.map((obj) => ({
                    id: obj.id,
                }));
                expect(data.changeRequestUpdate).to.containSubset({
                    ...req,
                    partCreations,
                    partChanges,
                    partRevisions,
                    reviews,
                });
            });

            it('should update the description', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                description: 'An updated change request',
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate).to.deep.include({
                    description: 'An updated change request',
                });
                expect(data.changeRequestUpdate.partCreations).to.have.lengthOf(2);
                expect(data.changeRequestUpdate.partChanges).to.have.lengthOf(1);
                expect(data.changeRequestUpdate.partRevisions).to.have.lengthOf(1);
                expect(data.changeRequestUpdate.reviews).to.have.lengthOf(2);
            });

            it('should not update the description without "change.update"', async function () {
                const { errors, data } = await pool.transaction(async (db) => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, [
                            'change.read',
                            'part.read',
                            'partfamily.read',
                            'user.read',
                        ])
                    );
                    return mutate({
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                description: 'An updated change request',
                            },
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('change.update');
                expect(data).to.be.null;
            });

            it('should add a part creation to a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                partCreationsAdd: [
                                    {
                                        familyId: fam.id,
                                        designation: 'PART 5',
                                        version: 'B',
                                    },
                                ],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.partCreations).to.have.lengthOf(3);
                expect(data.changeRequestUpdate.partCreations[2]).to.deep.include({
                    family: { id: fam.id },
                    designation: 'PART 5',
                    version: 'B',
                });
            });

            it('should remove a part creation from a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                partCreationsRem: [req.partCreations[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.partCreations).to.have.lengthOf(1);
                expect(data.changeRequestUpdate.partCreations[0].id).to.eql(
                    req.partCreations[1].id
                );
            });

            it('should add a part change to a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                partChangesAdd: [
                                    {
                                        partId: parts.p3.id,
                                        version: 'B',
                                        comments: 'this part doesnt work either',
                                    },
                                ],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.partChanges).to.have.lengthOf(2);
                expect(data.changeRequestUpdate.partChanges[1]).to.deep.include({
                    part: { id: parts.p3.id },
                    version: 'B',
                    comments: 'this part doesnt work either',
                });
            });

            it('should remove a part change from a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                partChangesRem: [req.partChanges[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.partChanges).to.have.lengthOf(0);
            });

            it('should add a part revision to a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                partRevisionsAdd: [
                                    {
                                        partId: parts.p3.id,
                                    },
                                ],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.partRevisions).to.have.lengthOf(2);
                expect(data.changeRequestUpdate.partRevisions[1]).to.deep.include({
                    part: { id: parts.p3.id },
                });
            });

            it('should remove a part revision from a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                partRevisionsRem: [req.partRevisions[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.partRevisions).to.have.lengthOf(0);
            });

            it('should add a review to a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                reviewerIdsAdd: [users.c.id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.reviews).to.have.lengthOf(3);
                expect(data.changeRequestUpdate.reviews[2]).to.deep.include({
                    assignee: { id: users.c.id },
                });
            });

            it('should remove a review from a change request', async function () {
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
                        mutation: CHANGEREQ_UPDATE,
                        variables: {
                            id: req.id,
                            input: {
                                reviewsRem: [req.reviews[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestUpdate.reviews).to.have.lengthOf(1);
                expect(data.changeRequestUpdate.reviews[0].id).to.eql(req.reviews[1].id);
            });
        });

        describe('#changeRequestSubmit', function () {
            const CHANGEREQ_SUBMIT = gql`
                mutation SubmitChangeRequest($id: ID!) {
                    changeRequestSubmit(id: $id) {
                        ...ChangeReqDeepFields
                    }
                }
                ${CHANGEREQ_DEEPFIELDS}
            `;
            it('should start a change request validation', async function () {
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                const partCreations = req.partCreations.map((obj) => ({
                    id: obj.id,
                }));
                const partChanges = req.partChanges.map((obj) => ({
                    id: obj.id,
                }));
                const partRevisions = req.partRevisions.map((obj) => ({
                    id: obj.id,
                }));
                const reviews = req.reviews.map((obj) => ({
                    id: obj.id,
                }));
                expect(data.changeRequestSubmit).to.containSubset({
                    description: req.description,
                    cycle: ChangeRequestCycle.Validation,
                    partCreations,
                    partChanges,
                    partRevisions,
                    reviews,
                });
                expTrackedTime(expect, data.changeRequestSubmit);
            });

            it('should not submit a change request without "change.update"', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, [
                            'change.read',
                            'part.read',
                            'partfamily.read',
                            'user.read',
                        ])
                    );
                    return mutate({
                        mutation: CHANGEREQ_SUBMIT,
                        variables: {
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('change.update');
            });

            it('should not submit a change request that is in APPROVED state', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Approved,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('APPROVED');
            });

            it('should not start a change request validation from unauthorized user', async function () {
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain(users.c.fullName);
            });
        });

        describe('#changeRequestReview', function () {
            const CHANGEREQ_REVIEW = gql`
                mutation ReviewChangeReq($id: ID!, $input: ChangeReviewInput!) {
                    changeRequestReview(id: $id, input: $input) {
                        id
                        assignee {
                            id
                        }
                        decision
                        comments
                        request {
                            id
                            state
                        }
                    }
                }
            `;

            this.beforeEach('switch to validation mode', async function () {
                return pool.transaction((db) =>
                    dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Validation,
                        users.a.id
                    )
                );
            });

            it('should reject a change request', async function () {
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
                            id: req.id,
                            input: {
                                decision: ApprovalDecision.Rejected,
                                comments: 'Not good enough',
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestReview).to.deep.include({
                    id: reviews.a.id,
                    assignee: { id: users.a.id },
                    decision: ApprovalDecision.Rejected,
                    comments: 'Not good enough',
                    request: {
                        id: req.id,
                        state: ApprovalDecision.Rejected,
                    },
                });
            });

            it('should approve a change request', async function () {
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
                            id: req.id,
                            input: {
                                decision: ApprovalDecision.Approved,
                                comments: 'Good for me',
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestReview).to.deep.include({
                    id: reviews.b.id,
                    assignee: { id: users.b.id },
                    decision: ApprovalDecision.Approved,
                    comments: 'Good for me',
                    request: {
                        id: req.id,
                        state: ApprovalDecision.Pending, // pending users.a's decision
                    },
                });
            });

            it('should approve a change request with reserve', async function () {
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
                            id: req.id,
                            input: {
                                decision: ApprovalDecision.Reserved,
                                comments: 'Better next time',
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestReview).to.deep.include({
                    id: reviews.a.id,
                    assignee: { id: users.a.id },
                    decision: ApprovalDecision.Reserved,
                    comments: 'Better next time',
                    request: {
                        id: req.id,
                        state: ApprovalDecision.Pending, // pending users.b's decision
                    },
                });
            });

            it('should not review a change request without "change.review"', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, [
                            'change.read',
                            'part.read',
                            'partfamily.read',
                            'user.read',
                        ])
                    );
                    return mutate({
                        mutation: CHANGEREQ_REVIEW,
                        variables: {
                            id: req.id,
                            input: {
                                decision: ApprovalDecision.Rejected,
                            },
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('change.review');
            });

            it('should not review a change.request if not assigned', async function () {
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
                            id: req.id,
                            input: {
                                decision: ApprovalDecision.Rejected,
                            },
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain(users.c.fullName);
            });

            it('should not allow to review a request not in validation', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Edition,
                        users.a.id
                    );
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
                            id: req.id,
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

        describe('#changeRequestWithdraw', function () {
            const CHANGEREQ_WITHDRAW = gql`
                mutation WithdrawChangeRequst($id: ID!) {
                    changeRequestWithdraw(id: $id) {
                        ...ChangeReqDeepFields
                    }
                }
                ${CHANGEREQ_DEEPFIELDS}
            `;

            it('should withdraw a change', async function () {
                const { errors, data } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Validation,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestWithdraw).to.containSubset({
                    id: req.id,
                    description: 'A change request',
                    cycle: ChangeRequestCycle.Edition,
                });
            });

            it('should not withdraw a change from EDITION cycle', async function () {
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('EDITION');
            });

            it('should not withdraw a change from APPROVED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Approved,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('APPROVED');
            });

            it('should not withdraw a change from CANCELLED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Cancelled,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('CANCELLED');
            });

            it('should not withdraw a change without "change.update"', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Validation,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('change.update');
            });

            it('should not withdraw a change from unauthorized editor', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Validation,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain(users.c.fullName);
            });
        });

        describe('#changeRequestApprove', function () {
            const CHANGEREQ_APPROVE = gql`
                mutation ApproveChangeRequest($id: ID!) {
                    changeRequestApprove(id: $id) {
                        ...ChangeReqDeepFields
                    }
                }
                ${CHANGEREQ_DEEPFIELDS}
            `;

            it('should approve a change', async function () {
                const { errors, data } = await pool.transaction(async (db) => {
                    await Promise.all([
                        dao.changeRequest.updateCycle(
                            db,
                            req.id,
                            ChangeRequestCycle.Validation,
                            users.a.id
                        ),
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestApprove.createdParts).to.have.lengthOf(3);
                expect(data.changeRequestApprove.revisedParts).to.have.lengthOf(1);
                expect(data.changeRequestApprove).to.containSubset({
                    id: req.id,
                    description: 'A change request',
                    cycle: ChangeRequestCycle.Approved,
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

            it('should not approve a change in EDITION cycle', async function () {
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('EDITION');
            });

            it('should not approve a change in CANCELLED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Cancelled,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('CANCELLED');
            });

            it('should not approve a change that has missing approvals', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Validation,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('approval');
            });

            it('should not approve a change from unauthorized editor', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await Promise.all([
                        dao.changeRequest.updateCycle(
                            db,
                            req.id,
                            ChangeRequestCycle.Validation,
                            users.a.id
                        ),
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain(users.c.fullName);
            });
        });

        describe('#changeRequestCancel', function () {
            const CHANGEREQ_CANCEL = gql`
                mutation CancelChangeRequest($id: ID!) {
                    changeRequestCancel(id: $id) {
                        ...ChangeReqDeepFields
                    }
                }
                ${CHANGEREQ_DEEPFIELDS}
            `;
            it('should cancel a change request from EDITION cycle', async function () {
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestCancel).to.containSubset({
                    id: req.id,
                    description: 'A change request',
                    cycle: ChangeRequestCycle.Cancelled,
                });
            });

            it('should cancel a change request from VALIDATION cycle', async function () {
                const { errors, data } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Validation,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeRequestCancel).to.containSubset({
                    id: req.id,
                    description: 'A change request',
                    cycle: ChangeRequestCycle.Cancelled,
                });
            });

            it('should not cancel a change request from APPROVED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Approved,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('APPROVED');
            });

            it('should not cancel a change request from CANCELLED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.changeRequest.updateCycle(
                        db,
                        req.id,
                        ChangeRequestCycle.Cancelled,
                        users.a.id
                    );
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('CANCELLED');
            });

            it('should not cancel a change request from without "change.update"', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, [
                            'change.read',
                            'part.read',
                            'partfamily.read',
                            'user.read',
                        ])
                    );
                    return mutate({
                        mutation: CHANGEREQ_CANCEL,
                        variables: {
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('change.update');
            });

            it('should not cancel a change request if not editor', async function () {
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
                            id: req.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain(users.c.fullName);
            });
        });
    });
});
