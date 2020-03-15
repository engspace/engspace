import { HasId, Id, PartBaseUpdateInput } from '@engspace/core';
import { Part } from 'core/src/schema';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap, foreignKey, mapTrackedRow, TrackedRow, trackedSqlToken } from './base';

export interface PartDaoInput {
    baseId: Id;
    ref: string;
    designation: string;
    userId: Id;
}

interface Row extends HasId, TrackedRow {
    id: Id;
    baseId: Id;
    ref: string;
    designation: string;
}

function mapRow(row: Row): Part {
    const { id, baseId, ref, designation } = row;
    return {
        id,
        base: foreignKey(baseId),
        ref,
        designation,
        ...mapTrackedRow(row),
    };
}

const rowToken = sql`
        id, base_id, ref, designation, ${trackedSqlToken}
    `;

class PartDao extends DaoRowMap<Part, Row> {
    async create(db: Db, { baseId, ref, designation, userId }: PartDaoInput): Promise<Part> {
        const row: Row = await db.one(sql`
            INSERT INTO part (
                base_id, ref, designation, created_by, created_at, updated_by, updated_at
            )
            VALUES (
                ${baseId}, ${ref}, ${designation}, ${userId}, NOW(), ${userId}, NOW()
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async updateById(
        db: Db,
        id: Id,
        { designation }: PartBaseUpdateInput,
        userId: Id
    ): Promise<Part> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part SET
                designation = ${designation},
                updated_by = ${userId},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        return row ? mapRow(row) : null;
    }
}

export const partDao = new PartDao({
    table: 'part',
    rowToken,
    mapRow,
});
