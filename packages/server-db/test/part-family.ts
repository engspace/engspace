import {
    asyncKeyMap,
    DemoPartFamilyInputSet,
    DemoPartFamilySet,
    partFamiliesInput,
} from '@engspace/demo-data-input';
import { expect } from 'chai';
import { pool } from '.';
import { Db, partFamilyDao } from '../src';

export async function createPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    return asyncKeyMap(input, async pf => partFamilyDao.create(db, pf));
}

describe('partFamilyDao', function() {
    describe('create', function() {
        afterEach('delete families', async function() {
            await pool.transaction(async db => {
                return partFamilyDao.deleteAll(db);
            });
        });

        it('should create a part family', async function() {
            const result = await pool.transaction(async db => {
                return partFamilyDao.create(db, partFamiliesInput.rawMaterial);
            });
            expect(result).to.deep.include(partFamiliesInput.rawMaterial);
            expect(result.id).to.be.uuid();
        });
    });
    describe('read', function() {
        let families;

        before('create families', async function() {
            families = await pool.connect(async db => {
                return createPartFamilies(db, partFamiliesInput);
            });
        });

        after('delete families', async function() {
            await pool.transaction(async db => {
                return partFamilyDao.deleteAll(db);
            });
        });

        it('should read a part family', async function() {
            const result = await pool.connect(async db => {
                return partFamilyDao.byId(db, families.topAssy.id);
            });
            expect(result).to.deep.include(families.topAssy);
        });
    });
    describe('update', function() {
        it('should update a part family', async function() {
            const fam = await pool.transaction(async db => {
                return partFamilyDao.create(db, {
                    name: 'fam',
                    code: 'a',
                });
            });
            const result = await pool.connect(async db => {
                return partFamilyDao.updateById(db, fam.id, {
                    name: 'new fam',
                    code: 'b',
                });
            });
            expect(result).to.deep.include({
                id: fam.id,
                name: 'new fam',
                code: 'b',
            });
        });
    });
});
