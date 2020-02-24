import { HasId, Id, Part } from '@engspace/core';
import { sql } from 'slonik';
import { DaoRowMap } from './base';

interface Row extends HasId {
    id: Id;
    baseId: Id;
    reference: string;
    designation: string;
    createdBy: Id;
    createdAt: number;
    status: number;
}

function mapRow({ id, baseId, reference, designation, createdBy, createdAt, status }: Row): Part {
    return {
        id,
        base: { id: baseId },
        reference,
        designation,
        createdBy: { id: createdBy },
        createdAt: createdAt * 1000,
        status,
    };
}
const rowToken = sql`id, base_id, reference, designation, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at, status
    `;

class PartDao extends DaoRowMap<Part, Row> {}

export const partDao = new PartDao({
    table: 'part',
    rowToken,
    mapRow,
});
