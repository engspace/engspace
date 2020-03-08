import { DaoRowMap, foreignKey, timestamp } from './base';
import { PartBase, HasId, Id, PartBaseInput, PartBaseUpdateInput } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

interface Row extends HasId {
    id: Id;
    familyId: Id;
    baseRef: string;
    designation: string;
    createdBy: Id;
    createdAt: number;
    updatedBy?: Id;
    updatedAt?: number;
}

function mapRow({
    id,
    familyId,
    baseRef,
    designation,
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
}: Row): PartBase {
    return {
        id,
        family: foreignKey(familyId),
        baseRef,
        designation,
        createdBy: foreignKey(createdBy),
        createdAt: timestamp(createdAt),
        updatedBy: foreignKey(updatedBy),
        updatedAt: timestamp(updatedAt),
    };
}

const rowToken = sql`
        id, family_id, base_ref, designation,
        created_by, EXTRACT(EPOCH FROM created_at) AS created_at,
        updated_by, EXTRACT(EPOCH FROM updated_at) AS updated_at
    `;

class PartBaseDao extends DaoRowMap<PartBase, Row> {
    async create(
        db: Db,
        { familyId, designation }: PartBaseInput,
        baseRef: string,
        userId: Id
    ): Promise<PartBase> {
        const row: Row = await db.one(sql`
            INSERT INTO part_base (
                family_id, base_ref, designation, created_by, created_at, updated_by, updated_at
            )
            VALUES (
                ${familyId}, ${baseRef}, ${designation}, ${userId}, NOW(), ${userId}, NOW()
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
    ): Promise<PartBase> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part_base SET
                designation = ${designation},
                updated_by = ${userId},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        return row ? mapRow(row) : null;
    }
}

export const partBaseDao = new PartBaseDao({
    table: 'part_base',
    rowToken,
    mapRow,
});
