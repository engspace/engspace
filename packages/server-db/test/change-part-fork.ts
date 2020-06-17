import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('#ChangePartForkDao', function () {
    let users;
    let ch;
    let fam;
    let part;
    before(async function () {
        await pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            ch = await th.createChange(db, users.a);
            fam = await th.createPartFamily(db);
            part = await th.createPart(db, fam, users.a, {});
        });
    });
    after(th.cleanTables(['part', 'part_family', 'change', 'user']));

    describe('#create', function () {
        this.afterEach(th.cleanTable('change_part_fork'));

        it('should create a ChangePartFork', async function () {
            const cpc = await pool.transaction(async (db) => {
                return dao.changePartFork.create(db, {
                    changeId: ch.id,
                    partId: part.id,
                    version: 'A',
                });
            });
            expect(cpc).to.deep.include({
                change: { id: ch.id },
                part: { id: part.id },
                version: 'A',
                designation: null,
            });
        });

        it('should create a ChangePartFork with new designation', async function () {
            const cpc = await pool.transaction(async (db) => {
                return dao.changePartFork.create(db, {
                    changeId: ch.id,
                    partId: part.id,
                    version: 'A',
                    designation: 'NEW EXISTING PART',
                });
            });
            expect(cpc).to.deep.include({
                change: { id: ch.id },
                part: { id: part.id },
                version: 'A',
                designation: 'NEW EXISTING PART',
            });
        });
    });

    describe('#byRequestId', function () {
        let partForks;
        before(async function () {
            return pool.transaction(async (db) => {
                partForks = [
                    await th.createChangePartFork(db, ch, part, {
                        designation: 'PART A',
                        version: 'A',
                    }),
                    await th.createChangePartFork(db, ch, part, {
                        designation: 'PART B',
                        version: 'B',
                        comments: 'Some comment about part B',
                    }),
                ];
            });
        });

        after(th.cleanTable('change_part_fork'));

        it('should read ChangePartFork by change id', async function () {
            const cpc = await pool.connect(async (db) => {
                return dao.changePartFork.byRequestId(db, ch.id);
            });
            expect(cpc).to.have.same.deep.members(partForks);
        });

        it('should return empty if no ChangePartFork', async function () {
            const cpc = await pool.connect(async (db) => {
                return dao.changePartFork.byRequestId(db, '-1');
            });
            expect(cpc).to.be.empty;
        });
    });
});
