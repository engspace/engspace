import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('#ChangePartCreateDao', function () {
    let users;
    let ch1;
    let fam;
    before(async function () {
        await pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            ch1 = await th.createChange(db, users.a);
            fam = await th.createPartFamily(db);
        });
    });
    after(th.cleanTables(['part_family', 'change', 'user']));

    describe('#create', function () {
        this.afterEach(th.cleanTable('change_part_create'));

        it('should create a ChangePartCreate', async function () {
            const cpc = await pool.transaction(async (db) => {
                return dao.changePartCreate.create(db, {
                    changeId: ch1.id,
                    familyId: fam.id,
                    version: 'A',
                    designation: 'NEW PART',
                });
            });
            expect(cpc).to.deep.include({
                change: { id: ch1.id },
                family: { id: fam.id },
                version: 'A',
                designation: 'NEW PART',
            });
        });
    });

    describe('#byRequestId', function () {
        let partCreations;
        before(async function () {
            return pool.transaction(async (db) => {
                partCreations = [
                    await th.createChangePartCreate(db, ch1, fam, {
                        designation: 'PART A',
                        version: 'A',
                    }),
                    await th.createChangePartCreate(db, ch1, fam, {
                        designation: 'PART B',
                        version: 'B',
                        comments: 'Some comment about part B',
                    }),
                ];
            });
        });

        after(th.cleanTable('change_part_create'));

        it('should read ChangePartCreate by change id', async function () {
            const cpc = await pool.connect(async (db) => {
                return dao.changePartCreate.byRequestId(db, ch1.id);
            });
            expect(cpc).to.have.same.deep.members(partCreations);
        });

        it('should return empty if no ChangePartCreate', async function () {
            const cpc = await pool.connect(async (db) => {
                return dao.changePartCreate.byRequestId(db, '-1');
            });
            expect(cpc).to.be.empty;
        });
    });

    describe('#checkRequestId', function () {
        let ch2;
        let partCreations;
        before(async function () {
            return pool.transaction(async (db) => {
                ch2 = await th.createChange(db, users.a, 'CH-002');
                partCreations = [
                    await th.createChangePartCreate(db, ch1, fam, {
                        designation: 'PART A',
                        version: 'A',
                    }),
                    await th.createChangePartCreate(db, ch2, fam, {
                        designation: 'PART B',
                        version: 'B',
                    }),
                ];
            });
        });

        after(th.cleanTable('change_part_create'));
        after(async function () {
            return pool.transaction(async (db) => {
                return dao.change.deleteById(db, ch2.id);
            });
        });

        it('should check change id', async function () {
            const { paReqId, pbReqId } = await pool.connect(async (db) => ({
                paReqId: await dao.changePartCreate.checkRequestId(db, partCreations[0].id),
                pbReqId: await dao.changePartCreate.checkRequestId(db, partCreations[1].id),
            }));
            expect(paReqId).to.eql(ch1.id);
            expect(pbReqId).to.eql(ch2.id);
        });
    });
});
