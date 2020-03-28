import {
    cleanTables,
    createPart,
    createPartBase,
    createPartFamily,
    createPartRev,
    createUsers,
    trackedBy,
    createPartVal,
    createPartApprovals,
} from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';
import { TRACKED_FIELDS } from './helpers';
import { ApprovalState, PartApproval } from '@engspace/core';
import { Dict } from '@engspace/server-db/src/test-helpers';

const PARTBASE_FIELDS = gql`
    fragment PartBaseFields on PartBase {
        id
        baseRef
        designation
        family {
            id
        }
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

const PART_FIELDS = gql`
    fragment PartFields on Part {
        id
        base {
            id
        }
        ref
        designation
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

const PARTREV_FIELDS = gql`
    fragment PartRevFields on PartRevision {
        id
        part {
            id
        }
        revision
        designation
        cycleState
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

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
        state
        comments
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

const PARTBASE_READ = gql`
    query ReadPartBase($id: ID!) {
        partBase(id: $id) {
            ...PartBaseFields
        }
    }
    ${PARTBASE_FIELDS}
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

describe('GraphQL Part - Queries', function() {
    let users;
    let family;
    let partBase;
    let part;
    let partRev;
    let bef, aft;
    before('create res', async function() {
        bef = Date.now();
        await pool.transaction(async db => {
            users = await createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
                d: { name: 'd' },
                e: { name: 'e' },
            });
            family = await createPartFamily(db, { code: 'P' });
            partBase = await createPartBase(db, family, users.a, 'P001', { designation: 'Part 1' });
            part = await createPart(db, partBase, users.a, 'P001.01');
            partRev = await createPartRev(db, part, users.a);
        });
        aft = Date.now();
    });
    after(
        'delete res',
        cleanTables(pool, ['part_revision', 'part', 'part_base', 'part_family', 'user'])
    );

    describe('PartBase', function() {
        it('should query a part base', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partfamily.read', 'user.read', 'part.read'])
                );
                return query({
                    query: PARTBASE_READ,
                    variables: {
                        id: partBase.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.partBase).to.deep.include({
                id: partBase.id,
                baseRef: 'P001',
                designation: 'Part 1',
                family: { id: family.id },
                ...trackedBy(users.a),
            });
            expect(data.partBase.createdAt)
                .to.be.gte(bef)
                .and.lte(aft);
            expect(data.partBase.updatedAt)
                .to.be.gte(bef)
                .and.lte(aft);
        });

        it('should not query a part base without "part.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['partfamily.read', 'user.read'])
                );
                return query({
                    query: PARTBASE_READ,
                    variables: {
                        id: partBase.id,
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.read');
            expect(data.partBase).to.be.null;
        });
    });

    describe('Part', function() {
        it('should query a Part', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['part.read', 'user.read'])
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
                base: { id: partBase.id },
                ref: 'P001.01',
                createdBy: { id: users.a.id },
                updatedBy: { id: users.a.id },
            });
            expect(data.part.createdAt)
                .to.be.gt(bef)
                .and.lt(aft);
            expect(data.part.updatedAt).to.equal(data.part.createdAt);
        });

        it('should not query a Part without "part.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
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

    describe('PartRevision', function() {
        it('should query a part revision', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
            expect(data.partRevision).to.deep.include(partRev);
        });

        it('should not query a part revision without "part.read"', async function() {
            const { errors, data } = await pool.transaction(async db => {
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

    describe('Validation', function() {
        let partVal;
        let approvals: Dict<PartApproval>;

        before(async function() {
            return pool.transaction(async db => {
                partVal = await createPartVal(db, partRev, users.a);
                approvals = await createPartApprovals(db, partVal, users, users.a);
            });
        });
        after(cleanTables(pool, ['part_approval', 'part_validation']));

        it('should read part validation', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
                state: ApprovalState.Pending,
                ...trackedBy(users.a),
            });
            expect(data.partValidation.approvals).to.have.same.deep.members(
                Object.values(approvals).map(a => ({
                    id: a.id,
                }))
            );
        });

        it('should not read part validation without "partval.read"', async function() {
            const { errors, data } = await pool.transaction(async db => {
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

        it('should read part approval', async function() {
            const { errors, data } = await pool.transaction(async db => {
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

        it('should read part approval without "partval.read"', async function() {
            const { errors, data } = await pool.transaction(async db => {
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
