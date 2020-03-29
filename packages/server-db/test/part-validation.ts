import { ApprovalDecision } from '@engspace/core';
import { expect } from 'chai';
import { dao, pool, th } from '.';

describe('PartValidationDao', function() {
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
                state: ApprovalDecision.Approved,
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
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    decision: ApprovalDecision.Rejected,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    decision: ApprovalDecision.Reserved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    decision: ApprovalDecision.Pending,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalDecision.Rejected);
        });

        it('should be pending if one is pending', async function() {
            const val = await pool.transaction(async db => {
                await th.createPartApproval(db, partVal, users.a, users.b, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    decision: ApprovalDecision.Reserved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    decision: ApprovalDecision.Pending,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalDecision.Pending);
        });

        it('should be reserved if one is reserved', async function() {
            const val = await pool.transaction(async db => {
                await th.createPartApproval(db, partVal, users.a, users.b, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    decision: ApprovalDecision.Reserved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalDecision.Reserved);
        });

        it('should be approved if all are approved', async function() {
            const val = await pool.transaction(async db => {
                await th.createPartApproval(db, partVal, users.a, users.b, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.c, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.d, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createPartApproval(db, partVal, users.a, users.e, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.partValidation.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalDecision.Approved);
        });
    });
});
