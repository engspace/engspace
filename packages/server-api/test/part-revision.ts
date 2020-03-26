import {
    cleanTables,
    createPart,
    createPartBase,
    createPartFamily,
    createUsersAB,
    createPartRev,
    cleanTable,
} from '../../server-db/src/test-helpers';
import { pool, buildGqlServer } from '.';
import { permsAuth } from './auth';
import gql from 'graphql-tag';
import { TRACKED_FIELDS } from './helpers';
import { expect } from 'chai';

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

const PARTREV_READ = gql`
    query ReadPartRev($id: ID!) {
        partRevision(id: $id) {
            ...PartRevFields
        }
    }
    ${PARTREV_FIELDS}
`;

describe('GraphQL PartRevision', function() {
    let users;
    let fam;
    let partBase;
    let part;
    before('create deps', async function() {
        return pool.transaction(async db => {
            users = await createUsersAB(db);
            fam = await createPartFamily(db, { code: 'P' });
            partBase = await createPartBase(db, fam, users.a, 'P01');
            part = await createPart(db, partBase, users.a, 'P01.A');
        });
    });
    after('clean deps', cleanTables(pool, ['part', 'part_base', 'part_family', 'user']));

    describe('Query', function() {
        let partRev;
        before(async function() {
            partRev = await pool.transaction(async db => {
                return createPartRev(db, part, users.a);
            });
        });
        after(cleanTable(pool, 'part_revision'));

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
    });
});
