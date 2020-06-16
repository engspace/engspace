import { expect } from 'chai';
import { ApprovalDecision } from '@engspace/core';
import { expTrackedTime, trackedBy, idType } from '../src/test-helpers';
import { dao, pool, th } from '.';

describe('#PartApprovalDao', function () {
    let users;
    let fam;
    let cr;
    let part;
    let partRev;
    let partVal;
    before('create deps', async function () {
        return pool.transaction(async (db) => {
            users = await th.createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
                d: { name: 'd' },
                e: { name: 'e' },
            });
            fam = await th.createPartFamily(db);
            cr = await th.createChangeRequest(db, users.a);
            part = await th.createPart(db, fam, users.a, {});
            partRev = await th.createPartRev(db, part, cr, users.a);
            partVal = await th.createPartVal(db, partRev, users.a);
        });
    });
    after(
        'clean deps',
        th.cleanTables([
            'part_validation',
            'part_revision',
            'part',
            'change_request',
            'part_family',
            'user',
        ])
    );
    describe('#create', function () {
        afterEach(th.cleanTable('part_approval'));
        it('should create part approval in pending decision', async function () {
            const partAppr = await pool.transaction(async (db) => {
                return dao.partApproval.create(db, {
                    validationId: partVal.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                });
            });
            expect(partAppr.id).to.be.a(idType);
            expect(partAppr).to.deep.include({
                validation: { id: partVal.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Pending,
                ...trackedBy(users.a),
            });
            expTrackedTime(expect, partAppr);
        });
    });

    describe('Read', function () {
        let approvals;
        before(async function () {
            approvals = await pool.transaction(async (db) => {
                return th.createPartApprovals(db, partVal, users, users.a);
            });
        });
        after(th.cleanTable('part_approval'));

        it('should read approvals for a validation', async function () {
            const apprs = await pool.connect(async (db) => {
                return dao.partApproval.byValidationId(db, partVal.id);
            });
            expect(apprs).to.have.same.deep.members(Object.values(approvals));
        });
    });

    describe('#update', function () {
        let partAppr;
        beforeEach(async function () {
            partAppr = await pool.transaction(async (db) => {
                return th.createPartApproval(db, partVal, users.b, users.a);
            });
        });
        afterEach(th.cleanTable('part_approval'));

        it('should set approval decision without comment', async function () {
            const bef = Date.now();
            const pa = await pool.transaction(async (db) => {
                return dao.partApproval.update(db, partAppr.id, {
                    decision: ApprovalDecision.Approved,
                    userId: users.b.id,
                });
            });
            const aft = Date.now();
            expect(pa).to.deep.include({
                id: partAppr.id,
                validation: { id: partVal.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Approved,
                comments: null,
                ...trackedBy(users.a, users.b),
            });
            expect(pa.updatedAt).to.be.gt(bef).and.lt(aft);
        });

        it('should set approval decision with comment', async function () {
            const bef = Date.now();
            const pa = await pool.transaction(async (db) => {
                return dao.partApproval.update(db, partAppr.id, {
                    decision: ApprovalDecision.Approved,
                    userId: users.b.id,
                    comments: 'geprüft',
                });
            });
            const aft = Date.now();
            expect(pa).to.deep.include({
                id: partAppr.id,
                validation: { id: partVal.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Approved,
                comments: 'geprüft',
                ...trackedBy(users.a, users.b),
            });
            expect(pa.updatedAt).to.be.gt(bef).and.lt(aft);
        });
    });
});
