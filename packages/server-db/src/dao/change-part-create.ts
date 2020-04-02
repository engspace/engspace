import { ChangePartCreate, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, foreignKey, nullable, RowId, toId } from './base';

interface Row {
    id: RowId;
    requestId: RowId;
    familyId: RowId;
    version: string;
    designation?: string;
    comments?: string;
}

function mapRow({
    id,
    requestId,
    familyId,
    version,
    designation,
    comments,
}: Row): ChangePartCreate {
    return {
        id: toId(id),
        request: foreignKey(requestId),
        family: foreignKey(familyId),
        version,
        designation,
        comments,
    };
}

const rowToken = sql`
    id, request_id, family_id, version, designation, comments
`;

export interface ChangePartCreateDaoInput {
    requestId: Id;
    familyId: Id;
    version: string;
    designation: string;
    comments?: string;
}

export class ChangePartCreateDao extends DaoBase<ChangePartCreate, Row> {
    constructor() {
        super({
            table: 'change_part_create',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { requestId, familyId, version, designation, comments }: ChangePartCreateDaoInput
    ): Promise<ChangePartCreate> {
        const row: Row = await db.one(sql`
            INSERT INTO change_part_create (
                request_id,
                family_id,
                version,
                designation,
                comments
            )
            VALUES (
                ${requestId},
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
