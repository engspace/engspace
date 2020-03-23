import fs from 'fs';
import path from 'path';
import { sql } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';
import { Db } from '.';
import { CycleState } from '@engspace/core';

// import metadata from '../sql/metadata.json';

async function executeSqlFile(db: Db, filename: string): Promise<void> {
    const sqlPath = path.join(__dirname, '../sql', filename);
    const sqlContent = await fs.promises.readFile(sqlPath);
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

async function createSchema(db: Db): Promise<void> {
    await executeSqlFile(db, 'extensions.sql');
    await executeSqlFile(db, 'enums.sql');
    await executeSqlFile(db, 'schema.sql');
}

interface EnumTable {
    table: string;
    key?: string;
    description?: string;
}

export async function insertEnum(db: Db, en: string[], table: EnumTable): Promise<void> {
    await db.any(sql`
        INSERT INTO ${sql.identifier([table.table])} (
            ${sql.identifier([table.key ?? 'id'])}
        )
        VALUES ${sql.join(
            en.map(e => sql`(${e})`),
            sql`, `
        )}
    `);
}

export async function insertEnumWithDesc(
    db: Db,
    table: EnumTable,
    en: Array<{ key: string; description: string }>
): Promise<void> {
    await db.any(sql`
        INSERT INTO ${sql.identifier([table.table])} (
            ${sql.identifier([table.key ?? 'id'])},
            ${sql.identifier([table.description ?? 'description'])}
        )
        VALUES ${sql.join(
            en.map(e => sql`(${e.key}, ${e.description})`),
            sql`, `
        )}
    `);
}

export async function insertCoreEnums(db: Db): Promise<void> {
    await insertEnum(db, Object.values(CycleState), {
        table: 'cycle_state_enum',
    });
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

export async function initSchema(db: Db): Promise<void> {
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
