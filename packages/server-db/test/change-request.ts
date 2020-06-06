import { expect } from 'chai';
import { ChangeRequestCycle, ApprovalDecision } from '@engspace/core';
import { trackedBy, idType, expTrackedTime } from '../src';
import { dao, pool, th } from '.';

describe('ChangeRequestDao', function () {
    let users;
    before(async function () {
        await pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
        });
    });
    after(th.cleanTable('user'));

    describe('create', function () {
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

    describe('update', function () {
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
            expTrackedTime(expect, updated, 1000);
        });
    });
});
