import { Specification, Id } from '@engspace/core';
import { DaoIdent } from './base';
import { sql } from 'slonik';
import { Db } from '..';

const rowToken = sql`id, name, description`;
const rowTokenAlias = sql`s.id, s.name, s.description`;

class SpecificationDao extends DaoIdent<Specification> {
    public async byPartId(db: Db, partId: Id): Promise<Specification[]> {
        const rows: Specification[] = await db.any(sql`
            SELECT ${rowTokenAlias} FROM specification AS s
            LEFT OUTER JOIN part_spec AS ps
                ON ps.spec_id = s.id
            WHERE ps.part_id = ${partId}
        `);
        if (!rows) return null;
        return rows;
    }
}

export const specificationDao = new SpecificationDao({
    table: 'specification',
    rowToken,
});
