import { ApprovalDecision, PartCycle, ValidationResult } from '@engspace/core';
import { expect } from 'chai';
import { sql } from 'slonik';
import { serverConnConfig } from '.';
import {
    connectionString,
    createDbPool,
    DbPoolConfig,
    DbPreparationConfig,
    initSchema,
    prepareDb,
} from '../src';

function preparationConf(dbName: string): DbPreparationConfig {
    return {
        serverConnString: connectionString(serverConnConfig),
        name: dbName,
        formatDb: true,
    };
}

function poolConf(dbName: string): DbPoolConfig {
    return {
        dbConnString: connectionString({
            ...serverConnConfig,
            name: dbName,
        }),
    };
}

describe('Pool and Schema', async () => {
    describe('Virgin pool', function () {
        const name = 'engspace_db_test_virgin';
        before(async function () {
            this.timeout(5000);
            await prepareDb(preparationConf(name));
        });

        it('should create a virgin pool', async function () {
            const pool = createDbPool(poolConf(name));
            const tables = await pool.connect((db) =>
                db.anyFirst(sql`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
            `)
            );
            expect(tables).to.have.members([]);
        });
    });

    describe('Schema', function () {
        const name = 'engspace_db_test_schema';
        let pool;
        before(async function () {
            this.timeout(5000);
            await prepareDb(preparationConf(name));
            pool = createDbPool(poolConf(name));
            await pool.transaction(async (db) => {
                await initSchema(db);
            });
        });

        it('should have created all tables', async function () {
            const tables = await pool.connect((db) =>
                db.anyFirst(sql`
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = 'public'
                `)
            );
            expect(tables).to.have.same.members([
                'part_cycle_enum',
                'validation_result_enum',
                'change_request_cycle_enum',

                'metadata',
                'user',
                'user_login',
                'user_role',
                'project',
                'project_member',
                'project_member_role',
                'part_family',
                'part',
                'part_revision',
                'part_validation',
                'part_approval',
                'change_request',
                'change_part_create',
                'change_part_change',
                'change_part_revision',
                'change_review',
                'document',
                'document_revision',
            ]);
        });

        it('should have created core enums tables', async function () {
            const cycles = await pool.connect(async (db) => {
                return db.manyFirst(sql`SELECT id FROM part_cycle_enum`);
            });
            const valResults = await pool.connect(async (db) => {
                return db.manyFirst(sql`SELECT id FROM validation_result_enum`);
            });
            expect(cycles).to.have.same.members(Object.values(PartCycle));
            expect(valResults).to.have.same.members(Object.values(ValidationResult));
        });

        it('should have created core pg enums', async function () {
            const apprStates = await pool.connect(async (db) => {
                return db.manyFirst(sql`
                    SELECT enumlabel
                    FROM pg_type JOIN pg_enum
                        ON pg_enum.enumtypid = pg_type.oid
                    WHERE typname = 'approval_decision_enum'`);
            });
            expect(apprStates).to.have.same.members(Object.values(ApprovalDecision));
        });
    });
});
