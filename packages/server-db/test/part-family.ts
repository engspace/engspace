import {
    partFamiliesInput,
    DemoPartFamilyInputSet,
    DemoPartFamilySet,
} from '@engspace/demo-data-input';
import chai from 'chai';
import { pool } from '.';
import { partFamilyDao, Db } from '../src';

const { expect } = chai;

export async function createPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    const keyVals = await Promise.all(
        Object.entries(input).map(async ([name, input]) => [
            name,
            await partFamilyDao.create(db, input),
        ])
    );
    return Object.fromEntries(keyVals);
}

describe('partFamilyDao', function() {
    describe('create', function() {
        it('should create a part family', async function() {
            const result = await pool.transaction(async db => {
                return partFamilyDao.create(db, partFamiliesInput.rawMaterial);
            });
            expect(result).to.deep.include(partFamiliesInput.rawMaterial);
            expect(result.id).to.be.a('string');
        });
    });
    describe('read', function() {
        let families;

        before('create families', async function() {
            families = await pool.connect(async db => {
                return createPartFamilies(db, partFamiliesInput);
            });
        });

        it('should read a part family', async function() {
            const result = await pool.connect(async db => {
                return partFamilyDao.byId(db, families.topAssy.id);
            });
            expect(result).to.deep.include(families.topAssy);
        });
    });
});
