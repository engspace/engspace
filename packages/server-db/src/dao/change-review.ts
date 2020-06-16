import { sql } from 'slonik';
import { ApprovalDecision, ChangeReview, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId, tracked, TrackedRow } from './base';
import { ChangeChildDaoBase } from './change';

interface Row extends TrackedRow {
    id: RowId;
    changeId: RowId;
    assigneeId: RowId;
    decision: string;
    comments?: string;
}

function mapRow(row: Row): ChangeReview {
    const { id, changeId, assigneeId, decision, comments } = row;
    return {
        id: toId(id),
        change: foreignKey(changeId),
        assignee: foreignKey(assigneeId),
        decision: decision as ApprovalDecision,
        comments,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`id, change_id, assignee_id, decision, comments, ${tracked.selectToken}`;

export interface ChangeReviewDaoInput {
    changeId: Id;
    assigneeId: Id;
    decision?: ApprovalDecision;
    comments?: string;
    userId: Id;
}

export interface ChangeReviewUpdateDaoInput {
    userId: Id;
    decision: ApprovalDecision;
    comments?: string;
}

export class ChangeReviewDao extends ChangeChildDaoBase<ChangeReview, Row> {
    constructor() {
        super({
            table: 'change_review',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { changeId, assigneeId, decision, comments, userId }: ChangeReviewDaoInput
    ): Promise<ChangeReview> {
        const row: Row = await db.one(sql`
            INSERT INTO change_review (
                change_id,
                assignee_id,
                decision,
                comments,
                ${tracked.insertListToken}
            )
            VALUES (
                ${changeId},
                ${assigneeId},
                ${decision ?? ApprovalDecision.Pending},
                ${nullable(comments)},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byRequestAndAssigneeId(db: Db, changeId: Id, assigneeId: Id): Promise<ChangeReview> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM change_review
            WHERE change_id = ${changeId} and assignee_id = ${assigneeId}
        `);
        return row ? mapRow(row) : null;
    }

    async update(
        db: Db,
        id: Id,
        { decision, comments, userId }: ChangeReviewUpdateDaoInput
    ): Promise<ChangeReview> {
        const row: Row = await db.one(sql`
            UPDATE change_review SET
                decision = ${decision},
                comments = ${nullable(comments)},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE
                id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
