import { expect } from 'chai';
import { ApprovalDecision } from '@engspace/core';
import { trackedBy, expTrackedTime } from '../src';
import { dao, pool, th } from '.';

describe('#ChangeReviewDao', function () {
    let users;
    let req;
    before(async function () {
        await pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            req = await th.createChangeRequest(db, users.a);
        });
    });
    after(th.cleanTables(['change_request', 'user']));

    describe('#create', function () {
        this.afterEach(th.cleanTable('change_review'));

        it('should create a ChangeReview', async function () {
            const rev = await pool.transaction(async (db) => {
                return dao.changeReview.create(db, {
                    requestId: req.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                });
            });
            expect(rev).to.deep.include({
                request: { id: req.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Pending,
                comments: null,
                ...trackedBy(users.a),
            });
        });

        it('should create a ChangeReview with decision', async function () {
            const rev = await pool.transaction(async (db) => {
                return dao.changeReview.create(db, {
                    requestId: req.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                    decision: ApprovalDecision.Reserved,
                });
            });
            expect(rev).to.deep.include({
                request: { id: req.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Reserved,
                comments: null,
                ...trackedBy(users.a),
            });
        });

        it('should create a ChangeReview with decision and comments', async function () {
            const rev = await pool.transaction(async (db) => {
                return dao.changeReview.create(db, {
                    requestId: req.id,
                    assigneeId: users.b.id,
                    userId: users.a.id,
                    decision: ApprovalDecision.Reserved,
                    comments: 'Some comment',
                });
            });
            expect(rev).to.deep.include({
                request: { id: req.id },
                assignee: { id: users.b.id },
                decision: ApprovalDecision.Reserved,
                comments: 'Some comment',
                ...trackedBy(users.a),
            });
        });
    });

    describe('#byRequestId', function () {
        let reviews;
        before(async function () {
            return pool.transaction(async (db) => {
                reviews = [await th.createChangeReview(db, req, users.a, users.b)];
            });
        });

        after(th.cleanTable('change_review'));

        it('should read ChangeReview by request id', async function () {
            const cr = await pool.connect(async (db) => {
                return dao.changeReview.byRequestId(db, req.id);
            });
            expect(cr).to.have.same.deep.members(reviews);
        });

        it('should return empty if no ChangeeReview', async function () {
            const cr = await pool.connect(async (db) => {
                return dao.changeReview.byRequestId(db, '-1');
            });
            expect(cr).to.be.empty;
        });
    });

    describe('#byRequestAndAssigneeId', function () {
        let review;
        before(async function () {
            return pool.transaction(async (db) => {
                review = await th.createChangeReview(db, req, users.a, users.b);
            });
        });
        after(th.cleanTable('change_review'));

        it('should read ChangeReview by request and assignee id', async function () {
            const rc = await pool.connect(async (db) => {
                return dao.changeReview.byRequestAndAssigneeId(db, req.id, users.a.id);
            });
            expect(rc).to.deep.include({
                id: review.id,
                assignee: { id: users.a.id },
            });
        });

        it('should return null if no review for user and change request', async function () {
            const rc = await pool.connect(async (db) => {
                return dao.changeReview.byRequestAndAssigneeId(db, req.id, users.b.id);
            });
            expect(rc).to.be.null;
        });
    });

    describe('#update', function () {
        let review;
        beforeEach(async function () {
            return pool.transaction(async (db) => {
                review = await th.createChangeReview(db, req, users.a, users.b);
            });
        });
        afterEach(th.cleanTable('change_review'));

        it('should update a change review', async function () {
            const updated = await pool.transaction(async (db) => {
                return dao.changeReview.update(db, review.id, {
                    decision: ApprovalDecision.Rejected,
                    comments: 'Not good enough',
                    userId: users.a.id,
                });
            });
            expect(updated).to.deep.include({
                id: review.id,
                assignee: { id: users.a.id },
                decision: ApprovalDecision.Rejected,
                comments: 'Not good enough',
                createdBy: { id: users.b.id },
                updatedBy: { id: users.a.id },
            });
            expTrackedTime(expect, updated);
        });
    });
});
