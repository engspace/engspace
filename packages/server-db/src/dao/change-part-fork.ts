import { sql } from 'slonik';
import { ChangePartFork, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId, DaoBaseConfig } from './base';
import { ChangeRequestChildDaoBase } from './change-request';

const table = 'change_part_fork';

const dependencies = ['part', 'change_request'];

const schema = [
    sql`
        CREATE TABLE change_part_fork (
            id serial PRIMARY KEY,
            request_id integer NOT NULL,
            part_id integer NOT NULL,
            version text NOT NULL,
            designation text,
            comments text,

            CHECK(LENGTH(version) > 0),

            FOREIGN KEY(request_id) REFERENCES change_request(id),
            FOREIGN KEY(part_id) REFERENCES part(id)
        )
    `,
];

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
    constructor(config: Partial<DaoBaseConfig<ChangePartFork, Row>> = {}) {
        super({
            table,
            dependencies,
            schema,
            mapRow,
            rowToken,
            ...config,
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
