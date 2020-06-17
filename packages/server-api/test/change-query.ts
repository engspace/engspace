import { expect } from 'chai';
import gql from 'graphql-tag';
import { ApprovalDecision, ChangeCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';
import { buildGqlServer, pool, th } from '.';

describe('GraphQL Change - Queries', function () {
    let users;
    let fam;
    let cr1;
    let parts;
    let cr2;
    before(async function () {
        return pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            fam = await th.createPartFamily(db);
            cr1 = await th.createChange(db, users.a, 'CR-001');
            parts = {
                p1: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P001.A', designation: 'PART 1' },
                    { withRev1: { change: cr1 }, bumpFamCounter: true }
                ),
                p2: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P002.A', designation: 'PART 2' },
                    { withRev1: { change: cr1 }, bumpFamCounter: true }
                ),
            };
            cr2 = await th.createChange(db, users.a, 'CR-002', {
                description: 'A change',
                partCreations: [
                    {
                        familyId: fam.id,
                        designation: 'PART 3',
                        version: 'A',
                    },
                    {
                        familyId: fam.id,
                        designation: 'PART 4',
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
            });
        });
    });
    after(
        th.cleanTables(
            [
                'change_part_create',
                'change_part_fork',
                'change_part_revision',
                'change_review',
                'part_revision',
            ],
            { withDeps: true }
        )
    );
    describe('#change', function () {
        const CHANGEREQ_READ = gql`
            query ReadChangeReq($id: ID!) {
                change(id: $id) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        it('should read a Change', async function () {
            const { errors, data } = await pool.connect(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
                );
                return query({
                    query: CHANGEREQ_READ,
                    variables: {
                        id: cr2.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.change).to.containSubset({
                id: cr2.id,
                description: 'A change',
                cycle: ChangeCycle.Preparation,
                state: null,
                partCreations: [
                    {
                        family: { id: fam.id },
                        designation: 'PART 3',
                        version: 'A',
                        comments: null,
                    },
                    {
                        family: { id: fam.id },
                        designation: 'PART 4',
                        version: 'K',
                        comments: null,
                    },
                ],
                partForks: [
                    {
                        part: { id: parts.p1.id },
                        designation: null,
                        version: 'B',
                        comments: "this part doesn't work",
                    },
                ],
                partRevisions: [
                    {
                        part: { id: parts.p2.id },
                        designation: null,
                        comments: null,
                    },
                ],
                reviews: [
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
                ],
            });
        });

        it('should not read a Change without "change.read"', async function () {
            const { errors, data } = await pool.connect(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'partfamily.read', 'user.read'])
                );
                return query({
                    query: CHANGEREQ_READ,
                    variables: {
                        id: cr2.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('change.read');
            expect(data.change).to.be.null;
        });
    });
});
