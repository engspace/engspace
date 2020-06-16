import { sql } from 'slonik';
import { ChangePartCreate, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId } from './base';
import { ChangeChildDaoBase } from './change';

interface Row {
    id: RowId;
    changeId: RowId;
    familyId: RowId;
    version: string;
    designation?: string;
    comments?: string;
}

function mapRow({ id, changeId, familyId, version, designation, comments }: Row): ChangePartCreate {
    return {
        id: toId(id),
        change: foreignKey(changeId),
        family: foreignKey(familyId),
        version,
        designation,
        comments,
    };
}

const rowToken = sql`
    id, change_id, family_id, version, designation, comments
`;

export interface ChangePartCreateDaoInput {
    changeId: Id;
    familyId: Id;
    version: string;
    designation: string;
    comments?: string;
}

export class ChangePartCreateDao extends ChangeChildDaoBase<ChangePartCreate, Row> {
    constructor() {
        super({
            table: 'change_part_create',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { changeId, familyId, version, designation, comments }: ChangePartCreateDaoInput
    ): Promise<ChangePartCreate> {
        const row: Row = await db.one(sql`
            INSERT INTO change_part_create (
                change_id,
                family_id,
                version,
                designation,
                comments
            )
            VALUES (
                ${changeId},
                ${familyId},
                ${version},
                ${designation},
                ${nullable(comments)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
