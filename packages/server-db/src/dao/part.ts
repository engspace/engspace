import { Id, Part } from '@engspace/core';
import { sql } from 'slonik';
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
