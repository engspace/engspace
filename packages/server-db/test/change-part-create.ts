import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('ChangePartCreateDao', function() {
    let users;
    let req;
    let fam;
    before(async function() {
        await pool.transaction(async db => {
            users = await th.createUsersAB(db);
            req = await th.createChangeRequest(db, users.a);
            fam = await th.createPartFamily(db);
        });
    });
    after(th.cleanTables(['part_family', 'change_request', 'user']));

    describe('create', function() {
        this.afterEach(th.cleanTable('change_part_create'));

        it('should create a ChangePartCreate', async function() {
            const cpc = await pool.transaction(async db => {
                return dao.changePartCreate.create(db, {
                    requestId: req.id,
                    familyId: fam.id,
                    version: 'A',
                    designation: 'NEW PART',
                });
            });
            expect(cpc).to.deep.include({
                request: { id: req.id },
                family: { id: fam.id },
                version: 'A',
                designation: 'NEW PART',
            });
        });
    });
});
