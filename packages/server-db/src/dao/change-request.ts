import { ChangeRequest, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, nullable, RowId, toId, tracked, TrackedRow } from './base';

interface Row extends TrackedRow {
    id: RowId;
    description?: string;
}

function mapRow(row: Row): ChangeRequest {
    const { id, description } = row;
    return {
        id: toId(id),
        description,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`id, description, ${tracked.selectToken}`;

export interface ChangeRequestDaoInput {
    description?: string;
    userId: Id;
}

export class ChangeRequestDao extends DaoBase<ChangeRequest, Row> {
    constructor() {
        super({
            table: 'change_request',
            rowToken,
            mapRow,
        });
    }

    async create(db: Db, { description, userId }: ChangeRequestDaoInput): Promise<ChangeRequest> {
        const row: Row = await db.one(sql`
            INSERT INTO change_request (
                description,
                ${tracked.insertListToken}
            )
            VALUES (
                ${nullable(description)},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
