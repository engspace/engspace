import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('ChangePartChangeDao', function() {
    let users;
    let req;
    let fam;
    let part;
    before(async function() {
        await pool.transaction(async db => {
            users = await th.createUsersAB(db);
            req = await th.createChangeRequest(db, users.a);
            fam = await th.createPartFamily(db);
            part = await th.createPart(db, fam, users.a, {});
        });
    });
    after(th.cleanTables(['part', 'part_family', 'change_request', 'user']));

    describe('create', function() {
        this.afterEach(th.cleanTable('change_part_change'));

        it('should create a ChangePartChange', async function() {
            const cpc = await pool.transaction(async db => {
                return dao.changePartChange.create(db, {
                    requestId: req.id,
                    partId: part.id,
                    version: 'A',
                });
            });
            expect(cpc).to.deep.include({
                request: { id: req.id },
                part: { id: part.id },
                version: 'A',
                designation: null,
            });
        });

        it('should create a ChangePartChange with new designation', async function() {
            const cpc = await pool.transaction(async db => {
                return dao.changePartChange.create(db, {
                    requestId: req.id,
                    partId: part.id,
                    version: 'A',
                    designation: 'NEW EXISTING PART',
                });
            });
            expect(cpc).to.deep.include({
                request: { id: req.id },
                part: { id: part.id },
                version: 'A',
                designation: 'NEW EXISTING PART',
            });
        });
    });
});
