import { ApprovalDecision, ChangeRequestCycle } from '@engspace/core';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool, th } from '.';
import { permsAuth } from './auth';
import { CHANGEREQ_DEEPFIELDS } from './helpers';

describe('GraphQL ChangeRequest - Queries', function () {
    let users;
    let fam;
    let parts;
    let req;
    before(async function () {
        return pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            fam = await th.createPartFamily(db);
            parts = {
                p1: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P001.A', designation: 'PART 1' },
                    { withRev1: true, bumpFamCounter: true }
                ),
                p2: await th.createPart(
                    db,
                    fam,
                    users.a,
                    { ref: 'P002.A', designation: 'PART 2' },
                    { withRev1: true, bumpFamCounter: true }
                ),
            };
            req = await th.createChangeRequest(db, users.a, {
                description: 'A change request',
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
    after(
        th.cleanTables(
            [
                'change_part_create',
                'change_part_change',
                'change_part_revision',
                'change_review',
                'part_revision',
            ],
            { withDeps: true }
        )
    );
    describe('changeRequest', function () {
        const CHANGEREQ_READ = gql`
            query ReadChangeReq($id: ID!) {
                changeRequest(id: $id) {
                    ...ChangeReqDeepFields
                }
            }
            ${CHANGEREQ_DEEPFIELDS}
        `;

        it('should read a ChangeRequest', async function () {
            const { errors, data } = await pool.connect(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['change.read', 'part.read', 'partfamily.read', 'user.read'])
                );
                return query({
                    query: CHANGEREQ_READ,
                    variables: {
                        id: req.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.changeRequest).to.containSubset({
                id: req.id,
                description: 'A change request',
                cycle: ChangeRequestCycle.Edition,
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
                partChanges: [
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

        it('should not read a ChangeRequest without "change.read"', async function () {
            const { errors, data } = await pool.connect(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'partfamily.read', 'user.read'])
                );
                return query({
                    query: CHANGEREQ_READ,
                    variables: {
                        id: req.id,
                    },
                });
            });
            expect(errors).to.not.be.empty;
            expect(errors[0].message).to.contain('change.read');
            expect(data.changeRequest).to.be.null;
        });
    });
});
