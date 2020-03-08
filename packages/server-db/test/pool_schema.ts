import { expect } from 'chai';
import { sql } from 'slonik';
import { config, serverConnConfig } from '.';
import { createDbPool, initSchema, prepareDb, connectionString } from '../src';

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
            'metadata',
            'user',
            'user_login',
            'user_role',
            'project',
            'project_member',
            'project_member_role',
            'document',
            'document_revision',
            'part_family',
            'part_base',
        ]);
    });
});
