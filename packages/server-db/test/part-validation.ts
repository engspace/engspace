import { ApprovalState } from '@engspace/core';
import { expect } from 'chai';
import { pool } from '.';
import { partValidationDao } from '../src';
import {
    cleanTable,
    cleanTables,
    createPart,
    createPartApproval,
    createPartBase,
    createPartFamily,
    createPartRev,
    createPartVal,
    createUsers,
} from '../src/test-helpers';

describe('partValidationDao', function() {
    let users;
    let fam;
    let partBase;
    let part;
    let partRev;
    before('create deps', async function() {
        return pool.transaction(async db => {
            users = await createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
                d: { name: 'd' },
                e: { name: 'e' },
            });
            fam = await createPartFamily(db, { code: 'P' });
            partBase = await createPartBase(db, fam, users.a, 'P01');
            part = await createPart(db, partBase, users.a, 'P01.A');
            partRev = await createPartRev(db, part, users.a);
        });
    });
    after(
        'clean deps',
        cleanTables(pool, ['part_revision', 'part', 'part_base', 'part_family', 'user'])
    );
    describe('Create', function() {
        afterEach(cleanTable(pool, 'part_validation'));

        it('should create part validation', async function() {
            const val = await pool.transaction(async db => {
                return partValidationDao.create(db, { partRevId: partRev.id, userId: users.a.id });
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
                return createPartVal(db, partRev, users.a);
            });
        });
        afterEach(cleanTables(pool, ['part_approval', 'part_validation']));

        it('should be rejected if one is rejected', async function() {
            const val = await pool.transaction(async db => {
                await createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Rejected,
                });
                await createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Reserved,
                });
                await createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Pending,
                });
                return partValidationDao.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Rejected);
        });

        it('should be pending if one is pending', async function() {
            const val = await pool.transaction(async db => {
                await createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Reserved,
                });
                await createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Pending,
                });
                return partValidationDao.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Pending);
        });

        it('should be reserved if one is reserved', async function() {
            const val = await pool.transaction(async db => {
                await createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Reserved,
                });
                await createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Approved,
                });
                return partValidationDao.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Reserved);
        });

        it('should be approved if all are approved', async function() {
            const val = await pool.transaction(async db => {
                await createPartApproval(db, partVal, users.a, users.b, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.c, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.d, {
                    state: ApprovalState.Approved,
                });
                await createPartApproval(db, partVal, users.a, users.e, {
                    state: ApprovalState.Approved,
                });
                return partValidationDao.byId(db, partVal.id);
            });
            expect(val.state).to.eql(ApprovalState.Approved);
        });
    });
});
