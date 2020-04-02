import { PartFamily, PartFamilyInput, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, RowId, toId, toRowId } from './base';

interface Row {
    id: RowId;
    name: string;
    code: string;
    counter: number;
}

const rowToken = sql`id, name, code, counter`;

function mapRow({ id, name, code, counter }: Row): PartFamily {
    return {
        id: toId(id),
        name,
        code,
        counter,
    };
}

export class PartFamilyDao extends DaoBase<PartFamily, Row> {
    constructor() {
        super({
            rowToken,
            table: 'part_family',
            mapRow,
        });
    }
    async create(db: Db, pf: PartFamilyInput): Promise<PartFamily> {
        const row: Row = await db.one(sql`
            INSERT INTO part_family(code, name)
            VALUES(${pf.code}, ${pf.name})
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async updateById(db: Db, id: Id, partFamily: PartFamilyInput): Promise<PartFamily> {
        const { name, code } = partFamily;
        const row: Row = await db.maybeOne(sql`
            UPDATE part_family SET name=${name}, code=${code}
            WHERE id = ${toRowId(id)}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async bumpCounterById(db: Db, id: Id): Promise<PartFamily> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part_family SET counter = counter+1
            WHERE id = ${toRowId(id)}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
