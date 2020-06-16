import { sql } from 'slonik';
import { Id, Part } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, tracked, TrackedRow } from './base';

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
    constructor() {
        super({
            rowToken,
            mapRow,
            table: 'part',
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
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byRef(db: Db, ref: string): Promise<Part> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM part
            WHERE ref = ${ref}
        `);
        return row ? mapRow(row) : null;
    }

    async checkRef(db: Db, ref: string): Promise<boolean> {
        const row = await db.maybeOne(sql`
            SELECT id FROM part
            WHERE ref = ${ref}
        `);
        return !!row;
    }

    async whoseRev1IsCreatedBy(db: Db, changeId: Id): Promise<Part[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowTokenAlias} FROM part AS p
            LEFT OUTER JOIN part_revision AS pr ON pr.part_id = p.id
            WHERE pr.revision = 1 AND pr.change_id = ${changeId}
        `);
        return rows.map((r) => mapRow(r));
    }

    async updateById(db: Db, id: Id, { designation, userId }: PartUpdateDaoInput): Promise<Part> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part SET
                designation = ${designation},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        return row ? mapRow(row) : null;
    }
}
