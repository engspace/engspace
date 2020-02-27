import {
    asyncKeyMap,
    DemoPartFamilyInputSet,
    DemoPartFamilySet,
    prepareUsers,
} from '@engspace/demo-data-input';
import { Db, partFamilyDao, userDao } from '@engspace/server-db';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';
import { createUsers } from './user';

export async function createPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    return asyncKeyMap(input, async pf => partFamilyDao.create(db, pf));
}

const PARTFAM_FIELDS = gql`
    fragment PartFamFields on PartFamily {
        id
        name
        code
    }
`;

const PARTFAM_READ = gql`
    query ReadPartFamiliy($id: ID!) {
        partFamily(id: $id) {
            ...PartFamFields
        }
    }
    ${PARTFAM_FIELDS}
`;

describe('GraphQL PartFamilies', function() {
    let users;
    before('Create users and projects', async function() {
        return pool.transaction(async db => {
            users = await createUsers(db, prepareUsers());
        });
    });

    after('Delete users and projects', async function() {
        return pool.transaction(async db => {
            await userDao.deleteAll(db);
        });
    });
    describe('Query', function() {
        let families;
        before('Create part families', async function() {
            families = await pool.transaction(async db => {
                return createPartFamilies(db, {
                    fam1: {
                        name: 'family 1',
                        code: '1',
                    },
                    fam2: {
                        name: 'family 2',
                        code: '2',
                    },
                    fam3: {
                        name: 'family 3',
                        code: '3',
                    },
                });
            });
        });
        after('Delete part families', async function() {
            await pool.transaction(async db => partFamilyDao.deleteAll(db));
        });

        it('should read part families', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.sophie, ['partfamily.read']));
                return query({
                    query: PARTFAM_READ,
                    variables: {
                        id: families.fam2.id,
                    },
                });
            });
            console.log(errors);
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.partFamily).to.deep.include({
                name: 'family 2',
                code: '2',
            });
        });
    });
});
