import { HasId, Id, PartRevision } from '@engspace/core';
import { sql } from 'slonik';
import { DaoRowMap } from './base';

interface Row extends HasId {
    id: Id;
    partId: Id;
    revision: number;
    createdBy: Id;
    createdAt: number;
}

function mapRow({ id, partId, revision, createdBy, createdAt }: Row): PartRevision {
    return {
        id,
        part: { id: partId },
        revision,
        createdBy: { id: createdBy },
        createdAt: createdAt * 1000,
    };
}
const rowToken = sql`
        id, part_id, revision, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at
    `;

class PartRevisionDao extends DaoRowMap<PartRevision, Row> {}

export const partRevisionDao = new PartRevisionDao({
    table: 'part_revision',
    rowToken,
    mapRow,
});
