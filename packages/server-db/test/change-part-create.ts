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

    describe('byRequestId', function() {
        let partCreations;
        before(async function() {
            return pool.transaction(async db => {
                partCreations = [
                    await th.createChangePartCreate(db, req, fam, {
                        designation: 'PART A',
                        version: 'A',
                    }),
                    await th.createChangePartCreate(db, req, fam, {
                        designation: 'PART B',
                        version: 'B',
                        comments: 'Some comment about part B',
                    }),
                ];
            });
        });

        after(th.cleanTable('change_part_create'));

        it('should read ChangePartCreate by request id', async function() {
            const cpc = await pool.connect(async db => {
                return dao.changePartCreate.byRequestId(db, req.id);
            });
            expect(cpc).to.have.same.deep.members(partCreations);
        });

        it('should return empty if no ChangePartCreate', async function() {
            const cpc = await pool.connect(async db => {
                return dao.changePartCreate.byRequestId(db, '-1');
            });
            expect(cpc).to.be.empty;
        });
    });
});
