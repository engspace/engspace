import { expect } from 'chai';
import gql from 'graphql-tag';
import { sql } from 'slonik';
import { idType, trackedBy } from '@engspace/server-db';
import { ApprovalDecision, PartCycle, ChangeCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';
import { buildGqlServer, dao, pool, th } from '.';

describe('GraphQL Change - Create', function () {
    let users;
    let fam;
    let ch1;
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
            ch1 = await th.createChange(db, users.a, 'CH-001', {}, { bumpCounter: true });
            await dao.change.updateCycle(db, ch1.id, ChangeCycle.Engineering, users.a.id);
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
                p1: await th.createPartRev(db, parts.p1, ch1, users.a, {
                    cycle: PartCycle.Release,
                }),
                p2: await th.createPartRev(db, parts.p2, ch1, users.a, {
                    cycle: PartCycle.Release,
                }),
                p3: await th.createPartRev(db, parts.p3, ch1, users.a, {
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
                    DELETE FROM change WHERE id != ${ch1.id}
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
                name: 'CH-002',
                description: null,
                cycle: ChangeCycle.Preparation,
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
                name: 'CH-002',
                description: 'a revolution',
                cycle: ChangeCycle.Preparation,
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
                name: 'CH-002',
                description: null,
                cycle: ChangeCycle.Preparation,
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
                name: 'CH-002',
                description: null,
                cycle: ChangeCycle.Preparation,
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
                name: 'CH-002',
                description: null,
                cycle: ChangeCycle.Preparation,
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
                name: 'CH-002',
                description: null,
                cycle: ChangeCycle.Preparation,
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
});
