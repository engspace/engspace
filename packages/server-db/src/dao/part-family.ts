import { PartFamily, PartFamilyInput } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoIdent } from './base';

const rowToken = sql`id, name, code, counter`;

class PartFamilyDao extends DaoIdent<PartFamily> {
    async create(db: Db, pf: PartFamilyInput): Promise<PartFamily> {
        const row: PartFamily = await db.one(sql`
            INSERT INTO part_family(code, name, counter)
            VALUES(${pf.code}, ${pf.name}, 1)
            RETURNING ${rowToken}
        `);
        return row;
    }
}

export const partFamilyDao = new PartFamilyDao({
    table: 'part_family',
    rowToken,
});
