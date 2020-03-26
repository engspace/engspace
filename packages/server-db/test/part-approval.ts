import { pool } from '.';
import {
    cleanTables,
    createPart,
    createPartBase,
    createPartFamily,
    createUsers,
    cleanTable,
    createPartVal,
    createPartRev,
    expTrackedTime,
    trackedBy,
} from '../src/test-helpers';
import { partApprovalDao } from '..';
import { expect } from 'chai';

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
        it('should create part approval', async function() {
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
                ...trackedBy(users.a),
            });
            expTrackedTime(expect, partAppr);
        });
    });
});
