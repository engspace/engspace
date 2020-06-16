import { expect } from 'chai';
import gql from 'graphql-tag';
import { sql } from 'slonik';
import { idType, trackedBy, expTrackedTime } from '@engspace/server-db';
import { ApprovalDecision, PartCycle, ChangeCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';
import { buildGqlServer, dao, pool, th } from '.';

describe('GraphQL Change - Mutations', function () {
    let users;
    let fam;
    let cr1;
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
            cr1 = await th.createChange(db, users.a, 'CR-001', {}, { bumpCounter: true });
            await dao.change.updateCycle(db, cr1.id, ChangeCycle.Approved, users.a.id);
            parts = {
                p1: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P001.A', designation: 'PART 1' },
                    { withRev1: null, bumpFamCounter: true }
                ),
                p2: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P002.A', designation: 'PART 2' },
                    { withRev1: null, bumpFamCounter: true }
                ),
                p3: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P003.A', designation: 'PART 3' },
                    { withRev1: null, bumpFamCounter: true }
                ),
            };
            rev1s = {
                p1: await th.createPartRev(db, parts.p1, cr1, users.a, {
                    cycle: PartCycle.Release,
                }),
                p2: await th.createPartRev(db, parts.p2, cr1, users.a, {
                    cycle: PartCycle.Release,
                }),
                p3: await th.createPartRev(db, parts.p3, cr1, users.a, {
                    cycle: PartCycle.Release,
                }),
            };
        });
    });

    afterEach(th.cleanTables(['part_revision', 'part', 'change']));
    afterEach(th.resetFamilyCounters());
    afterEach(th.resetChangeCounter());

    describe('#changeCreate', function () {
        const CHANGEREQ_CREATE = gql`
            mutation CreateChangeReq($input: ChangeInput!) {
                changeCreate(input: $input) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        this.afterEach(
            th.cleanTables([
                'change_part_create',
                'change_part_fork',
                'change_part_revision',
                'change_review',
            ])
        );
        this.afterEach(function () {
            return pool.transaction((db) => {
                return db.query(sql`
                    DELETE FROM change WHERE id != ${cr1.id}
                `);
            });
        });

        it('should create an empty change', async function () {
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
            expect(data.changeCreate).to.deep.include({
                name: 'CR-002',
                description: null,
                cycle: ChangeCycle.Edition,
                state: null,
                partCreations: [],
                partForks: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeCreate.id).to.be.a(idType);
        });

        it('should create a change with a description', async function () {
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
            expect(data.changeCreate).to.deep.include({
                name: 'CR-002',
                description: 'a revolution',
                cycle: ChangeCycle.Edition,
                state: null,
                partCreations: [],
                partForks: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeCreate.id).to.be.a(idType);
        });

        it('should create a change with part creations', async function () {
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
            expect(data.changeCreate).to.containSubset({
                name: 'CR-002',
                description: null,
                cycle: ChangeCycle.Edition,
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
                partForks: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeCreate.id).to.be.a(idType);
        });

        it('should create a change with part change', async function () {
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
                            partForks: [
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
            expect(data.changeCreate).to.containSubset({
                name: 'CR-002',
                description: null,
                cycle: ChangeCycle.Edition,
                state: null,
                partCreations: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeCreate.partForks).to.containSubset([
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
            expect(data.changeCreate.id).to.be.a(idType);
        });

        it('should create a change with part revision', async function () {
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
            expect(data.changeCreate).to.containSubset({
                name: 'CR-002',
                description: null,
                cycle: ChangeCycle.Edition,
                state: null,
                partCreations: [],
                partForks: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeCreate.id).to.be.a(idType);
            expect(data.changeCreate.partRevisions).to.containSubset([
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

        it('should create a change with reviewers', async function () {
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
            expect(data.changeCreate).to.deep.include({
                name: 'CR-002',
                description: null,
                cycle: ChangeCycle.Edition,
                state: null,
                partCreations: [],
                partForks: [],
                partRevisions: [],
                ...trackedBy(users.a),
            });
            expect(data.changeCreate.id).to.be.a(idType);
            expect(data.changeCreate.reviews).to.containSubset([
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
                            partForks: [
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

        it('should not create a change without "change.create"', async function () {
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
        let cr2;
        let reviews;

        this.beforeEach(async function () {
            return pool.transaction(async (db) => {
                cr2 = await th.createChange(
                    db,
                    users.a,
                    'CR-002',
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
                    a: await dao.changeReview.byRequestAndAssigneeId(db, cr2.id, users.a.id),
                    b: await dao.changeReview.byRequestAndAssigneeId(db, cr2.id, users.b.id),
                };
            });
        });

        this.afterEach(
            th.cleanTables([
                'change_part_create',
                'change_part_fork',
                'change_part_revision',
                'change_review',
            ])
        );

        describe('#changeUpdate', function () {
            const CHANGEREQ_UPDATE = gql`
                mutation UpdateChangeReq($id: ID!, $input: ChangeUpdateInput!) {
                    changeUpdate(id: $id, input: $input) {
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
                            id: cr2.id,
                            input: {},
                        },
                    });
                });
                expect(errors).to.be.undefined;
                const partCreations = cr2.partCreations.map((obj) => ({
                    id: obj.id,
                }));
                const partForks = cr2.partForks.map((obj) => ({
                    id: obj.id,
                }));
                const partRevisions = cr2.partRevisions.map((obj) => ({
                    id: obj.id,
                }));
                const reviews = cr2.reviews.map((obj) => ({
                    id: obj.id,
                }));
                expect(data.changeUpdate).to.containSubset({
                    ...cr2,
                    partCreations,
                    partForks,
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
                            id: cr2.id,
                            input: {
                                description: 'An updated change',
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeUpdate).to.deep.include({
                    name: 'CR-002',
                    description: 'An updated change',
                });
                expect(data.changeUpdate.partCreations).to.have.lengthOf(2);
                expect(data.changeUpdate.partForks).to.have.lengthOf(1);
                expect(data.changeUpdate.partRevisions).to.have.lengthOf(1);
                expect(data.changeUpdate.reviews).to.have.lengthOf(2);
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
                            id: cr2.id,
                            input: {
                                description: 'An updated change',
                            },
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('change.update');
                expect(data).to.be.null;
            });

            it('should add a part creation to a change', async function () {
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
                            id: cr2.id,
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
                expect(data.changeUpdate.partCreations).to.have.lengthOf(3);
                expect(data.changeUpdate.partCreations[2]).to.deep.include({
                    family: { id: fam.id },
                    designation: 'PART 5',
                    version: 'B',
                });
            });

            it('should remove a part creation from a change', async function () {
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
                            id: cr2.id,
                            input: {
                                partCreationsRem: [cr2.partCreations[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeUpdate.partCreations).to.have.lengthOf(1);
                expect(data.changeUpdate.partCreations[0].id).to.eql(cr2.partCreations[1].id);
            });

            it('should add a part change to a change', async function () {
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
                            id: cr2.id,
                            input: {
                                partForksAdd: [
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
                expect(data.changeUpdate.partForks).to.have.lengthOf(2);
                expect(data.changeUpdate.partForks[1]).to.deep.include({
                    part: { id: parts.p3.id },
                    version: 'B',
                    comments: 'this part doesnt work either',
                });
            });

            it('should remove a part change from a change', async function () {
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
                            id: cr2.id,
                            input: {
                                partForksRem: [cr2.partForks[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeUpdate.partForks).to.have.lengthOf(0);
            });

            it('should add a part revision to a change', async function () {
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
                            id: cr2.id,
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
                expect(data.changeUpdate.partRevisions).to.have.lengthOf(2);
                expect(data.changeUpdate.partRevisions[1]).to.deep.include({
                    part: { id: parts.p3.id },
                });
            });

            it('should remove a part revision from a change', async function () {
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
                            id: cr2.id,
                            input: {
                                partRevisionsRem: [cr2.partRevisions[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeUpdate.partRevisions).to.have.lengthOf(0);
            });

            it('should add a review to a change', async function () {
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
                            id: cr2.id,
                            input: {
                                reviewerIdsAdd: [users.c.id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeUpdate.reviews).to.have.lengthOf(3);
                expect(data.changeUpdate.reviews[2]).to.deep.include({
                    assignee: { id: users.c.id },
                });
            });

            it('should remove a review from a change', async function () {
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
                            id: cr2.id,
                            input: {
                                reviewsRem: [cr2.reviews[0].id],
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeUpdate.reviews).to.have.lengthOf(1);
                expect(data.changeUpdate.reviews[0].id).to.eql(cr2.reviews[1].id);
            });
        });

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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                const partCreations = cr2.partCreations.map((obj) => ({
                    id: obj.id,
                }));
                const partForks = cr2.partForks.map((obj) => ({
                    id: obj.id,
                }));
                const partRevisions = cr2.partRevisions.map((obj) => ({
                    id: obj.id,
                }));
                const reviews = cr2.reviews.map((obj) => ({
                    id: obj.id,
                }));
                expect(data.changeSubmit).to.containSubset({
                    description: cr2.description,
                    cycle: ChangeCycle.Validation,
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('change.update');
            });

            it('should not submit a change that is in APPROVED state', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Approved, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('APPROVED');
            });

            it('should not start a change validation from unauthorized user', async function () {
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
                            id: cr2.id,
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
                    dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id)
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
                            id: cr2.id,
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
                        id: cr2.id,
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
                            id: cr2.id,
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
                        id: cr2.id,
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
                            id: cr2.id,
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
                        id: cr2.id,
                        state: ApprovalDecision.Pending, // pending users.b's decision
                    },
                });
            });

            it('should not review a change without "change.review"', async function () {
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
                            id: cr2.id,
                            input: {
                                decision: ApprovalDecision.Rejected,
                            },
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('change.review');
            });

            it('should not review a change.change if not assigned', async function () {
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
                            id: cr2.id,
                            input: {
                                decision: ApprovalDecision.Rejected,
                            },
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain(users.c.fullName);
            });

            it('should not allow to review a change not in validation', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Edition, users.a.id);
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
                            id: cr2.id,
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
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeWithdraw).to.containSubset({
                    id: cr2.id,
                    description: 'A change',
                    cycle: ChangeCycle.Edition,
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('EDITION');
            });

            it('should not withdraw a change from APPROVED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Approved, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('APPROVED');
            });

            it('should not withdraw a change from CANCELLED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Cancelled, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('CANCELLED');
            });

            it('should not withdraw a change without "change.update"', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('change.update');
            });

            it('should not withdraw a change from unauthorized editor', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id);
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
                            id: cr2.id,
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
                        dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id),
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeApprove.createdParts).to.have.lengthOf(3);
                expect(data.changeApprove.revisedParts).to.have.lengthOf(1);
                expect(data.changeApprove).to.containSubset({
                    id: cr2.id,
                    name: 'CR-002',
                    description: 'A change',
                    cycle: ChangeCycle.Approved,
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('EDITION');
            });

            it('should not approve a change in CANCELLED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Cancelled, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('CANCELLED');
            });

            it('should not approve a change that has missing approvals', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.undefined;
                expect(errors[0].message).to.contain('approval');
            });

            it('should not approve a change from unauthorized editor', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await Promise.all([
                        dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id),
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
                            id: cr2.id,
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
            it('should cancel a change from EDITION cycle', async function () {
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeCancel).to.containSubset({
                    id: cr2.id,
                    description: 'A change',
                    cycle: ChangeCycle.Cancelled,
                });
            });

            it('should cancel a change from VALIDATION cycle', async function () {
                const { errors, data } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Validation, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.changeCancel).to.containSubset({
                    id: cr2.id,
                    description: 'A change',
                    cycle: ChangeCycle.Cancelled,
                });
            });

            it('should not cancel a change from APPROVED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Approved, users.a.id);
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain('APPROVED');
            });

            it('should not cancel a change from CANCELLED cycle', async function () {
                const { errors } = await pool.transaction(async (db) => {
                    await dao.change.updateCycle(db, cr2.id, ChangeCycle.Cancelled, users.a.id);
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
                            id: cr2.id,
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
                            id: cr2.id,
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
                            id: cr2.id,
                        },
                    });
                });
                expect(errors).to.not.be.empty;
                expect(errors[0].message).to.contain(users.c.fullName);
            });
        });
    });
});
