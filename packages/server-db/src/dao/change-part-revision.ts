import { sql } from 'slonik';
import { ChangePartRevision, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId } from './base';
import { ChangeChildDaoBase } from './change';

interface Row {
    id: RowId;
    changeId: RowId;
    partId: RowId;
    designation?: string;
    comments?: string;
}

function mapRow({ id, changeId, partId, designation, comments }: Row): ChangePartRevision {
    return {
        id: toId(id),
        change: foreignKey(changeId),
        part: foreignKey(partId),
        designation,
        comments,
    };
}

const rowToken = sql`
    id, change_id, part_id, designation, comments
`;

export interface ChangePartRevisionDaoInput {
    changeId: Id;
    partId: Id;
    designation?: string;
    comments?: string;
}

export class ChangePartRevisionDao extends ChangeChildDaoBase<ChangePartRevision, Row> {
    constructor() {
        super({
            table: 'change_part_revision',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { changeId, partId, designation, comments }: ChangePartRevisionDaoInput
    ): Promise<ChangePartRevision> {
        const row: Row = await db.one(sql`
            INSERT INTO change_part_revision (
                change_id,
                part_id,
                designation,
                comments
            )
            VALUES (
                ${changeId},
                ${partId},
                ${nullable(designation)},
                ${nullable(comments)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
