import { ApprovalDecision, PartCycle } from '@engspace/core';
import { idType, trackedBy } from '@engspace/server-db';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, dao, pool, th } from '.';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';

describe('GraphQL ChangeRequest - Mutations', function() {
    let users;
    let fam;
    let parts;
    before(async function() {
        return pool.transaction(async db => {
            users = await th.createUsersAB(db);
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
            };
        });
    });
    after(th.cleanTables(['part_revision'], { withDeps: true }));

    describe('changeRequestCreate', function() {
        const CHANGEREQ_CREATE = gql`
            mutation CreateChangeReq($input: ChangeRequestInput!) {
                changeRequestCreate(input: $input) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        let rev1s;

        this.beforeEach(async function() {
            return pool.transaction(async db => {
                rev1s = {
                    p1: await th.createPartRev(db, parts.p1, users.a, {
                        cycle: PartCycle.Release,
                    }),
                    p2: await th.createPartRev(db, parts.p2, users.a, {
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

        it('should create an empty change request', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
                partCreations: [],
                partChanges: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
        });

        it('should create a change request with a description', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
                partCreations: [],
                partChanges: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
        });

        it('should create a change request with part creations', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
            expect(data.changeRequestCreate).to.deep.include({
                description: null,
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

        it('should create a change request with part change', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
            expect(data.changeRequestCreate).to.deep.include({
                description: null,
                partCreations: [],
                partRevisions: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.partChanges).to.have.same.deep.members([
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

        it('should create a change request with part revision', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
            expect(data.changeRequestCreate).to.deep.include({
                description: null,
                partCreations: [],
                partChanges: [],
                reviews: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
            expect(data.changeRequestCreate.partRevisions).to.have.same.deep.members([
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

        it('should create a change request with reviewers', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
                partCreations: [],
                partChanges: [],
                partRevisions: [],
                ...trackedBy(users.a),
            });
            expect(data.changeRequestCreate.id).to.be.a(idType);
            expect(data.changeRequestCreate.reviews).to.have.same.deep.members([
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

        it('should not allow a part change with the same version', async function() {
            const { errors, data } = await pool.transaction(async db => {
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

        it('should not allow a revision of part in edition', async function() {
            await pool.transaction(async db => {
                return dao.partRevision.updateCycleState(db, rev1s.p1.id, PartCycle.Edition);
            });
            const { errors, data } = await pool.transaction(async db => {
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

        it('should not create a change request without "change.create"', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
});
