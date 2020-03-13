import { expect } from 'chai';
import { pool } from '.';
import { partDao } from '../src';
import {
    cleanTable,
    cleanTables,
    createPartBase,
    createPartFamily,
    createUser,
    createPart,
} from '../src/test-helpers';

describe('partDao', function() {
    let userA;
    let family;
    let partBase;
    before('create res', async function() {
        return pool.transaction(async db => {
            userA = await createUser(db, {
                name: 'user.a',
                email: 'user.ab@engspace.net',
                fullName: 'User A',
            });
            family = await createPartFamily(db);
            partBase = await createPartBase(db, family, userA, 'P001', { designation: 'Part 1' });
        });
    });

    after('delete res', cleanTables(pool, ['part_base', 'part_family', 'user']));

    describe('create', function() {
        afterEach('delete res', cleanTable(pool, 'part'));

        it('should create a part', async function() {
            const bef = Date.now();
            const part = await pool.transaction(async db => {
                return partDao.create(db, {
                    baseId: partBase.id,
                    ref: 'P001.01',
                    designation: 'Part 1',
                    userId: userA.id,
                });
            });
            const aft = Date.now();
            expect(part).to.deep.include({
                base: { id: partBase.id },
                ref: 'P001.01',
                createdBy: { id: userA.id },
                updatedBy: { id: userA.id },
            });
            expect(part.id).to.be.uuid();
            expect(part.createdAt)
                .to.be.gt(bef)
                .and.lt(aft);
            expect(part.updatedAt).to.equal(part.createdAt);
        });
    });

    describe('update', function() {
        let part;
        let userB;
        beforeEach('create part', async function() {
            return pool.transaction(async db => {
                part = await createPart(db, partBase, userA, 'P001.01');
                userB = await createUser(db, {
                    name: 'user.b',
                    email: 'user.b@engspace.net',
                    fullName: 'User B',
                });
            });
        });
        afterEach('delete part', cleanTable(pool, 'part'));

        it('should update a part', async function() {
            const bef = Date.now();
            const updated = await pool.transaction(async db => {
                return partDao.updateById(db, part.id, { designation: 'Updated part' }, userB.id);
            });
            const aft = Date.now();
            expect(updated).to.deep.include({
                id: part.id,
                ref: part.ref,
                designation: 'Updated part',
                createdBy: { id: userA.id },
                createdAt: part.createdAt,
                updatedBy: { id: userB.id },
            });
            expect(updated.updatedAt)
                .to.be.gt(bef)
                .and.lt(aft);
        });
    });
});
