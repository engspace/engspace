import { DaoRowMap, foreignKey, TrackedRow, tracked } from './base';
import { PartBase, HasId, Id } from '@engspace/core';
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

export interface PartBaseDaoInput {
    familyId: Id;
    baseRef: string;
    designation: string;
    userId: Id;
}

class PartBaseDao extends DaoRowMap<PartBase, Row> {
    async create(
        db: Db,
        { familyId, baseRef, designation, userId }: PartBaseDaoInput
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
}

export const partBaseDao = new PartBaseDao({
    table: 'part_base',
    rowToken,
    mapRow,
});
