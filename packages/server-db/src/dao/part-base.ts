import { Id, PartBase } from '@engspace/core';
import { sql } from 'slonik';
import { DaoRowMap } from './impl';

interface Row {
    id: Id;
    familyId: Id;
    reference: string;
    designation: string;
}

function mapRow(row: Row): PartBase {
    return {
        id: row.id,
        family: { id: row.familyId },
        reference: row.reference,
        designation: row.designation,
    };
}

const rowToken = sql`id, reference, family_id`;

class PartBaseDao extends DaoRowMap<PartBase, Row> {}

export const partBaseDao = new PartBaseDao({
    table: 'part_base',
    rowToken,
    mapRow,
});
