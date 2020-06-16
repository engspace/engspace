import { sql } from 'slonik';
import { ChangePartFork, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId } from './base';
import { ChangeChildDaoBase } from './change';

interface Row {
    id: RowId;
    changeId: RowId;
    partId: RowId;
    version: string;
    designation?: string;
    comments?: string;
}

function mapRow({ id, changeId, partId, version, designation, comments }: Row): ChangePartFork {
    return {
        id: toId(id),
        change: foreignKey(changeId),
        part: foreignKey(partId),
        version,
        designation,
        comments,
    };
}

const rowToken = sql`
    id,
    change_id,
    part_id,
    version,
    designation,
    comments
`;

export interface ChangePartForkDaoInput {
    changeId: Id;
    partId: Id;
    version: string;
    designation?: string;
    comments?: string;
}

export class ChangePartForkDao extends ChangeChildDaoBase<ChangePartFork, Row> {
    constructor() {
        super({
            table: 'change_part_fork',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { changeId, partId, version, designation, comments }: ChangePartForkDaoInput
    ): Promise<ChangePartFork> {
        const row: Row = await db.one(sql`
            INSERT INTO change_part_fork (
                change_id,
                part_id,
                version,
                designation,
                comments
            )
            VALUES (
                ${changeId},
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
