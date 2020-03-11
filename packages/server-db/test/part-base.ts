import { expect } from 'chai';
import { pool } from '.';
import { partBaseDao } from '../src';
import { wrongUuid } from './dao-base';
import { cleanTables, transacDemoPartFamilies, transacDemoUsers } from '../src/test-helpers';

describe('partBaseDao', function() {
    let users;
    let families;
    before(async function() {
        users = await transacDemoUsers(pool);
        families = await transacDemoPartFamilies(pool);
    });
    after(cleanTables(pool, ['part_family', 'user']));

    describe('Create', function() {
        const msBef = Date.now();
        afterEach('delete part bases', async function() {
            await pool.transaction(async db => partBaseDao.deleteAll(db));
        });
        it('should create part base', async function() {
            const pb = await pool.transaction(async db => {
                return partBaseDao.create(
                    db,
                    {
                        familyId: families.rawMaterial.id,
                        designation: 'water',
                    },
                    'RM0001',
                    users.tania.id
                );
            });
            expect(pb).to.deep.include({
                family: { id: families.rawMaterial.id },
                designation: 'water',
                baseRef: 'RM0001',
                createdBy: { id: users.tania.id },
                updatedBy: { id: users.tania.id },
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

    describe('Update', function() {
        let partBase;
        let befCreate;
        let aftCreate;
        beforeEach('create part base', async function() {
            befCreate = Date.now();
            partBase = await pool.transaction(async db => {
                return partBaseDao.create(
                    db,
                    {
                        familyId: families.rawMaterial.id,
                        designation: 'water',
                    },
                    'RM0001',
                    users.tania.id
                );
            });
            aftCreate = Date.now();
        });
        afterEach('delete part base', async function() {
            return pool.transaction(async db => {
                return partBaseDao.deleteAll(db);
            });
        });

        it('updates part base', async function() {
            const bef = Date.now();
            const pb = await pool.transaction(async db => {
                return partBaseDao.updateById(
                    db,
                    partBase.id,
                    {
                        designation: 'nitrogen',
                    },
                    users.philippe.id
                );
            });
            const aft = Date.now();

            expect(pb).to.deep.include({
                id: partBase.id,
                family: { id: families.rawMaterial.id },
                designation: 'nitrogen',
                baseRef: 'RM0001',
                createdBy: { id: users.tania.id },
                updatedBy: { id: users.philippe.id },
            });
            expect(pb.createdAt)
                .to.be.gte(befCreate)
                .and.lte(aftCreate);
            expect(pb.updatedAt)
                .to.be.gte(bef)
                .and.lte(aft);
        });

        it('returns null if wrong id', async function() {
            const pb = await pool.transaction(async db => {
                return partBaseDao.updateById(
                    db,
                    wrongUuid,
                    {
                        designation: 'nitrogen',
                    },
                    users.philippe.id
                );
            });

            expect(pb).to.be.null;
        });
    });
});
