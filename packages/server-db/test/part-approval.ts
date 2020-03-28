import { expect } from 'chai';
import { pool } from '.';
import { partApprovalDao } from '..';
import {
    cleanTable,
    cleanTables,
    createPart,
    createPartApproval,
    createPartApprovals,
    createPartBase,
    createPartFamily,
    createPartRev,
    createPartVal,
    createUsers,
    expTrackedTime,
    trackedBy,
} from '../src/test-helpers';
import { ApprovalState } from '@engspace/core';

describe('partApprovalDao', function() {
    let users;
    let fam;
    let partBase;
    let part;
    let partRev;
    let partVal;
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
            partVal = await createPartVal(db, partRev, users.a);
        });
    });
    after(
        'clean deps',
        cleanTables(pool, [
            'part_validation',
            'part_revision',
            'part',
            'part_base',
            'part_family',
            'user',
        ])
    );
    describe('Create', function() {
        afterEach(cleanTable(pool, 'part_approval'));
        it('should create part approval in pending state', async function() {
            const partAppr = await pool.transaction(async db => {
                return partApprovalDao.create(db, {
                    validationId: partVal.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                });
            });
            expect(partAppr.id).to.be.uuid();
            expect(partAppr).to.deep.include({
                validation: { id: partVal.id },
                assignee: { id: users.b.id },
                state: ApprovalState.Pending,
                ...trackedBy(users.a),
            });
            expTrackedTime(expect, partAppr);
        });
    });

    describe('Read', function() {
        let approvals;
        before(async function() {
            approvals = await pool.transaction(async db => {
                return createPartApprovals(db, partVal, users, users.a);
            });
        });
        after(cleanTable(pool, 'part_approval'));

        it('should read approvals for a validation', async function() {
            const apprs = await pool.connect(async db => {
                return partApprovalDao.byValidationId(db, partVal.id);
            });
            expect(apprs).to.have.same.deep.members(Object.values(approvals));
        });
    });

    describe('Update', function() {
        let partAppr;
        beforeEach(async function() {
            partAppr = await pool.transaction(async db => {
                return createPartApproval(db, partVal, users.b, users.a);
            });
        });
        afterEach(cleanTable(pool, 'part_approval'));

        it('should set approval state without comment', async function() {
            const bef = Date.now();
            const pa = await pool.transaction(async db => {
                return partApprovalDao.update(db, partAppr.id, {
                    state: ApprovalState.Approved,
                    userId: users.b.id,
                });
            });
            const aft = Date.now();
            expect(pa).to.deep.include({
                id: partAppr.id,
                validation: { id: partVal.id },
                assignee: { id: users.b.id },
                state: ApprovalState.Approved,
                comments: null,
                ...trackedBy(users.a, users.b),
            });
            expect(pa.updatedAt)
                .to.be.gt(bef)
                .and.lt(aft);
        });

        it('should set approval state with comment', async function() {
            const bef = Date.now();
            const pa = await pool.transaction(async db => {
                return partApprovalDao.update(db, partAppr.id, {
                    state: ApprovalState.Approved,
                    userId: users.b.id,
                    comments: 'geprüft',
                });
            });
            const aft = Date.now();
            expect(pa).to.deep.include({
                id: partAppr.id,
                validation: { id: partVal.id },
                assignee: { id: users.b.id },
                state: ApprovalState.Approved,
                comments: 'geprüft',
                ...trackedBy(users.a, users.b),
            });
            expect(pa.updatedAt)
                .to.be.gt(bef)
                .and.lt(aft);
        });
    });
});
