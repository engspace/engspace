import { expect } from 'chai';
import { PartCycle, PartRevision, ChangeRequest, Part } from '@engspace/core';
import { idType, trackedBy } from '../src/test-helpers';
import { dao, pool, th } from '.';

describe('#PartRevisionDao', function () {
    let users;
    let family;
    let part;
    let req;
    before('create deps', async function () {
        return pool.transaction(async (db) => {
            users = await th.createUsersAB(db);
            family = await th.createPartFamily(db);
        });
    });
    after('clean deps', th.cleanTables(['part_family', 'user']));

    this.beforeEach(function () {
        return pool.transaction(async (db) => {
            part = await th.createPart(db, family, users.a, { ref: 'P001.A' });
            req = await th.createChangeRequest(db, users.a, 'CR-001');
        });
    });

    this.afterEach(th.cleanTables(['part', 'change_request']));

    describe('#create', function () {
        afterEach(th.cleanTable('part_revision'));

        it('should create part revision', async function () {
            const pr = await pool.transaction(async (db) => {
                return dao.partRevision.create(db, {
                    partId: part.id,
                    designation: 'Part 1',
                    cycle: PartCycle.Edition,
                    userId: users.a.id,
                    changeRequestId: req.id,
                });
            });
            expect(pr.id).to.be.a(idType);
            expect(pr).to.deep.include({
                part: { id: part.id },
                revision: 1,
                designation: 'Part 1',
                cycle: PartCycle.Edition,
                ...trackedBy(users.a),
            });
        });
    });

    describe('#byPartId - #lastByPartId', function () {
        let partRevs: PartRevision[];
        beforeEach(async function () {
            return pool.transaction(async (db) => {
                partRevs = [];
                partRevs.push(
                    await th.createPartRev(db, part, req, users.a, { cycle: PartCycle.Obsolete })
                );
                partRevs.push(
                    await th.createPartRev(db, part, req, users.a, { cycle: PartCycle.Cancelled })
                );
                partRevs.push(
                    await th.createPartRev(db, part, req, users.a, { cycle: PartCycle.Release })
                );
            });
        });
        afterEach(th.cleanTable('part_revision'));

        it('should get all part revisions', async function () {
            const revs = await pool.connect(async (db) => {
                return dao.partRevision.byPartId(db, part.id);
            });
            expect(revs).to.eql(partRevs);
        });

        it('should get last part revision', async function () {
            const rev = await pool.connect(async (db) => {
                return dao.partRevision.lastByPartId(db, part.id);
            });
            expect(rev).to.eql(partRevs[2]);
        });
    });

    describe('#aboveRev1ByChangeRequestId', function () {
        let reqA: ChangeRequest, reqB: ChangeRequest, reqC: ChangeRequest;
        let part1a: Part, part1b: Part, part2a: Part, part2b: Part;
        let revs1a: PartRevision[], revs1b: PartRevision[];
        let revs2a: PartRevision[], revs2b: PartRevision[];

        this.beforeEach(function () {
            return pool.transaction(async (db) => {
                reqA = req;
                reqB = await th.createChangeRequest(db, users.a, 'CR-002');
                reqC = await th.createChangeRequest(db, users.a, 'CR-003');
                part1a = part;
                part1b = await th.createPart(db, family, users.a, {
                    ref: 'P001.B',
                });
                part2a = await th.createPart(db, family, users.a, {
                    ref: 'P002.A',
                });
                part2b = await th.createPart(db, family, users.a, {
                    ref: 'P002.B',
                });
                revs1a = [
                    await th.createPartRev(db, part1a, reqA, users.a),
                    await th.createPartRev(db, part1a, reqB, users.a),
                    await th.createPartRev(db, part1a, reqC, users.a),
                ];
                revs1b = [
                    await th.createPartRev(db, part1b, reqB, users.a),
                    await th.createPartRev(db, part1b, reqC, users.a),
                ];
                revs2a = [
                    await th.createPartRev(db, part2a, reqA, users.a),
                    await th.createPartRev(db, part2a, reqB, users.a),
                    await th.createPartRev(db, part2a, reqC, users.a),
                ];
                revs2b = [
                    await th.createPartRev(db, part2b, reqB, users.a),
                    await th.createPartRev(db, part2b, reqC, users.a),
                ];
            });
        });
        this.afterEach(th.cleanTables(['part_revision', 'part', 'change_request']));

        it('should get all revisions above 1 for a change request', async function () {
            const { revsA, revsB, revsC } = await pool.connect(async (db) => {
                const revsA = await dao.partRevision.aboveRev1ByChangeRequestId(db, reqA.id);
                const revsB = await dao.partRevision.aboveRev1ByChangeRequestId(db, reqB.id);
                const revsC = await dao.partRevision.aboveRev1ByChangeRequestId(db, reqC.id);
                return { revsA, revsB, revsC };
            });
            expect(revsA).to.be.empty;
            expect(revsB).to.containSubset([{ id: revs1a[1].id }, { id: revs2a[1].id }]);
            expect(revsC).to.containSubset([
                { id: revs1a[2].id },
                { id: revs1b[1].id },
                { id: revs2a[2].id },
                { id: revs2b[1].id },
            ]);
        });
    });

    describe('#updateCycleState', function () {
        let partRev;
        beforeEach(async function () {
            partRev = await th.transacPartRev(part, req, users.a, {
                cycle: PartCycle.Edition,
            });
        });
        afterEach(th.cleanTable('part_revision'));
        it('should update cycle state', async function () {
            const pr = await pool.transaction(async (db) => {
                return dao.partRevision.updateCycleState(db, partRev.id, PartCycle.Release);
            });
            expect(pr).to.eql({
                ...partRev,
                cycle: PartCycle.Release,
            });
        });
    });
});
