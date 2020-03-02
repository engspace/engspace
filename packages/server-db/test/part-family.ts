import { expect } from 'chai';
import { pool } from '.';
import { partFamilyDao } from '../src';

describe('partFamilyDao', function() {
    describe('create', function() {
        afterEach('delete families', async function() {
            await pool.transaction(async db => {
                return partFamilyDao.deleteAll(db);
            });
        });

        it('should create a part family', async function() {
            const famA = await pool.transaction(async db => {
                return partFamilyDao.create(db, {
                    name: 'fam a',
                    code: 'a',
                });
            });
            expect(famA).to.deep.include({
                name: 'fam a',
                code: 'a',
                counter: 0,
            });
            expect(famA.id).to.be.uuid();
        });
    });
    describe('read', function() {
        let famA;
        before('Create part family', async function() {
            famA = await pool.transaction(async db => {
                return partFamilyDao.create(db, {
                    name: 'fam a',
                    code: 'a',
                });
            });
        });
        after('Delete part families', async function() {
            return pool.transaction(async db => partFamilyDao.deleteAll(db));
        });

        it('should read a part family', async function() {
            const result = await pool.connect(async db => {
                return partFamilyDao.byId(db, famA.id);
            });
            expect(result).to.deep.include({
                name: 'fam a',
                code: 'a',
                counter: 0,
            });
            expect(result.id).to.be.uuid();
        });
    });
    describe('update', function() {
        let famA;
        beforeEach('Create part family', async function() {
            famA = await pool.transaction(async db => {
                return partFamilyDao.create(db, {
                    name: 'fam a',
                    code: 'a',
                });
            });
        });
        afterEach('Delete part families', async function() {
            return pool.transaction(async db => partFamilyDao.deleteAll(db));
        });

        it('should update a part family', async function() {
            const famB = await pool.connect(async db => {
                return partFamilyDao.updateById(db, famA.id, {
                    name: 'fam b',
                    code: 'b',
                });
            });
            expect(famB).to.deep.include({
                id: famA.id,
                name: 'fam b',
                code: 'b',
            });
        });

        it('bumps a part family counter', async function() {
            const fam = await pool.connect(async db => {
                return partFamilyDao.bumpCounterById(db, famA.id);
            });
            expect(fam).to.deep.include({
                id: famA.id,
                name: 'fam a',
                code: 'a',
                counter: 1,
            });
        });

        it('bumps a part family counter several times in parallel', async function() {
            const fams = await pool.connect(async db => {
                return Promise.all([
                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),

                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),
                    partFamilyDao.bumpCounterById(db, famA.id),
                ]);
            });
            const expected = [...Array(10).keys()].map(i => ({
                id: famA.id,
                name: 'fam a',
                code: 'a',
                counter: i + 1,
            }));
            expect(fams).to.have.deep.members(expected);
        });
    });
});
