import { PartCycle, ValidationResult, ChangeRequestCycle } from '@engspace/core';
import fs from 'fs';
import path from 'path';
import { sql } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';
import { Db } from '.';

// const currentVersion = 1;

function sqlPath(relPath: string): string {
    return path.join(__dirname, '../sql', relPath);
}

async function executeSql(db: Db, code: string): Promise<void> {
    try {
        await db.query(sql`${raw(code)}`);
    } catch (err) {
        /* istanbul ignore next */
        throw new Error(`Error executing SQL: ${err.message}:\n${code}\n`);
    }
}

async function executeSqlFile(db: Db, sqlFile: string): Promise<void> {
    const sqlContent = await fs.promises.readFile(sqlFile);
    const commands = sqlContent
        .toString()
        .split(';')
        .map(c => c.trim())
        .filter(c => c.length > 0);
    for (const c of commands) {
        await executeSql(db, c);
    }
}

async function executeSqlFolder(db: Db, sqlFolder: string): Promise<void> {
    const sqlFiles = (await fs.promises.readdir(sqlFolder))
        .filter(p => p.toLowerCase().endsWith('.sql'))
        .map(p => path.join(sqlFolder, p));
    for (const sqlFile of sqlFiles) {
        const sqlContent = await fs.promises.readFile(sqlFile);
        await executeSql(db, sqlContent.toString());
    }
}

async function createSchema(db: Db): Promise<void> {
    await executeSqlFile(db, sqlPath('extensions.sql'));
    await executeSqlFile(db, sqlPath('enums.sql'));
    await executeSqlFolder(db, sqlPath('functions'));
    await executeSqlFile(db, sqlPath('schema.sql'));
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

// export async function insertEnumWithDesc(
//     db: Db,
//     table: EnumTable,
//     en: Array<{ key: string; description: string }>
// ): Promise<void> {
//     await db.any(sql`
//         INSERT INTO ${sql.identifier([table.table])} (
//             ${sql.identifier([table.key ?? 'id'])},
//             ${sql.identifier([table.description ?? 'description'])}
//         )
//         VALUES ${sql.join(
//             en.map(e => sql`(${e.key}, ${e.description})`),
//             sql`, `
//         )}
//     `);
// }

async function insertCoreEnums(db: Db): Promise<void> {
    await insertEnum(db, Object.values(PartCycle), {
        table: 'part_cycle_enum',
    });
    await insertEnum(db, Object.values(ValidationResult), {
        table: 'validation_result_enum',
    });
    await insertEnum(db, Object.values(ChangeRequestCycle), {
        table: 'change_request_cycle_enum',
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
        await insertCoreEnums(db);
        // } else {
        //     const { dbVersion, application } = await db.one(
        //         sql`SELECT schema_version, application_id FROM metadata`
        //     );
        //     if (application != 'engspace') {
        //         throw new Error("Database has a metadata table, but not from 'Engineering space'");
        //     }
        //     await upgradeSchema(db, dbVersion, currentVersion);
    }
}
