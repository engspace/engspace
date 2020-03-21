import { HasId, Id, PartBaseUpdateInput, Part } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap, foreignKey, tracked, TrackedRow } from './base';

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
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id, base_id, ref, designation, ${tracked.selectToken}
`;

class PartDao extends DaoRowMap<Part, Row> {
    async create(db: Db, { baseId, ref, designation, userId }: PartDaoInput): Promise<Part> {
        const row: Row = await db.one(sql`
            INSERT INTO part (
                base_id, ref, designation, ${tracked.insertListToken}
            )
            VALUES (
                ${baseId}, ${ref}, ${designation}, ${tracked.insertValToken(userId)}
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
                ${tracked.updateAssignmentsToken(userId)}
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
