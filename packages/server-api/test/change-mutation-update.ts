import { expect } from 'chai';
import gql from 'graphql-tag';
import { PartCycle, ChangeCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';
import { buildGqlServer, dao, pool, th } from '.';

describe('GraphQL Change - Mutations - Update', function () {
    let users;
    let fam;
    let ch1;
    let parts;
    let ch2;

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
                        id: ch2.id,
                        input: {},
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
            expect(data.changeUpdate).to.containSubset({
                ...ch2,
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
                        id: ch2.id,
                        input: {
                            description: 'An updated change',
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeUpdate).to.deep.include({
                name: 'CH-002',
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
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
                );
                return mutate({
                    mutation: CHANGEREQ_UPDATE,
                    variables: {
                        id: ch2.id,
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
                        id: ch2.id,
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
                        id: ch2.id,
                        input: {
                            partCreationsRem: [ch2.partCreations[0].id],
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeUpdate.partCreations).to.have.lengthOf(1);
            expect(data.changeUpdate.partCreations[0].id).to.eql(ch2.partCreations[1].id);
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
                        id: ch2.id,
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
                        id: ch2.id,
                        input: {
                            partForksRem: [ch2.partForks[0].id],
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
                        id: ch2.id,
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
                        id: ch2.id,
                        input: {
                            partRevisionsRem: [ch2.partRevisions[0].id],
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
                        id: ch2.id,
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
                        id: ch2.id,
                        input: {
                            reviewsRem: [ch2.reviews[0].id],
                        },
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeUpdate.reviews).to.have.lengthOf(1);
            expect(data.changeUpdate.reviews[0].id).to.eql(ch2.reviews[1].id);
        });
    });
});
