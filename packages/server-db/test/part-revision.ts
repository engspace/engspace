import { CycleState } from '@engspace/core';
import { expect } from 'chai';
import { dao, pool, th } from '.';
import { trackedBy } from '../src/test-helpers';

describe('PartRevisionDao', function() {
    let users;
    let fam;
    let partBase;
    let part;
    before('create deps', async function() {
        return pool.transaction(async db => {
            users = await th.createUsersAB(db);
            fam = await th.createPartFamily(db, { code: 'P' });
            partBase = await th.createPartBase(db, fam, users.a, 'P01');
            part = await th.createPart(db, partBase, users.a, 'P01.A');
        });
    });
    after('clean deps', th.cleanTables(['part', 'part_base', 'part_family', 'user']));

    describe('Create', function() {
        afterEach(th.cleanTable('part_revision'));

        it('should create part revision', async function() {
            const pr = await pool.transaction(async db => {
                return dao.partRevision.create(db, {
                    partId: part.id,
                    designation: 'Part 1',
                    cycleState: CycleState.Edition,
                    userId: users.a.id,
                });
            });
            expect(pr.id).to.be.uuid();
            expect(pr).to.deep.include({
                part: { id: part.id },
                revision: 1,
                designation: 'Part 1',
                cycleState: CycleState.Edition,
                ...trackedBy(users.a),
            });
        });
    });

    describe('Update', function() {
        let partRev;
        beforeEach(async function() {
            partRev = await th.transacPartRev(part, users.a, {
                cycleState: CycleState.Edition,
            });
        });
        afterEach(th.cleanTable('part_revision'));
        it('should update cycle state', async function() {
            const pr = await pool.transaction(async db => {
                return dao.partRevision.updateCycleState(db, partRev.id, CycleState.Release);
            });
            expect(pr).to.eql({
                ...partRev,
                cycleState: CycleState.Release,
            });
        });
    });
});
