import { ApprovalState } from '@engspace/core';
import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('dao.partValidation', function() {
    let users;
    let fam;
    let partBase;
    let part;
    let partRev;
    before('create deps', async function() {
        return pool.transaction(async db => {
            users = await th.createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
                d: { name: 'd' },
                e: { name: 'e' },
            });
            fam = await th.createPartFamily(db, { code: 'P' });
            partBase = await th.createPartBase(db, fam, users.a, 'P01');
            part = await th.createPart(db, partBase, users.a, 'P01.A');
            partRev = await th.createPartRev(db, part, users.a);
        });
    });
    after(
        'clean deps',
        th.cleanTables(['part_revision', 'part', 'part_base', 'part_family', 'user'])
    );
    describe('Create', function() {
        afterEach(th.cleanTable('part_validation'));

        it('should create part validation', async function() {
            const val = await pool.transaction(async db => {
                return dao.partValidation.create(db, { partRevId: partRev.id, userId: users.a.id });
            });
            expect(val.id).to.be.uuid();
            expect(val).to.deep.include({
                partRev: { id: partRev.id },
                state: ApprovalState.Approved,
                result: null,
                comments: null,
            });
        });
    });

    describe('State', function() {
        let partVal;
        beforeEach(async function() {
            partVal = await pool.transaction(async db => {
                return th.createPartVal(db, partRev, users.a);
            });
        });
        afterEach(th.cleanTables(['part_approval', 'part_validation']));

        it('should be rejected if one is rejected', async function() {
            const val = await pool.transaction(async db => {
                await th.createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Rejected,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Reserved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Pending,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Rejected);
        });

        it('should be pending if one is pending', async function() {
            const val = await pool.transaction(async db => {
                await th.createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Reserved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Pending,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Pending);
        });

        it('should be reserved if one is reserved', async function() {
            const val = await pool.transaction(async db => {
                await th.createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Reserved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Approved,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Reserved);
        });

        it('should be approved if all are approved', async function() {
            const val = await pool.transaction(async db => {
                await th.createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Approved,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Approved);
        });
    });
});
