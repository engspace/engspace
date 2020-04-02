import { ApprovalDecision, ChangeReview, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, foreignKey, nullable, RowId, toId, tracked, TrackedRow } from './base';

interface Row extends TrackedRow {
    id: RowId;
    requestId: RowId;
    assigneeId: RowId;
    decision: string;
    comments?: string;
}

function mapRow(row: Row): ChangeReview {
    const { id, requestId, assigneeId, decision, comments } = row;
    return {
        id: toId(id),
        request: foreignKey(requestId),
        assignee: foreignKey(assigneeId),
        decision: decision as ApprovalDecision,
        comments,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`id, request_id, assignee_id, decision, comments, ${tracked.selectToken}`;

export interface ChangeReviewDaoInput {
    requestId: Id;
    assigneeId: Id;
    decision?: ApprovalDecision;
    comments?: string;
    userId: Id;
}

export class ChangeReviewDao extends DaoBase<ChangeReview, Row> {
    constructor() {
        super({
            table: 'change_review',
            mapRow,
            rowToken,
        });
    }

    async create(
        db: Db,
        { requestId, assigneeId, decision, comments, userId }: ChangeReviewDaoInput
    ): Promise<ChangeReview> {
        const row: Row = await db.one(sql`
            INSERT INTO change_review (
                request_id,
                assignee_id,
                decision,
                comments,
                ${tracked.insertListToken}
            )
            VALUES (
                ${requestId},
                ${assigneeId},
                ${decision ?? ApprovalDecision.Pending},
                ${nullable(comments)},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
