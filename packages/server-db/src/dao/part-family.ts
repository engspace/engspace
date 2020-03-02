import { PartFamily, PartFamilyInput, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoIdent } from './base';

const rowToken = sql`id, name, code, counter`;

class PartFamilyDao extends DaoIdent<PartFamily> {
    async create(db: Db, pf: PartFamilyInput): Promise<PartFamily> {
        return db.one(sql`
            INSERT INTO part_family(code, name)
            VALUES(${pf.code}, ${pf.name})
            RETURNING ${rowToken}
        `);
    }

    async updateById(db: Db, id: Id, partFamily: PartFamilyInput): Promise<PartFamily> {
        const { name, code } = partFamily;
        return db.maybeOne(sql`
            UPDATE part_family SET name=${name}, code=${code}
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
    }

    async bumpCounterById(db: Db, id: Id): Promise<PartFamily> {
        return db.maybeOne(sql`
            UPDATE part_family SET counter = counter+1
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
    }
}

export const partFamilyDao = new PartFamilyDao({
    table: 'part_family',
    rowToken,
});
