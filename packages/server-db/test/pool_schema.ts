import { expect } from 'chai';
import { sql } from 'slonik';
import { serverConnConfig } from '.';
import { connectionString, createDbPool, initSchema, prepareDb } from '../src';
import { insertCoreEnums } from '../src/schema';

describe('Pool creation', async () => {
    const dbName = 'engspace_server_db_test2';
    const preparationConf = {
        serverConnString: connectionString(serverConnConfig),
        name: dbName,
        formatDb: true,
    };
    const poolConf = {
        dbConnString: connectionString({
            ...serverConnConfig,
            name: dbName,
        }),
    };
    it('should create a virgin pool', async function() {
        this.timeout(5000);
        await prepareDb(preparationConf);
        const pool = createDbPool(poolConf);
        const tables = await pool.connect(db =>
            db.anyFirst(sql`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
            `)
        );
        expect(tables).to.have.members([]);
    });

    it('should create a pool and a schema', async function() {
        this.timeout(5000);
        await prepareDb(preparationConf);
        const pool = createDbPool(poolConf);
        await pool.transaction(db => initSchema(db));
        const tables = await pool.connect(db =>
            db.anyFirst(sql`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
            `)
        );
        expect(tables).to.have.members([
            'cycle_state_enum',
            'metadata',
            'user',
            'user_login',
            'user_role',
            'project',
            'project_member',
            'project_member_role',
            'part_family',
            'part_base',
            'part',
            'part_revision',
            'document',
            'document_revision',
        ]);
    });

    it('should create code enums', async function() {
        this.timeout(5000);
        await prepareDb(preparationConf);
        const pool = createDbPool(poolConf);
        await pool.transaction(db => initSchema(db));
        const cycleStatesBef = await pool.connect(async db => {
            return db.anyFirst(sql`SELECT id FROM cycle_state_enum`);
        });
        await pool.transaction(db => insertCoreEnums(db));
        const cycleStatesAft = await pool.connect(async db => {
            return db.manyFirst(sql`SELECT id FROM cycle_state_enum`);
        });

        expect(cycleStatesBef).to.have.members([]);
        expect(cycleStatesAft).to.have.members(['edition', 'validation', 'release', 'obsolete']);
    });
});
