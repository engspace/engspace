import { HasId, Id, DateTime, Tracked } from '@engspace/core';
import { sql, SqlTokenType } from 'slonik';
import { Db } from '..';
import { Dao } from '.';

export function foreignKey(id: Id | null): HasId | null {
    return id ? { id } : null;
}

export function timestamp(ts: number | null): DateTime | null {
    return ts ? ts * 1000 : null;
}

export interface TrackedRow {
    createdBy: Id;
    createdAt: number;
    updatedBy: Id;
    updatedAt: number;
}

export const tracked = {
    mapRow({ createdBy, createdAt, updatedBy, updatedAt }: TrackedRow): Tracked {
        return {
            createdBy: foreignKey(createdBy),
            createdAt: timestamp(createdAt),
            updatedBy: foreignKey(updatedBy),
            updatedAt: timestamp(updatedAt),
        };
    },

    selectToken: sql`
        created_by, EXTRACT(EPOCH FROM created_at) AS created_at,
        updated_by, EXTRACT(EPOCH FROM updated_at) AS updated_at
    `,

    insertListToken: sql`created_by, created_at, updated_by, updated_at`,

    insertValToken(userId: Id): SqlTokenType {
        return sql`${userId}, NOW(), ${userId}, NOW()`;
    },

    updateAssignmentsToken(userId: Id): SqlTokenType {
        return sql`updated_by = ${userId}, updated_at = NOW()`;
    },
};

function reorderWithIds<T extends HasId>(objs: T[], ids: readonly Id[]): T[] {
    return ids.map(id => objs.find(o => o.id === id));
}

function reorderWithIdsAndMap<Row extends HasId, OutT extends HasId>(
    rows: Row[],
    ids: readonly Id[],
    func: (inp: Row) => OutT
): OutT[] {
    return ids.map(id => func(rows.find(o => o.id === id)));
}

export interface DaoIdentConfig {
    table: string;
    rowToken: SqlTokenType;
}

export class DaoIdent<T extends HasId> implements Dao<T> {
    public readonly table: string;
    public readonly rowToken: SqlTokenType;

    constructor(config: DaoIdentConfig) {
        this.table = config.table;
        this.rowToken = config.rowToken;
    }

    async byId(db: Db, id: Id): Promise<T> {
        const row: T = await db.maybeOne(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
        `);
        return row;
    }

    async checkId(db: Db, id: Id): Promise<boolean> {
        const res = await db.maybeOneFirst(sql`
            SELECT id FROM ${sql.identifier([this.table])}
            WHERE id=${id}
        `);
        return !!res;
    }

    async batchByIds(db: Db, ids: readonly Id[]): Promise<T[]> {
        const rows: T[] = await db.any(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ANY(${sql.array(ids as Id[], sql`uuid[]`)})
        `);
        return reorderWithIds(rows, ids);
    }

    async deleteById(db: Db, id: Id): Promise<T> {
        const row: T = await db.maybeOne(sql`
            DELETE FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return row;
    }

    async deleteAll(db: Db): Promise<number> {
        const q = await db.query(sql`
            DELETE FROM ${sql.identifier([this.table])}
        `);
        return q.rowCount;
    }
}

export interface DaoRowMapConfig<T extends HasId, R extends HasId> {
    table: string;
    rowToken: SqlTokenType;
    mapRow: (row: R) => T;
}

export class DaoRowMap<T extends HasId, R extends HasId> implements Dao<T> {
    public readonly table: string;
    public readonly mapRow: (row: R) => T;
    public readonly rowToken: SqlTokenType;

    constructor(config: DaoRowMapConfig<T, R>) {
        this.table = config.table;
        this.rowToken = config.rowToken;
        this.mapRow = config.mapRow;
    }

    async byId(db: Db, id: Id): Promise<T> {
        const row: R = await db.maybeOne(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
        `);
        return row ? this.mapRow(row) : null;
    }

    async checkId(db: Db, id: Id): Promise<boolean> {
        const res = await db.maybeOneFirst(sql`
            SELECT id FROM ${sql.identifier([this.table])}
            WHERE id=${id}
        `);
        return !!res;
    }

    async batchByIds(db: Db, ids: readonly Id[]): Promise<T[]> {
        const rows: R[] = await db.any(sql`
            SELECT ${this.rowToken} FROM ${sql.identifier([this.table])}
            WHERE id = ANY(${sql.array(ids as Id[], sql`uuid[]`)})
        `);
        return reorderWithIdsAndMap(rows, ids, this.mapRow);
    }

    async deleteById(db: Db, id: Id): Promise<T> {
        const row: R = await db.maybeOne(sql`
            DELETE FROM ${sql.identifier([this.table])}
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return row ? this.mapRow(row) : null;
    }

    async deleteAll(db: Db): Promise<number> {
        const q = await db.query(sql`
            DELETE FROM ${sql.identifier([this.table])}
        `);
        return q.rowCount;
    }
}
