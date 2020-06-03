import { ChangeRequestCycle, ApprovalDecision } from '@engspace/core';
import { dao, pool, th } from '.';
import { expect } from 'chai';
import { trackedBy, idType } from '../src';

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
});
