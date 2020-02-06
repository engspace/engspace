import { PartFamily } from '@engspace/core';
import { sql } from 'slonik';
import { DaoIdent } from './impl';

const rowToken = sql`id, name, code, counter`;

class PartFamilyDao extends DaoIdent<PartFamily> {}

export const partFamilyDao = new PartFamilyDao({
    table: 'part_family',
    rowToken,
});
