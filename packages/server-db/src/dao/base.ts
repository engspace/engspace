import { sql, SqlTokenType } from 'slonik';
import { DateTime, HasId, Id, Tracked } from '@engspace/core';
import { Db, SqlLiteral } from '..';
import { Dao } from '.';

export type RowId = number;

export const toId = (id: RowId): Id => id.toString();

export interface HasRowId {
    id: RowId;
}

export function foreignKey(id: RowId | null): HasId | null {
    return id ? { id: id.toString() } : null;
}

export function timestamp(ts: number | null): DateTime | null {
    return ts ? ts * 1000 : null;
}

export function nullable<T>(val: undefined | T): null | T {
    return val ?? null;
}

export interface TrackedRow {
    createdBy: RowId;
    createdAt: number;
    updatedBy: RowId;
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

    selectTokenAlias(alias: string): SqlTokenType {
        return sql`
            ${sql.identifier([alias, 'created_by'])} AS created_by,
            ${sql.identifier([alias, 'created_at'])} AS created_at,
            ${sql.identifier([alias, 'updated_by'])} AS updated_by,
            ${sql.identifier([alias, 'updated_at'])} AS updated_at
        `;
    },

    insertListToken: sql`created_by, created_at, updated_by, updated_at`,

    insertValToken(userId: Id): SqlTokenType {
        return sql`${userId}, NOW(), ${userId}, NOW()`;
    },

    updateAssignmentsToken(userId: Id): SqlTokenType {
        return sql`updated_by = ${userId}, updated_at = NOW()`;
    },
};

function reorderWithIdsAndMap<Row extends HasRowId, OutT extends HasId>(
    rows: Row[],
    ids: readonly Id[],
    func: (inp: Row) => OutT
): OutT[] {
    return ids.map((id) => func(rows.find((o) => toId(o.id) === id)));
}

export interface DaoBaseConfig<T extends HasId, R extends HasRowId> {
    rowToken: SqlTokenType;
    mapRow: (row: R) => T;
}

export class DaoBase<T extends HasId, R extends HasRowId> implements Dao<T> {
    public readonly table: string;
    public readonly mapRow: (row: R) => T;
    public readonly rowToken: SqlTokenType;

    constructor(table: string, config: DaoBaseConfig<T, R>) {
        this.table = table;
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

    async rowCount(db: Db): Promise<number> {
        const count = await db.oneFirst(sql`
            SELECT COUNT(*) FROM ${sql.identifier([this.table])}
        `);
        return count as number;
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
            WHERE id = ANY(${sql.array(ids as Id[], 'int4')})
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
