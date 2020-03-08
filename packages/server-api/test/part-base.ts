import { expect } from 'chai';
import gql from 'graphql-tag';
import { pool, buildGqlServer } from '.';
import { permsAuth } from './auth';
import {
    cleanTables,
    createSingleFamily,
    createSingleUser,
    cleanTable,
    resetFamilyCounters,
} from './helpers';
import { partBaseDao } from '@engspace/server-db';

const PARTBASE_FIELDS = gql`
    fragment PartBaseFields on PartBase {
        id
        baseRef
        designation
        family {
            id
        }
        createdBy {
            id
        }
        updatedBy {
            id
        }
        createdAt
        updatedAt
    }
`;

const PARTBASE_READ = gql`
    query ReadPartBase($id: ID!) {
        partBase(id: $id) {
            ...PartBaseFields
        }
    }
    ${PARTBASE_FIELDS}
`;

const PARTBASE_CREATE = gql`
    mutation CreatePartBase($partBase: PartBaseInput!) {
        partBaseCreate(partBase: $partBase) {
            ...PartBaseFields
        }
    }
    ${PARTBASE_FIELDS}
`;

describe('GraphQL PartBase', function() {
    let user;
    let family;
    before(async function() {
        [user, family] = await pool.transaction(async db => {
            return Promise.all([createSingleUser(db), createSingleFamily(db)]);
        });
    });
    after(cleanTables(['part_family', 'user']));

    describe('Query', function() {
        let parts;
        let bef;
        let aft;
        before('create parts', async function() {
            bef = Date.now();
            parts = await pool.transaction(async db => {
                return Promise.all(
                    [1, 2, 3, 4].map(n =>
                        partBaseDao.create(
                            db,
                            { familyId: family.id, designation: `Part ${n}` },
                            `P00${n}`,
                            user.id
                        )
                    )
                );
            });
            aft = Date.now();
        });
        after('delete parts', cleanTable('part_base'));

        it('should query a part', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read'])
                );
                return query({
                    query: PARTBASE_READ,
                    variables: {
                        id: parts[2].id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.partBase).to.deep.include({
                id: parts[2].id,
                baseRef: 'P003',
                designation: 'Part 3',
                family: { id: family.id },
                createdBy: { id: user.id },
                updatedBy: { id: user.id },
            });
            expect(data.partBase.createdAt)
                .to.be.gte(bef)
                .and.lte(aft);
            expect(data.partBase.updatedAt)
                .to.be.gte(bef)
                .and.lte(aft);
        });

        it('should not query a part without "part.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read'])
                );
                return query({
                    query: PARTBASE_READ,
                    variables: {
                        id: parts[2].id,
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('part.read');
            expect(data).to.be.null;
        });
    });

    describe('Mutation', function() {
        afterEach(cleanTable('part_base'));
        afterEach(resetFamilyCounters());

        it('should create a PartBase', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(
                    db,
                    permsAuth(user, ['partfamily.read', 'user.read', 'part.read', 'part.create'])
                );
                return mutate({
                    mutation: PARTBASE_CREATE,
                    variables: {
                        partBase: {
                            familyId: family.id,
                            designation: 'Part',
                        },
                    },
                });
            });
            console.log(errors);
            expect(errors).to.be.undefined;
            expect(data.partBaseCreate).to.deep.include({
                family: { id: family.id },
                baseRef: 'P001',
                designation: 'Part',
                createdBy: { id: user.id },
                updatedBy: { id: user.id },
            });
            expect(data.partBaseCreate.id).to.be.uuid();
            expect(data.partBaseCreate.createdAt).to.be.a('number');
            expect(data.partBaseCreate.updatedAt).to.be.a('number');
        });
    });
});
