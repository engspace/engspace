import { CycleState } from '@engspace/core';
import { partBaseDao, partDao, partFamilyDao, partRevisionDao } from '@engspace/server-db';
import {
    cleanTables,
    createPartFamily,
    createUser,
    resetFamilyCounters,
    trackedBy,
} from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';
import { TRACKED_FIELDS } from './helpers';

describe('GraphQL Part - Mutations', function() {
    let userA;
    let family;
    before('create res', async function() {
        return pool.transaction(async db => {
            userA = await createUser(db, {
                name: 'user.a',
            });
            family = await createPartFamily(db, { code: 'P' });
        });
    });
    after('delete res', cleanTables(pool, ['part_base', 'part_family', 'user']));

    afterEach(cleanTables(pool, ['part_revision', 'part', 'part_base']));
    afterEach(resetFamilyCounters(pool));

    it('should create a new Part', async function() {
        const { errors, data } = await pool.transaction(async db => {
            const { mutate } = buildGqlServer(
                db,
                permsAuth(userA, ['part.create', 'part.read', 'partfamily.read', 'user.read'])
            );
            return mutate({
                mutation: gql`
                    mutation CreateNewPart($input: PartCreateNewInput!) {
                        partCreateNew(input: $input) {
                            id
                            revision
                            cycleState
                            designation
                            ...TrackedFields
                            part {
                                id
                                designation
                                ref
                                ...TrackedFields
                                base {
                                    id
                                    baseRef
                                    designation
                                    family {
                                        id
                                    }
                                    ...TrackedFields
                                }
                            }
                        }
                    }
                    ${TRACKED_FIELDS}
                `,
                variables: {
                    input: {
                        familyId: family.id,
                        initialVersion: '01',
                        designation: 'SOME NEW PART',
                    },
                },
            });
        });
        expect(errors).to.be.undefined;
        expect(data.partCreateNew).to.deep.include({
            revision: 1,
            designation: 'SOME NEW PART',
            cycleState: CycleState.Edition,
            ...trackedBy(userA),
        });
        expect(data.partCreateNew.part).to.deep.include({
            ref: 'P001.01',
            designation: 'SOME NEW PART',
            ...trackedBy(userA),
        });
        expect(data.partCreateNew.part.base).to.deep.include({
            baseRef: 'P001',
            designation: 'SOME NEW PART',
            ...trackedBy(userA),
            family: { id: family.id },
        });
    });

    it('should not create a new Part without "part.create"', async function() {
        const { errors, data } = await pool.transaction(async db => {
            const { mutate } = buildGqlServer(
                db,
                permsAuth(userA, ['part.read', 'partfamily.read', 'user.read'])
            );
            return mutate({
                mutation: gql`
                    mutation CreateNewPart($input: PartCreateNewInput!) {
                        partCreateNew(input: $input) {
                            id
                        }
                    }
                `,
                variables: {
                    input: {
                        familyId: family.id,
                        initialVersion: '01',
                        designation: 'SOME NEW PART',
                    },
                },
            });
        });
        expect(errors).to.be.not.empty;
        expect(errors[0].message).to.contain('part.create');
        expect(data).to.be.null;
        const counts = await pool.transaction(async db => {
            return [
                await partBaseDao.rowCount(db),
                await partDao.rowCount(db),
                await partRevisionDao.rowCount(db),
                (await partFamilyDao.byId(db, family.id)).counter,
            ];
        });
        expect(counts).to.eql([0, 0, 0, 0]);
    });
});
