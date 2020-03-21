import { DaoRowMap, foreignKey, TrackedRow, tracked } from './base';
import { PartBase, HasId, Id, PartBaseInput, PartBaseUpdateInput } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

interface Row extends HasId, TrackedRow {
    id: Id;
    familyId: Id;
    baseRef: string;
    designation: string;
}

function mapRow(row: Row): PartBase {
    const { id, familyId, baseRef, designation } = row;
    return {
        id,
        family: foreignKey(familyId),
        baseRef,
        designation,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
        id, family_id, base_ref, designation, ${tracked.selectToken}
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
                family_id, base_ref, designation, ${tracked.insertListToken}
            )
            VALUES (
                ${familyId}, ${baseRef}, ${designation}, ${tracked.insertValToken(userId)}
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
                ${tracked.updateAssignmentsToken(userId)}
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
