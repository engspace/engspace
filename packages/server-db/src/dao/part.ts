import { sql } from 'slonik';
import { Id, Part } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, tracked, TrackedRow, DaoBaseConfig } from './base';

const table = 'part';

const dependencies = ['user', 'part_family'];

const schema = [
    sql`
        CREATE TABLE part (
            id serial PRIMARY KEY,
            family_id integer NOT NULL,
            ref text NOT NULL,
            designation text NOT NULL,

            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            updated_by integer NOT NULL,
            updated_at timestamptz NOT NULL,

            UNIQUE(ref),
            CHECK(LENGTH(ref) > 0),
            CHECK(LENGTH(designation) > 0),

            FOREIGN KEY(family_id) REFERENCES part_family(id),
            FOREIGN KEY(created_by) REFERENCES "user"(id),
            FOREIGN KEY(updated_by) REFERENCES "user"(id)
        )
    `,
];

export interface PartDaoInput {
    familyId: Id;
    ref: string;
    designation: string;
    userId: Id;
}

export interface PartUpdateDaoInput {
    designation: string;
    userId: Id;
}

interface Row extends TrackedRow {
    id: RowId;
    familyId: RowId;
    ref: string;
    designation: string;
}

function mapRow(row: Row): Part {
    const { id, familyId, ref, designation } = row;
    return {
        id: toId(id),
        family: foreignKey(familyId),
        ref,
        designation,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id, family_id, ref, designation, ${tracked.selectToken}
`;

const rowTokenAlias = sql`
    p.id AS id,
    p.family_id AS family_id,
    p.ref AS ref,
    p.designation AS designation,
    ${tracked.selectTokenAlias('p')}
`;

export class PartDao extends DaoBase<Part, Row> {
    constructor(config: Partial<DaoBaseConfig<Part, Row>> = {}) {
        super(table, {
            dependencies,
            schema,
            rowToken,
            mapRow,
            ...config,
        });
    }
    async create(db: Db, { familyId, ref, designation, userId }: PartDaoInput): Promise<Part> {
        const row: Row = await db.one(sql`
            INSERT INTO part (
                family_id,
                ref,
                designation,
                ${tracked.insertListToken}
            )
            VALUES (
                ${familyId},
                ${ref},
                ${designation},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }

    async byRef(db: Db, ref: string): Promise<Part> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${this.rowToken} FROM part
            WHERE ref = ${ref}
        `);
        return row ? this.mapRow(row) : null;
    }

    async checkRef(db: Db, ref: string): Promise<boolean> {
        const row = await db.maybeOne(sql`
            SELECT id FROM part
            WHERE ref = ${ref}
        `);
        return !!row;
    }

    async whoseRev1IsCreatedBy(db: Db, changeRequestId: Id): Promise<Part[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowTokenAlias} FROM part AS p
            LEFT OUTER JOIN part_revision AS pr ON pr.part_id = p.id
            WHERE pr.revision = 1 AND pr.change_request_id = ${changeRequestId}
        `);
        return rows.map((r) => this.mapRow(r));
    }

    async updateById(db: Db, id: Id, { designation, userId }: PartUpdateDaoInput): Promise<Part> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part SET
                designation = ${designation},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return row ? this.mapRow(row) : null;
    }
}
