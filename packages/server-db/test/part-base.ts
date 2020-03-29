import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('PartBaseDao', function() {
    let users;
    let families;
    before(async function() {
        return pool.transaction(async db => {
            users = await th.createUsersAB(db);
            families = await th.createPartFamilies(db, {
                rm: { code: 'RM', name: 'Raw material' },
                tf: { code: 'TF', name: 'Transformed' },
            });
        });
    });
    after(th.cleanTables(['part_family', 'user']));

    describe('Create', function() {
        const msBef = Date.now();
        afterEach('delete part bases', async function() {
            await pool.transaction(async db => dao.partBase.deleteAll(db));
        });
        it('should create part base', async function() {
            const pb = await pool.transaction(async db => {
                return dao.partBase.create(db, {
                    familyId: families.rm.id,
                    baseRef: 'RM0001',
                    userId: users.a.id,
                });
            });
            expect(pb).to.deep.include({
                family: { id: families.rm.id },
                baseRef: 'RM0001',
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
