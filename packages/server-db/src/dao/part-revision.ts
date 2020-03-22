import { HasId, Id, PartRevision, CycleState } from '@engspace/core';
import { TrackedRow, foreignKey, tracked, DaoRowMap } from './base';
import { sql } from 'slonik';
import { Db } from '..';

export interface PartRevisionDaoInput {
    partId: Id;
    designation: string;
    cycleState: CycleState;
    userId: Id;
}

interface Row extends HasId, TrackedRow {
    partId: Id;
    revision: number;
    designation: string;
    cycleState: string;
}

function mapRow(row: Row): PartRevision {
    const { id, partId, revision, designation, cycleState } = row;
    return {
        id,
        part: foreignKey(partId),
        revision,
        designation,
        cycleState: cycleState as CycleState,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id, part_id, revision, designation, cycle_state, ${tracked.selectToken}
`;

class PartRevisionDao extends DaoRowMap<PartRevision, Row> {
    async create(
        db: Db,
        { partId, designation, cycleState, userId }: PartRevisionDaoInput
    ): Promise<PartRevision> {
        const row: Row = await db.one(sql`
            INSERT INTO part_revision (
                part_id, revision, designation, cycle_state, ${tracked.insertListToken}
            )
            VALUES (
                ${partId},
                COALESCE(
                    (SELECT MAX(revision) FROM part_revision WHERE part_id = ${partId}),
                    0
                ) + 1,
                ${designation},
                ${cycleState},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}

export const partRevisionDao = new PartRevisionDao({
    table: 'part_revision',
    rowToken,
    mapRow,
});
