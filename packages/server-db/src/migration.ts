import fs from 'fs';
import path from 'path';
import { sql } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';
import { Db, SqlLiteral } from '.';
import { currentSchemaLevel, esMigrationSet } from '.';

export enum SqlOperationKind {
    File,
    Folder,
    Stmt,
}

export interface SqlOperationParamsFile {
    path: string;
    stmtSplit?: string;
}

export interface SqlOperationParamsFolder {
    path: string;
    stmtSplit?: string;
    recursive: boolean;
}

export interface SqlOperationParamsStmt {
    stmt: SqlLiteral;
}

export interface SqlOperationFile extends SqlOperationParamsFile {
    kind: SqlOperationKind.File;
}

export interface SqlOperationFolder extends SqlOperationParamsFolder {
    kind: SqlOperationKind.Folder;
}

export interface SqlOperationStmt extends SqlOperationParamsStmt {
    kind: SqlOperationKind.Stmt;
}

export type SqlOperation = SqlOperationFile | SqlOperationFolder | SqlOperationStmt;

export const sqlOperation = {
    file: (params: SqlOperationParamsFile): SqlOperationFile => ({
        kind: SqlOperationKind.File,
        ...params,
    }),
    folder: (params: SqlOperationParamsFolder): SqlOperationFolder => ({
        kind: SqlOperationKind.Folder,
        ...params,
    }),
    stmt: (params: SqlOperationParamsStmt): SqlOperationStmt => ({
        kind: SqlOperationKind.Stmt,
        ...params,
    }),
};

/**
 * A database migration
 */
export interface Migration {
    /**
     * The schema level number this migration promotes
     */
    level: number;

    /**
     * Operations that promote the database to this schema level
     */
    promote: SqlOperation[];

    /**
     * Operations that demote the database to the previous schema level
     */
    demote: SqlOperation[];
}

/**
 * Sets of migrations for an application
 */
export interface MigrationSet {
    [level: number]: Migration;
}

export function esTreeSqlPath(relPath: string): string {
    return path.join(__dirname, '../sql', relPath);
}

async function executeSqlStmt(db: Db, { stmt }: SqlOperationParamsStmt): Promise<void> {
    try {
        await db.query(stmt);
    } catch (err) {
        /* istanbul ignore next */
        throw new Error(`Error executing SQL: ${err.message}:\n${stmt.sql}\n`);
    }
}

async function executeSqlFile(db: Db, { path, stmtSplit }: SqlOperationParamsFile): Promise<void> {
    const sqlContent = (await fs.promises.readFile(path)).toString();
    let commands: string[] = [];
    if (stmtSplit) {
        commands = sqlContent.split(stmtSplit);
    } else {
        commands = [sqlContent];
    }

    const stmts = commands
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
        .map((c) => sql`${raw(c)}`);

    for (const stmt of stmts) {
        await executeSqlStmt(db, { stmt });
    }
}

async function executeSqlFolder(
    db: Db,
    { path: folderPath, stmtSplit, recursive }: SqlOperationParamsFolder
): Promise<void> {
    const entries = (await fs.promises.readdir(folderPath))
        .sort()
        .map((p) => path.join(folderPath, p));
    for (const entry of entries) {
        if (recursive && (await fs.promises.stat(entry)).isDirectory()) {
            executeSqlFolder(db, { path: entry, recursive });
        } else {
            executeSqlFile(db, { path: entry, stmtSplit });
        }
    }
}
export async function executeSql(db: Db, sqlOps: SqlOperation[]): Promise<void> {
    for (const op of sqlOps) {
        switch (op.kind) {
            case SqlOperationKind.File:
                await executeSqlFile(db, op);
                break;
            case SqlOperationKind.Folder:
                await executeSqlFolder(db, op);
                break;
            case SqlOperationKind.Stmt:
                await executeSqlStmt(db, op);
                break;
        }
    }
}

async function readCurrentSchemaLevel(db: Db): Promise<number> {
    const hasMetadataTable = await db.maybeOneFirst(sql`
        SELECT COUNT(table_name)
        FROM information_schema.tables
        WHERE
            table_schema = current_schema() AND
            table_name = 'metadata'
    `);
    if (hasMetadataTable) {
        const schemaLevel = await db.oneFirst(sql`SELECT schema_level FROM metadata`);
        return schemaLevel as number;
    } else {
        return 0;
    }
}

async function writeCurrentSchemaLevel(db: Db, level): Promise<void> {
    await db.query(sql`
        UPDATE metadata SET schema_level = ${level}
    `);
}

export async function syncSchema(db: Db, level?: number, migrations?: MigrationSet): Promise<void> {
    if (typeof level === 'undefined') {
        level = currentSchemaLevel;
    }
    if (typeof migrations === 'undefined') {
        migrations = esMigrationSet;
    }
    let schemaLevel = await readCurrentSchemaLevel(db);

    while (schemaLevel < level) {
        await executeSql(db, migrations[schemaLevel + 1].promote);
        schemaLevel += 1;
    }
    while (schemaLevel > level) {
        await executeSql(db, migrations[schemaLevel].demote);
        schemaLevel -= 1;
    }
    await writeCurrentSchemaLevel(db, level);
}
