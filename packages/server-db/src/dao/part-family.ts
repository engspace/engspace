import { sql } from 'slonik';
import { Id, PartFamily, PartFamilyInput } from '@engspace/core';
import { Db } from '..';
import { DaoBase, RowId, toId, DaoBaseConfig } from './base';

const table = 'part_family';

const dependencies = [];

const schema = [
    sql`
        CREATE TABLE part_family (
            id serial PRIMARY KEY,
            name text NOT NULL,
            code text NOT NULL,
            counter integer NOT NULL DEFAULT 0
        )
    `,
];

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
    constructor(config: Partial<DaoBaseConfig<PartFamily, Row>> = {}) {
        super({
            table,
            dependencies,
            schema,
            rowToken,
            mapRow,
            ...config,
        });
    }
    async create(db: Db, pf: PartFamilyInput): Promise<PartFamily> {
        const row: Row = await db.one(sql`
            INSERT INTO part_family(code, name)
            VALUES(${pf.code}, ${pf.name})
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }

    async updateById(db: Db, id: Id, partFamily: PartFamilyInput): Promise<PartFamily> {
        const { name, code } = partFamily;
        const row: Row = await db.maybeOne(sql`
            UPDATE part_family SET name=${name}, code=${code}
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }

    async bumpCounterById(db: Db, id: Id): Promise<PartFamily> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part_family SET counter = counter+1
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }
}
