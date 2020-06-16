import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('#ChangePartRevisionDao', function () {
    let users;
    let cr;
    let fam;
    let part;
    before(async function () {
        await pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            cr = await th.createChangeRequest(db, users.a);
            fam = await th.createPartFamily(db);
            part = await th.createPart(db, fam, users.a, {});
        });
    });
    after(th.cleanTables(['part', 'part_family', 'change_request', 'user']));

    describe('#create', function () {
        this.afterEach(th.cleanTable('change_part_revision'));

        it('should create a ChangePartRevision', async function () {
            const cpr = await pool.transaction(async (db) => {
                return dao.changePartRevision.create(db, {
                    requestId: cr.id,
                    partId: part.id,
                });
            });
            expect(cpr).to.deep.include({
                request: { id: cr.id },
                part: { id: part.id },
                designation: null,
            });
        });

        it('should create a ChangePartRevision with designation', async function () {
            const cpr = await pool.transaction(async (db) => {
                return dao.changePartRevision.create(db, {
                    requestId: cr.id,
                    partId: part.id,
                    designation: 'NEW EXISTING PART',
                });
            });
            expect(cpr).to.deep.include({
                request: { id: cr.id },
                part: { id: part.id },
                designation: 'NEW EXISTING PART',
            });
        });
    });

    describe('#byRequestId', function () {
        let partRevisions;
        before(async function () {
            return pool.transaction(async (db) => {
                partRevisions = [
                    await th.createChangePartRevision(db, cr, part, {
                        designation: 'PART A',
                    }),
                ];
            });
        });

        after(th.cleanTable('change_part_revision'));

        it('should read ChangePartRevision by request id', async function () {
            const cpr = await pool.connect(async (db) => {
                return dao.changePartRevision.byRequestId(db, cr.id);
            });
            expect(cpr).to.have.same.deep.members(partRevisions);
        });

        it('should return empty if no ChangePartRevision', async function () {
            const cpr = await pool.connect(async (db) => {
                return dao.changePartRevision.byRequestId(db, '-1');
            });
            expect(cpr).to.be.empty;
        });
    });
});
