import {
    cleanTables,
    createPart,
    createPartBase,
    createPartFamily,
    createPartRev,
    createUsersAB,
    trackedBy,
} from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';
import { TRACKED_FIELDS } from './helpers';

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
            users = await createUsersAB(db);
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

    it('should query a Part', async function() {
        const { errors, data } = await pool.connect(async db => {
            const { query } = buildGqlServer(db, permsAuth(users.a, ['part.read', 'user.read']));
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

    it('should query a part revision', async function() {
        const { errors, data } = await pool.transaction(async db => {
            const { query } = buildGqlServer(db, permsAuth(users.a, ['part.read', 'user.read']));
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
