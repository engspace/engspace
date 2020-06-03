import { ChangePartRevision, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, foreignKey, nullable, RowId, toId } from './base';

interface Row {
    id: RowId;
    requestId: RowId;
    partId: RowId;
    designation?: string;
    comments?: string;
}

function mapRow({ id, requestId, partId, designation, comments }: Row): ChangePartRevision {
    return {
        id: toId(id),
        request: foreignKey(requestId),
        part: foreignKey(partId),
        designation,
        comments,
    };
}

const rowToken = sql`
    id, request_id, part_id, designation, comments
`;

export interface ChangePartRevisionDaoInput {
    requestId: Id;
    partId: Id;
    designation?: string;
    comments?: string;
}

export class ChangePartRevisionDao extends DaoBase<ChangePartRevision, Row> {
    constructor() {
        super({
            table: 'change_part_revision',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { requestId, partId, designation, comments }: ChangePartRevisionDaoInput
    ): Promise<ChangePartRevision> {
        const row: Row = await db.one(sql`
            INSERT INTO change_part_revision (
                request_id,
                part_id,
                designation,
                comments
            )
            VALUES (
                ${requestId},
                ${partId},
                ${nullable(designation)},
                ${nullable(comments)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byRequestId(db: Db, requestId: Id): Promise<ChangePartRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} from change_part_revision
            WHERE request_id = ${requestId}
        `);
        return rows?.map((r) => mapRow(r));
    }
}
