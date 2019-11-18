import path from 'path';
import fs from 'fs';
import util from 'util';
import { CommonQueryMethodsType, sql } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';
import { Pool } from './index';
import { sleep } from './util';

const readFileAsync = util.promisify(fs.readFile);

// listed in an order it is safe to delete data
const tables = ['project_member', 'project', 'user'];

async function executeSchema(db: CommonQueryMethodsType): Promise<void> {
    const schemaPath = path.join(__dirname, 'sql/schema.sql');
    const schema = await readFileAsync(schemaPath);
    await Promise.all(
        schema
            .toString()
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0)
            .map(q => db.query(sql`${raw(q)}`))
    );
}

export async function deleteSchema(db: CommonQueryMethodsType): Promise<void> {
    await Promise.all(
        tables.map(t =>
            db.query(sql`
        DROP TABLE IF EXISTS ${sql.identifier([t])} CASCADE
    `)
        )
    );
}

export async function createSchema(
    { preserve } = { preserve: true }
): Promise<void> {
    return Pool.transaction(async db => {
        if (!preserve) {
            await deleteSchema(db);
            await sleep(100);
            await executeSchema(db);
            await sleep(100);
            return;
        }
        const currentTables = await db.anyFirst(sql`
            SELECT table_name
            FROM information_schema.tables
            WHERE
                table_schema = current_schema() AND
                table_name = ANY(${sql.array(tables, 'text')})
        `);
        const newTables = tables.filter(t => t in currentTables);
        if (newTables.length !== 0) {
            await executeSchema(db);
        }
    });
}
