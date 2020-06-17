import { expect } from 'chai';
import { Change, Part } from '@engspace/core';
import { idType, trackedBy } from '../src/test-helpers';
import { dao, pool, th } from '.';

describe('#PartDao', function () {
    let users;
    let family;
    before('create res', async function () {
        return pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            family = await th.createPartFamily(db);
        });
    });

    after('delete res', th.cleanTables(['part_family', 'user']));

    describe('#create', function () {
        afterEach('delete res', th.cleanTable('part'));

        it('should create a part', async function () {
            const bef = Date.now();
            const part = await pool.transaction(async (db) => {
                return dao.part.create(db, {
                    familyId: family.id,
                    ref: 'P001.A',
                    designation: 'Part 1',
                    userId: users.a.id,
                });
            });
            const aft = Date.now();
            expect(part).to.deep.include({
                family: { id: family.id },
                ref: 'P001.A',
                ...trackedBy(users.a),
            });
            expect(part.id).to.be.a(idType);
            expect(part.createdAt).to.be.gt(bef).and.lt(aft);
            expect(part.updatedAt).to.equal(part.createdAt);
        });
    });

    describe('#byRef', function () {
        let part;
        before(function () {
            return pool.transaction(async (db) => {
                part = await th.createPart(db, family, users.a, {
                    ref: 'P001.A',
                });
            });
        });
        after(th.cleanTable('part'));

        it('should get a part byRef', async function () {
            const p = await pool.connect(async (db) => {
                return dao.part.byRef(db, 'P001.A');
            });
            expect(p).to.deep.include(part);
        });

        it('should get null if part does not exits', async function () {
            const p = await pool.connect(async (db) => {
                return dao.part.byRef(db, 'P002.A');
            });
            expect(p).to.be.null;
        });
    });

    describe('#checkRef', function () {
        before(function () {
            return pool.transaction(async (db) => {
                await th.createPart(db, family, users.a, {
                    ref: 'P001.A',
                });
            });
        });
        after(th.cleanTable('part'));

        it('should check that a ref exists', async function () {
            const has = await pool.connect(async (db) => {
                return dao.part.checkRef(db, 'P001.A');
            });
            expect(has).to.be.true;
        });

        it('should check that a ref does not exist', async function () {
            const has = await pool.connect(async (db) => {
                return dao.part.checkRef(db, 'P002.A');
            });
            expect(has).to.be.false;
        });
    });

    describe('#whoseRev1IsCreatedBy', function () {
        let ch1: Change, ch2: Change;
        let part1a: Part, part1b: Part;
        let part2a: Part, part2b: Part;

        this.beforeEach(function () {
            return pool.transaction(async (db) => {
                ch1 = await th.createChange(db, users.a, 'CH-001');
                ch2 = await th.createChange(db, users.a, 'CH-002');
                part1a = await th.createPart(
                    db,
                    family,
                    users.a,
                    {
                        ref: 'P001.A',
                    },
                    { withRev1: { change: ch1 }, bumpFamCounter: false }
                );
                part1b = await th.createPart(
                    db,
                    family,
                    users.a,
                    {
                        ref: 'P001.B',
                    },
                    { withRev1: { change: ch2 }, bumpFamCounter: false }
                );
                part2a = await th.createPart(
                    db,
                    family,
                    users.a,
                    {
                        ref: 'P002.A',
                    },
                    { withRev1: { change: ch1 }, bumpFamCounter: false }
                );
                part2b = await th.createPart(
                    db,
                    family,
                    users.a,
                    {
                        ref: 'P002.B',
                    },
                    { withRev1: { change: ch2 }, bumpFamCounter: false }
                );
            });
        });
        this.afterEach(th.cleanTables(['part_revision', 'part', 'change']));

        it('should get all parts whose rev1 created by change', async function () {
            const partsA = await pool.connect(async (db) => {
                return dao.part.whoseRev1IsCreatedBy(db, ch1.id);
            });
            const partsB = await pool.connect(async (db) => {
                return dao.part.whoseRev1IsCreatedBy(db, ch2.id);
            });
            expect(partsA).to.containSubset([
                {
                    id: part1a.id,
                },
                {
                    id: part2a.id,
                },
            ]);
            expect(partsB).to.containSubset([
                {
                    id: part1b.id,
                },
                {
                    id: part2b.id,
                },
            ]);
        });
    });

    describe('#update', function () {
        let part;
        beforeEach('create part', async function () {
            return pool.transaction(async (db) => {
                part = await th.createPart(db, family, users.a, {});
            });
        });
        afterEach('delete part', th.cleanTable('part'));

        it('should update a part', async function () {
            const bef = Date.now();
            const updated = await pool.transaction(async (db) => {
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
            expect(updated.updatedAt).to.be.gt(bef).and.lt(aft);
        });
    });
});
