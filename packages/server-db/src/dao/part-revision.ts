import { CycleState, Id, PartRevision } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, toRowId, tracked, TrackedRow } from './base';

export interface PartRevisionDaoInput {
    partId: Id;
    designation: string;
    cycleState: CycleState;
    userId: Id;
}

interface Row extends TrackedRow {
    id: RowId;
    partId: RowId;
    revision: number;
    designation: string;
    cycleState: string;
}

function mapRow(row: Row): PartRevision {
    const { id, partId, revision, designation, cycleState } = row;
    return {
        id: toId(id),
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

export class PartRevisionDao extends DaoBase<PartRevision, Row> {
    constructor() {
        super({
            rowToken,
            mapRow,
            table: 'part_revision',
        });
    }
    async create(
        db: Db,
        { partId, designation, cycleState, userId }: PartRevisionDaoInput
    ): Promise<PartRevision> {
        const row: Row = await db.one(sql`
            INSERT INTO part_revision (
                part_id, revision, designation, cycle_state, ${tracked.insertListToken}
            )
            VALUES (
                ${toRowId(partId)},
                COALESCE(
                    (SELECT MAX(revision) FROM part_revision WHERE part_id = ${toRowId(partId)}),
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

    async byPartId(db: Db, partId: Id): Promise<PartRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} FROM part_revision
            WHERE part_id = ${toRowId(partId)}
        `);
        return rows.map(row => mapRow(row));
    }

    async lastByPartId(db: Db, partId: Id): Promise<PartRevision> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM part_revision
            WHERE
                part_id = ${toRowId(partId)} AND
                revision = (
                    SELECT MAX(revision) FROM part_revision WHERE part_id = ${toRowId(partId)}
                )
        `);
        if (!row) return null;
        return mapRow(row);
    }

    async updateCycleState(db: Db, id: Id, cycleState: CycleState): Promise<PartRevision> {
        const row: Row = await db.one(sql`
            UPDATE part_revision SET
                cycle_state = ${cycleState}
            WHERE id = ${toRowId(id)}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
