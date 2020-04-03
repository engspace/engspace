import { expect } from 'chai';
import { dao, pool, th } from '.';
import { idType, trackedBy } from '../src/test-helpers';

describe('PartDao', function() {
    let users;
    let family;
    before('create res', async function() {
        return pool.transaction(async db => {
            users = await th.createUsersAB(db);
            family = await th.createPartFamily(db);
        });
    });

    after('delete res', th.cleanTables(['part_family', 'user']));

    describe('create', function() {
        afterEach('delete res', th.cleanTable('part'));

        it('should create a part', async function() {
            const bef = Date.now();
            const part = await pool.transaction(async db => {
                return dao.part.create(db, {
                    familyId: family.id,
                    baseRef: 'P001',
                    ref: 'P001.A',
                    designation: 'Part 1',
                    userId: users.a.id,
                });
            });
            const aft = Date.now();
            expect(part).to.deep.include({
                family: { id: family.id },
                baseRef: 'P001',
                ref: 'P001.A',
                ...trackedBy(users.a),
            });
            expect(part.id).to.be.a(idType);
            expect(part.createdAt)
                .to.be.gt(bef)
                .and.lt(aft);
            expect(part.updatedAt).to.equal(part.createdAt);
        });
    });

    describe('update', function() {
        let part;
        beforeEach('create part', async function() {
            return pool.transaction(async db => {
                part = await th.createPart(db, family, users.a, {});
            });
        });
        afterEach('delete part', th.cleanTable('part'));

        it('should update a part', async function() {
            const bef = Date.now();
            const updated = await pool.transaction(async db => {
                return dao.part.updateById(db, part.id, {
                    designation: 'Updated part',
                    userId: users.b.id,
                });
            });
            const aft = Date.now();
            expect(updated).to.deep.include({
                id: part.id,
                ref: part.ref,
                designation: 'Updated part',
                ...trackedBy(users.a, users.b),
                createdAt: part.createdAt,
            });
            expect(updated.updatedAt)
                .to.be.gt(bef)
                .and.lt(aft);
        });
    });
});
