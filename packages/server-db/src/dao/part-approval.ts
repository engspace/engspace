import { ApprovalState, Id, PartApproval } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap, foreignKey, tracked, TrackedRow, nullable } from './base';

interface Row extends TrackedRow {
    id: Id;
    validationId: Id;
    assigneeId: Id;
    state: string;
    comments?: string;
}

function mapRow(row: Row): PartApproval {
    const { id, validationId, assigneeId, state, comments } = row;
    return {
        id,
        validation: foreignKey(validationId),
        assignee: foreignKey(assigneeId),
        state: state as ApprovalState,
        comments: nullable(comments),
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id,
    validation_id,
    assignee_id,
    state,
    comments,
    ${tracked.selectToken}
`;

export interface PartApprovalDaoInput {
    validationId: Id;
    assigneeId: Id;
    state?: ApprovalState;
    comments?: string;
    userId: Id;
}

export interface PartApprovalUpdateDaoInput {
    state: ApprovalState;
    comments?: string;
    userId: Id;
}

class PartApprovalDao extends DaoRowMap<PartApproval, Row> {
    async create(
        db: Db,
        { validationId, assigneeId, state, comments, userId }: PartApprovalDaoInput
    ): Promise<PartApproval> {
        const row: Row = await db.one(sql`
            INSERT INTO part_approval (
                validation_id,
                assignee_id,
                state,
                comments,
                ${tracked.insertListToken}
            )
            VALUES (
                ${validationId},
                ${assigneeId},
                ${state ?? ApprovalState.Pending},
                ${comments ?? null},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async update(
        db: Db,
        id: Id,
        { state, comments, userId }: PartApprovalUpdateDaoInput
    ): Promise<PartApproval> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part_approval SET
                state = ${state},
                comments = ${comments ?? null},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}

export const partApprovalDao = new PartApprovalDao({
    table: 'part_approval',
    rowToken,
    mapRow,
});