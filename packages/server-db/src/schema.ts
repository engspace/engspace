import fs from 'fs';
import path from 'path';
import { DatabaseTransactionConnectionType, sql } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';
import util from 'util';
import { Db } from '.';

// import metadata from './sql/metadata.json';

const readFileAsync = util.promisify(fs.readFile);

async function executeSqlFile(db: Db, filename: string): Promise<void> {
    const sqlPath = path.join(__dirname, 'sql', filename);
    const sqlContent = await readFileAsync(sqlPath);
    const commands = sqlContent
        .toString()
        .split(';')
        .map(c => c.trim())
        .filter(c => c.length > 0);
    for (const c of commands) {
        try {
            await db.query(sql`${raw(c)}`);
        } catch (err) {
            /* istanbul ignore next */
            throw new Error(`Error executing SQL: ${err.message}:\n${c}\n`);
        }
    }
}

async function createSchema(db: DatabaseTransactionConnectionType): Promise<void> {
    await executeSqlFile(db, 'extensions.sql');
    await executeSqlFile(db, 'schema.sql');
}

// async function upgradeSchema(
//     db: DatabaseTransactionConnectionType,
//     dbVersion: number,
//     appVersion: number
// ): Promise<void> {
//     if (dbVersion != appVersion) {
//         // TODO
//     }
// }

export async function initSchema(db: DatabaseTransactionConnectionType): Promise<void> {
    const hasMetadataTable = await db.maybeOneFirst(sql`
            SELECT COUNT(table_name)
            FROM information_schema.tables
            WHERE
                table_schema = current_schema() AND
                table_name = 'metadata'`);
    /* istanbul ignore else */
    if (!hasMetadataTable) {
        await createSchema(db);
        // } else {
        //     const { dbVersion, application } = await db.one(
        //         sql`SELECT schema_version, application_id FROM metadata`
        //     );
        //     if (application != 'engspace') {
        //         throw new Error("Database has a metadata table, but not from 'Engineering space'");
        //     }
        //     await upgradeSchema(db, dbVersion, metadata.currentVersion);
    }
}
