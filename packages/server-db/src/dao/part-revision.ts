import { HasId, Id, PartRevision } from '@engspace/core';
import { TrackedRow, foreignKey, tracked, DaoRowMap } from './base';
import { sql } from 'slonik';
import { Db } from '..';

export interface PartRevisionDaoInput {
    partId: Id;
    designation: string;
    userId: Id;
}

interface Row extends HasId, TrackedRow {
    partId: Id;
    revision: number;
    designation: string;
}

function mapRow(row: Row): PartRevision {
    const { id, partId, revision, designation } = row;
    return {
        id,
        part: foreignKey(partId),
        revision,
        designation,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id, part_id, revision, designation, ${tracked.selectToken}
`;

class PartRevisionDao extends DaoRowMap<PartRevision, Row> {
    async create(
        db: Db,
        { partId, designation, userId }: PartRevisionDaoInput
    ): Promise<PartRevision> {
        const row: Row = await db.one(sql`
            INSERT INTO part_revision (
                part_id, revision, designation, ${tracked.insertListToken}
            )
            VALUES (
                ${partId},
                COALESCE(
                    (SELECT MAX(revision) FROM part_revision WHERE part_id = ${partId}),
                    0
                ) + 1,
                ${designation},
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
