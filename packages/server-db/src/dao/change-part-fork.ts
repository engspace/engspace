import { sql } from 'slonik';
import { ChangePartFork, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId } from './base';
import { ChangeRequestChildDaoBase } from './change-request';

interface Row {
    id: RowId;
    requestId: RowId;
    partId: RowId;
    version: string;
    designation?: string;
    comments?: string;
}

function mapRow({ id, requestId, partId, version, designation, comments }: Row): ChangePartFork {
    return {
        id: toId(id),
        request: foreignKey(requestId),
        part: foreignKey(partId),
        version,
        designation,
        comments,
    };
}

const rowToken = sql`
    id,
    request_id,
    part_id,
    version,
    designation,
    comments
`;

export interface ChangePartForkDaoInput {
    requestId: Id;
    partId: Id;
    version: string;
    designation?: string;
    comments?: string;
}

export class ChangePartForkDao extends ChangeRequestChildDaoBase<ChangePartFork, Row> {
    constructor() {
        super({
            table: 'change_part_fork',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { requestId, partId, version, designation, comments }: ChangePartForkDaoInput
    ): Promise<ChangePartFork> {
        const row: Row = await db.one(sql`
            INSERT INTO change_part_fork (
                request_id,
                part_id,
                version,
                designation,
                comments
            )
            VALUES (
                ${requestId},
                ${partId},
                ${version},
                ${nullable(designation)},
                ${nullable(comments)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
