import { HasId, Id, PartBaseUpdateInput } from '@engspace/core';
import { Part } from 'core/src/schema';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap, foreignKey, timestamp } from './base';

export interface PartDaoInput {
    baseId: Id;
    ref: string;
    designation: string;
    userId: Id;
}

interface Row extends HasId {
    id: Id;
    baseId: Id;
    ref: string;
    designation: string;
    createdBy: Id;
    createdAt: number;
    updatedBy?: Id;
    updatedAt?: number;
}

function mapRow({
    id,
    baseId,
    ref,
    designation,
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
}: Row): Part {
    return {
        id,
        base: foreignKey(baseId),
        ref,
        designation,
        createdBy: foreignKey(createdBy),
        createdAt: timestamp(createdAt),
        updatedBy: foreignKey(updatedBy),
        updatedAt: timestamp(updatedAt),
    };
}

const rowToken = sql`
        id, base_id, ref, designation,
        created_by, EXTRACT(EPOCH FROM created_at) AS created_at,
        updated_by, EXTRACT(EPOCH FROM updated_at) AS updated_at
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
