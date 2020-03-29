import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('dao.part', function() {
    let userA;
    let family;
    let partBase;
    before('create res', async function() {
        return pool.transaction(async db => {
            userA = await th.createUser(db, {
                name: 'user.a',
                email: 'user.ab@engspace.net',
                fullName: 'User A',
            });
            family = await th.createPartFamily(db);
            partBase = await th.createPartBase(db, family, userA, 'P001');
        });
    });

    after('delete res', th.cleanTables(['part_base', 'part_family', 'user']));

    describe('create', function() {
        afterEach('delete res', th.cleanTable('part'));

        it('should create a part', async function() {
            const bef = Date.now();
            const part = await pool.transaction(async db => {
                return dao.part.create(db, {
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
                part = await th.createPart(db, partBase, userA, 'P001.01');
                userB = await th.createUser(db, {
                    name: 'user.b',
                    email: 'user.b@engspace.net',
                    fullName: 'User B',
                });
            });
        });
        afterEach('delete part', th.cleanTable('part'));

        it('should update a part', async function() {
            const bef = Date.now();
            const updated = await pool.transaction(async db => {
                return dao.part.updateById(db, part.id, { designation: 'Updated part' }, userB.id);
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
