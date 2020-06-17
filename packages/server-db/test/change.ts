import { expect } from 'chai';
import { ChangeCycle, ApprovalDecision } from '@engspace/core';
import { trackedBy, idType, expTrackedTime } from '../src';
import { dao, pool, th } from '.';

describe('#ChangeDao', function () {
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
        this.afterEach(th.cleanTable('change'));

        it('should create a Change', async function () {
            const ch = await pool.transaction(async (db) => {
                return dao.change.create(db, {
                    name: 'CH-001',
                    userId: users.a.id,
                });
            });
            expect(ch).to.deep.include({
                name: 'CH-001',
                description: null,
                cycle: ChangeCycle.Preparation,
                state: null,
                ...trackedBy(users.a),
            });
            expect(ch.id).to.be.a(idType);
        });

        it('should create a Change with description', async function () {
            const ch = await pool.transaction(async (db) => {
                return dao.change.create(db, {
                    name: 'CH-001',
                    userId: users.a.id,
                    description: 'SUPER CHANGE',
                });
            });
            expect(ch).to.deep.include({
                name: 'CH-001',
                description: 'SUPER CHANGE',
                cycle: ChangeCycle.Preparation,
                state: null,
                ...trackedBy(users.a),
            });
            expect(ch.id).to.be.a(idType);
        });

        it('should create a Change with initial cycle', async function () {
            const ch = await pool.transaction(async (db) => {
                return dao.change.create(db, {
                    name: 'CH-001',
                    userId: users.a.id,
                    cycle: ChangeCycle.Evaluation,
                });
            });
            expect(ch).to.deep.include({
                name: 'CH-001',
                description: null,
                cycle: ChangeCycle.Evaluation,
                state: ApprovalDecision.Approved,
                ...trackedBy(users.a),
            });
            expect(ch.id).to.be.a(idType);
        });
    });

    describe('state', function () {
        let ch;
        this.beforeEach(async function () {
            ch = await pool.transaction(async (db) => {
                return dao.change.create(db, {
                    name: 'CH-001',
                    description: 'SUPER CHANGE',
                    userId: users.a.id,
                    cycle: ChangeCycle.Evaluation,
                });
            });
        });
        this.afterEach(th.cleanTables(['change_review', 'change']));

        it('should be rejected if one review is rejected', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, ch, users.a, users.a, {
                    decision: ApprovalDecision.Rejected,
                });
                await th.createChangeReview(db, ch, users.b, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.c, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.change.byId(db, ch.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Rejected);
        });

        it('should be pending if one review is pending', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, ch, users.a, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.b, users.a, {
                    decision: ApprovalDecision.Pending,
                });
                await th.createChangeReview(db, ch, users.c, users.a, {
                    decision: ApprovalDecision.Reserved,
                });
                await th.createChangeReview(db, ch, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.change.byId(db, ch.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Pending);
        });

        it('should be reserved if one review is reserved', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, ch, users.a, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.b, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.c, users.a, {
                    decision: ApprovalDecision.Reserved,
                });
                await th.createChangeReview(db, ch, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.change.byId(db, ch.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Reserved);
        });

        it('should be approved if all reviews are approved', async function () {
            const req = await pool.connect(async (db) => {
                await th.createChangeReview(db, ch, users.a, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.b, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.c, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.d, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                await th.createChangeReview(db, ch, users.e, users.a, {
                    decision: ApprovalDecision.Approved,
                });
                return dao.change.byId(db, ch.id);
            });
            expect(req.state).to.eql(ApprovalDecision.Approved);
        });
    });

    describe('Updates', function () {
        let ch;
        this.beforeEach(async function () {
            ch = await pool.transaction(async (db) => {
                return dao.change.create(db, {
                    name: 'CH-001',
                    description: 'SUPER CHANGE',
                    userId: users.a.id,
                    cycle: ChangeCycle.Evaluation,
                });
            });
        });
        this.afterEach(th.cleanTable('change'));

        describe('#update', function () {
            it('should update the description', async function () {
                const updated = await pool.transaction(async (db) => {
                    return dao.change.update(db, ch.id, {
                        description: 'AWESOME CHANGE',
                        userId: users.b.id,
                    });
                });
                expect(updated).to.deep.include({
                    name: 'CH-001',
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
                    return dao.change.updateCycle(db, ch.id, ChangeCycle.Engineering, users.b.id);
                });
                expect(updated).to.deep.include({
                    name: 'CH-001',
                    cycle: ChangeCycle.Engineering,
                    createdBy: { id: users.a.id },
                    updatedBy: { id: users.b.id },
                });
                expTrackedTime(expect, updated);
            });
        });
    });
});
