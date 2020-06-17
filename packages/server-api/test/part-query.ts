import { expect } from 'chai';
import gql from 'graphql-tag';
import { Dict, trackedBy } from '@engspace/server-db';
import { ApprovalDecision, PartApproval, PartCycle } from '@engspace/core';
import { permsAuth } from './auth';
import { TRACKED_FIELDS, PART_FIELDS, PARTREV_FIELDS } from './helpers';
import { buildGqlServer, pool, th } from '.';

const PARTVAL_FIELDS = gql`
    fragment PartValFields on PartValidation {
        id
        partRev {
            id
        }
        state
        result
        comments
        approvals {
            id
        }
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

const PARTAPPR_FIELDS = gql`
    fragment PartApprFields on PartApproval {
        id
        validation {
            id
        }
        assignee {
            id
        }
        decision
        comments
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

const PART_READ = gql`
    query ReadPart($id: ID!) {
        part(id: $id) {
            ...PartFields
        }
    }
    ${PART_FIELDS}
`;

const PARTREV_READ = gql`
    query ReadPartRev($id: ID!) {
        partRevision(id: $id) {
            ...PartRevFields
        }
    }
    ${PARTREV_FIELDS}
`;

const PARTVAL_READ = gql`
    query ReadPartVal($id: ID!) {
        partValidation(id: $id) {
            ...PartValFields
        }
    }
    ${PARTVAL_FIELDS}
`;

const PARTAPPR_READ = gql`
    query ReadPartAppr($id: ID!) {
        partApproval(id: $id) {
            ...PartApprFields
        }
    }
    ${PARTAPPR_FIELDS}
`;

describe('GraphQL Part - Queries', function () {
    let users;
    let family;
    let ch;
    let part;
    let partRev;
    let bef, aft;
    before('create res', async function () {
        bef = Date.now();
        await pool.transaction(async (db) => {
            users = await th.createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
                d: { name: 'd' },
                e: { name: 'e' },
            });
            family = await th.createPartFamily(db, { code: 'P' });
            ch = await th.createChange(db, users.a);
            part = await th.createPart(db, family, users.a, {});
            partRev = await th.createPartRev(db, part, ch, users.a);
        });
        aft = Date.now();
    });
    after('delete res', th.cleanTables(['part_revision', 'part', 'change', 'part_family', 'user']));

    describe('Part', function () {
        it('should query a Part', async function () {
            const { errors, data } = await pool.connect(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'partfamily.read', 'user.read'])
                );
                return query({
                    query: PART_READ,
                    variables: {
                        id: part.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.part).to.deep.include({
                id: part.id,
                family: { id: family.id },
                ref: 'P001.A',
                createdBy: { id: users.a.id },
                updatedBy: { id: users.a.id },
            });
            expect(data.part.createdAt).to.be.gt(bef).and.lt(aft);
            expect(data.part.updatedAt).to.equal(data.part.createdAt);
        });

        it('should not query a Part without "part.read"', async function () {
            const { errors, data } = await pool.connect(async (db) => {
                const { query } = buildGqlServer(db, permsAuth(users.a, ['user.read']));
                return query({
                    query: PART_READ,
                    variables: {
                        id: part.id,
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.read');
            expect(data.part).to.be.null;
        });
    });

    describe('PartRevision', function () {
        it('should query a part revision', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'user.read'])
                );
                return query({
                    query: PARTREV_READ,
                    variables: {
                        id: partRev.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partRevision).to.deep.include({
                id: partRev.id,
                revision: partRev.revision,
                designation: partRev.designation,
                // change: {
                //     id: req.id,
                // }
                cycle: PartCycle.Edition,
            });
        });

        it('should not query a part revision without "part.read"', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { query } = buildGqlServer(db, permsAuth(users.a, ['user.read']));
                return query({
                    query: PARTREV_READ,
                    variables: {
                        id: partRev.id,
                    },
                });
            });
            expect(errors).to.be.not.empty;
            expect(errors[0].message).to.contain('part.read');
            expect(data.partRevision).to.null;
        });
    });

    describe('Validation', function () {
        let partVal;
        let approvals: Dict<PartApproval>;

        before(async function () {
            return pool.transaction(async (db) => {
                partVal = await th.createPartVal(db, partRev, users.a);
                approvals = await th.createPartApprovals(db, partVal, users, users.a);
            });
        });
        after(th.cleanTables(['part_approval', 'part_validation']));

        it('should read part validation', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.read', 'part.read', 'user.read'])
                );
                return query({
                    query: PARTVAL_READ,
                    variables: { id: partVal.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partValidation).to.deep.include({
                ...partVal,
                state: ApprovalDecision.Pending,
                ...trackedBy(users.a),
            });
            expect(data.partValidation.approvals).to.have.same.deep.members(
                Object.values(approvals).map((a) => ({
                    id: a.id,
                }))
            );
        });

        it('should not read part validation without "partval.read"', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'user.read'])
                );
                return query({
                    query: PARTVAL_READ,
                    variables: { id: partVal.id },
                });
            });
            expect(errors).to.be.not.empty;
            expect(errors[0].message).to.contain('partval.read');
            expect(data.partValidation).to.be.null;
        });

        it('should read part approval', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partval.read', 'part.read', 'user.read'])
                );
                return query({
                    query: PARTAPPR_READ,
                    variables: { id: approvals.d.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.partApproval).to.deep.include({
                ...approvals.d,
                ...trackedBy(users.a),
            });
        });

        it('should read part approval without "partval.read"', async function () {
            const { errors, data } = await pool.transaction(async (db) => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'user.read'])
                );
                return query({
                    query: PARTAPPR_READ,
                    variables: { id: approvals.d.id },
                });
            });
            expect(errors).to.be.not.empty;
            expect(errors[0].message).to.contain('partval.read');
            expect(data.partApproval).to.be.null;
        });
    });
});
