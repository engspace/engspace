import { dao, pool, th } from '.';
import { expect } from 'chai';
import { trackedBy } from '../src';

describe('ChangePartRevisionDao', function() {
    let users;
    let req;
    let fam;
    let part;
    before(async function() {
        await pool.transaction(async db => {
            users = await th.createUsersAB(db);
            req = await th.createChangeRequest(db, users.a);
            fam = await th.createPartFamily(db);
            part = await th.createPart(db, fam, users.a);
        });
    });
    after(th.cleanTables(['part', 'part_family', 'change_request', 'user']));

    describe('create', function() {
        this.afterEach(th.cleanTable('change_part_revision'));

        it('should create a ChangePartRevision', async function() {
            const cpr = await pool.transaction(async db => {
                return dao.changePartRevision.create(db, {
                    requestId: req.id,
                    partId: part.id,
                });
            });
            expect(cpr).to.deep.include({
                request: { id: req.id },
                part: { id: part.id },
                designation: null,
            });
        });

        it('should create a ChangePartRevision with designation', async function() {
            const cpr = await pool.transaction(async db => {
                return dao.changePartRevision.create(db, {
                    requestId: req.id,
                    partId: part.id,
                    designation: 'NEW EXISTING PART',
                });
            });
            expect(cpr).to.deep.include({
                request: { id: req.id },
                part: { id: part.id },
                designation: 'NEW EXISTING PART',
            });
        });
    });
});
