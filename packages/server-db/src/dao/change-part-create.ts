import { sql } from 'slonik';
import { ChangePartCreate, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId } from './base';
import { ChangeRequestChildDaoBase } from './change-request';

const table = 'change_part_create';

const dependencies = ['part_family', 'change_request'];

const schema = [
    sql`
        CREATE TABLE change_part_create (
            id serial PRIMARY KEY,
            request_id integer NOT NULL,
            family_id integer NOT NULL,
            version text NOT NULL,
            designation text NOT NULL,
            comments text,

            CHECK(LENGTH(version) > 0),
            CHECK(LENGTH(designation) > 0),

            FOREIGN KEY(request_id) REFERENCES change_request(id),
            FOREIGN KEY(family_id) REFERENCES part_family(id)
        )
    `,
];

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

export class ChangePartCreateDao extends ChangeRequestChildDaoBase<ChangePartCreate, Row> {
    constructor() {
        super({
            table,
            dependencies,
            schema,
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
