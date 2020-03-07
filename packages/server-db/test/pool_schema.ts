import { expect } from 'chai';
import { sql } from 'slonik';
import { dbConfig } from '.';
import { createDbPool, initSchema, prepareDb } from '../src';

describe('Pool creation', async () => {
    const localConf = {
        ...dbConfig,
        name: 'engspace_db_test2',
    };
    it('should create a virgin pool', async function() {
        this.timeout(5000);
        await prepareDb({ ...localConf, formatDb: true });
        const pool = createDbPool(localConf);
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
        await prepareDb({ ...localConf, formatDb: true });
        const pool = createDbPool(localConf);
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
