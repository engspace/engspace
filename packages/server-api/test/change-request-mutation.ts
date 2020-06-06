import { expect } from 'chai';
import gql from 'graphql-tag';
import { idType, trackedBy } from '@engspace/server-db';
import { ApprovalDecision, PartCycle, ChangeRequestCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';
import { buildGqlServer, dao, pool, th } from '.';

describe('GraphQL ChangeRequest - Mutations', function () {
    let users;
    let fam;
    let parts;
    before(async function () {
        return pool.transaction(async (db) => {
            users = {
                a: await th.createUser(db, { name: 'a' }),
                b: await th.createUser(db, { name: 'b' }),
                c: await th.createUser(db, { name: 'c' }),
            };
            fam = await th.createPartFamily(db);
            parts = {
                p1: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P001.A', designation: 'PART 1' },
                    { withRev1: false, bumpFamCounter: true }
                ),
                p2: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P002.A', designation: 'PART 2' },
                    { withRev1: false, bumpFamCounter: true }
                ),
                p3: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P003.A', designation: 'PART 3' },
                    { withRev1: false, bumpFamCounter: true }
                ),
            };
        });
    });
    after(th.cleanTables(['part_revision'], { withDeps: true }));

    describe('changeRequestCreate', function () {
        const CHANGEREQ_CREATE = gql`
            mutation CreateChangeReq($input: ChangeRequestInput!) {
                changeRequestCreate(input: $input) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        let rev1s;

        this.beforeEach(async function () {
            return pool.transaction(async (db) => {
                rev1s = {
                    p1: await th.createPartRev(db, parts.p1, users.a, {
                        cycle: PartCycle.Release,
                    }),
                    p2: await th.createPartRev(db, parts.p2, users.a, {
                        cycle: PartCycle.Release,
                    }),
                    p3: await th.createPartRev(db, parts.p3, users.a, {
                        cycle: PartCycle.Release,
                    }),
                };
            });
        });

        this.afterEach(
            th.cleanTables([
                'change_part_create',
                'change_part_change',
                'change_part_revision',
                'change_review',
                'change_request',
                'part_revision',
            ])
        );

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
            console.log(errors);
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

    describe('changeRequestUpdate', function () {
        const CHANGEREQ_UPDATE = gql`
            mutation UpdateChangeReq($id: ID!, $input: ChangeRequestUpdateInput!) {
                changeRequestUpdate(id: $id, input: $input) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        let rev1s;
        let req;

        this.beforeEach(async function () {
            return pool.transaction(async (db) => {
                rev1s = {
                    p1: await th.createPartRev(db, parts.p1, users.a, {
                        cycle: PartCycle.Release,
                    }),
                    p2: await th.createPartRev(db, parts.p2, users.a, {
                        cycle: PartCycle.Release,
                    }),
                    p3: await th.createPartRev(db, parts.p3, users.a, {
                        cycle: PartCycle.Release,
                    }),
                };

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
            });
        });

        this.afterEach(
            th.cleanTables([
                'change_part_create',
                'change_part_change',
                'change_part_revision',
                'change_review',
                'change_request',
                'part_revision',
            ])
        );

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
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
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
            console.log(errors);
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
            console.log(errors);
            expect(errors).to.be.undefined;
            expect(data.changeRequestUpdate.partCreations).to.have.lengthOf(1);
            expect(data.changeRequestUpdate.partCreations[0].id).to.eql(req.partCreations[1].id);
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
            console.log(errors);
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
            console.log(errors);
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
            console.log(errors);
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
            console.log(errors);
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
            console.log(errors);
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
            console.log(errors);
            expect(errors).to.be.undefined;
            expect(data.changeRequestUpdate.reviews).to.have.lengthOf(1);
            expect(data.changeRequestUpdate.reviews[0].id).to.eql(req.reviews[1].id);
        });
    });
});
