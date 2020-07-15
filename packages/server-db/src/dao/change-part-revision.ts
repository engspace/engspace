import { sql } from 'slonik';
import { ChangePartRevision, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId, DaoBaseConfig } from './base';
import { ChangeRequestChildDaoBase } from './change-request';

const table = 'change_part_revision';

const dependencies = ['part', 'change_request'];

const schema = [
    sql`
        CREATE TABLE change_part_revision (
            id serial PRIMARY KEY,
            request_id integer NOT NULL,
            part_id integer NOT NULL,
            designation text,
            comments text,

            FOREIGN KEY(request_id) REFERENCES change_request(id),
            FOREIGN KEY(part_id) REFERENCES part(id)
        )
    `,
];

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

export class ChangePartRevisionDao extends ChangeRequestChildDaoBase<ChangePartRevision, Row> {
    constructor(config: Partial<DaoBaseConfig<ChangePartRevision, Row>> = {}) {
        super(table, {
            dependencies,
            schema,
            mapRow,
            rowToken,
            ...config,
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
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }
}
