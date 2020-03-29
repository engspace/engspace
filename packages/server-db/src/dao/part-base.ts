import { DaoRowMap, foreignKey, TrackedRow, tracked } from './base';
import { PartBase, HasId, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

interface Row extends HasId, TrackedRow {
    id: Id;
    familyId: Id;
    baseRef: string;
}

function mapRow(row: Row): PartBase {
    const { id, familyId, baseRef } = row;
    return {
        id,
        family: foreignKey(familyId),
        baseRef,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
        id, family_id, base_ref, ${tracked.selectToken}
    `;

export interface PartBaseDaoInput {
    familyId: Id;
    baseRef: string;
    userId: Id;
}

class PartBaseDao extends DaoRowMap<PartBase, Row> {
    async create(db: Db, { familyId, baseRef, userId }: PartBaseDaoInput): Promise<PartBase> {
        const row: Row = await db.one(sql`
            INSERT INTO part_base (
                family_id, base_ref, ${tracked.insertListToken}
            )
            VALUES (
                ${familyId}, ${baseRef}, ${tracked.insertValToken(userId)}
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
