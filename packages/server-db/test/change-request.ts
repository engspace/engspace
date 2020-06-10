import { expect } from 'chai';
import { ChangeRequestCycle, ApprovalDecision } from '@engspace/core';
import { trackedBy, idType, expTrackedTime } from '../src';
import { dao, pool, th } from '.';

describe('#ChangeRequestDao', function () {
    let users;
    before(async function () {
        await pool.transaction(async (db) => {
            users = await th.createUsers(db, {
                a: { name: 'a' },
                b: { name: 'b' },
                c: { name: 'c' },
                d: { name: 'd' },
                e: { name: 'e' },
            });
        });
    });
    after(th.cleanTable('user'));

    describe('#create', function () {
        this.afterEach(th.cleanTable('change_request'));

        it('should create a ChangeRequest', async function () {
            const cr = await pool.transaction(async (db) => {
                return dao.changeRequest.create(db, {
                    userId: users.a.id,
                });
            });
            expect(cr).to.deep.include({
                description: null,
                cycle: ChangeRequestCycle.Edition,
                state: null,
                ...trackedBy(users.a),
            });
            expect(cr.id).to.be.a(idType);
        });

        it('should create a ChangeRequest with description', async function () {
            const cr = await pool.transaction(async (db) => {
                return dao.changeRequest.create(db, {
                    userId: users.a.id,
                    description: 'SUPER CHANGE',
                });
            });
            expect(cr).to.deep.include({
                ...trackedBy(users.a),
                description: 'SUPER CHANGE',
                cycle: ChangeRequestCycle.Edition,
                state: null,
            });
            expect(cr.id).to.be.a(idType);
        });

        it('should create a ChangeRequest with initial cycle', async function () {
            const cr = await pool.transaction(async (db) => {
                return dao.changeRequest.create(db, {
                    userId: users.a.id,
                    cycle: ChangeRequestCycle.Validation,
                });
            });
            expect(cr).to.deep.include({
                ...trackedBy(users.a),
                description: null,
                cycle: ChangeRequestCycle.Validation,
                state: ApprovalDecision.Approved,
            });
            expect(cr.id).to.be.a(idType);
        });
    });

    describe('state', function () {
        let cr;
        this.beforeEach(async function () {
            cr = await pool.transaction(async (db) => {
                return dao.changeRequest.create(db, {
                    description: 'SUPER CHANGE',
                    userId: users.a.id,
                    cycle: ChangeRequestCycle.Validation,
                });
            });
        });
        this.afterEach(th.cleanTables(['change_review', 'change_request']));

        it('should be rejected if one review is rejected', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, cr, users.a, users.a, {
                    decision: ApprovalDecision.Rejected,
                });
                await th.createChangeReview(db, cr, users.b, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.c, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.changeRequest.byId(db, cr.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Rejected);
        });

        it('should be pending if one review is pending', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, cr, users.a, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.b, users.a, {
                    decision: ApprovalDecision.Pending,
                });
                await th.createChangeReview(db, cr, users.c, users.a, {
                    decision: ApprovalDecision.Reserved,
                });
                await th.createChangeReview(db, cr, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.changeRequest.byId(db, cr.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Pending);
        });

        it('should be reserved if one review is reserved', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, cr, users.a, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.b, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.c, users.a, {
                    decision: ApprovalDecision.Reserved,
                });
                await th.createChangeReview(db, cr, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.changeRequest.byId(db, cr.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Reserved);
        });

        it('should be approved if all reviews are approved', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, cr, users.a, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.b, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.c, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, cr, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.changeRequest.byId(db, cr.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Approved);
        });
    });

    describe('Updates', function () {
        let cr;
        this.beforeEach(async function () {
            cr = await pool.transaction(async (db) => {
                return dao.changeRequest.create(db, {
                    description: 'SUPER CHANGE',
                    userId: users.a.id,
                    cycle: ChangeRequestCycle.Validation,
                });
            });
        });
        this.afterEach(th.cleanTable('change_request'));

        describe('#update', function () {
            it('should update the description', async function () {
                const updated = await pool.transaction(async (db) => {
                    return dao.changeRequest.update(db, cr.id, {
                        description: 'AWESOME CHANGE',
                        userId: users.b.id,
                    });
                });
                expect(updated).to.deep.include({
                    description: 'AWESOME CHANGE',
                    createdBy: { id: users.a.id },
                    updatedBy: { id: users.b.id },
                });
                expTrackedTime(expect, updated);
            });
        });

        describe('#updateCycle', function () {
            it('should update the cycle', async function () {
                const updated = await pool.transaction((db) => {
                    return dao.changeRequest.updateCycle(
                        db,
                        cr.id,
                        ChangeRequestCycle.Approved,
                        users.b.id
                    );
                });
                expect(updated).to.deep.include({
                    cycle: ChangeRequestCycle.Approved,
                    createdBy: { id: users.a.id },
                    updatedBy: { id: users.b.id },
                });
                expTrackedTime(expect, updated);
            });
        });
    });
});
