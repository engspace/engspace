import { expect } from 'chai';
import { pool } from '.';
import { partBaseDao } from '../src';
import { cleanTables, createPartFamilies, createUsersAB } from '../src/test-helpers';

describe('partBaseDao', function() {
    let users;
    let families;
    before(async function() {
        return pool.transaction(async db => {
            users = await createUsersAB(db);
            families = await createPartFamilies(db, {
                rm: { code: 'RM', name: 'Raw material' },
                tf: { code: 'TF', name: 'Transformed' },
            });
        });
    });
    after(cleanTables(pool, ['part_family', 'user']));

    describe('Create', function() {
        const msBef = Date.now();
        afterEach('delete part bases', async function() {
            await pool.transaction(async db => partBaseDao.deleteAll(db));
        });
        it('should create part base', async function() {
            const pb = await pool.transaction(async db => {
                return partBaseDao.create(db, {
                    familyId: families.rm.id,
                    baseRef: 'RM0001',
                    designation: 'water',
                    userId: users.a.id,
                });
            });
            expect(pb).to.deep.include({
                family: { id: families.rm.id },
                baseRef: 'RM0001',
                designation: 'water',
                createdBy: { id: users.a.id },
                updatedBy: { id: users.a.id },
            });
            expect(pb.id).to.be.uuid();
            expect(pb.createdAt)
                .to.be.gt(msBef)
                .and.lt(Date.now());
            expect(pb.updatedAt)
                .to.be.gt(msBef)
                .and.lt(Date.now());
        });
    });
});
