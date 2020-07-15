import { sql } from 'slonik';
import { ApprovalDecision, ChangeReview, Id } from '@engspace/core';
import { Db } from '..';
import { foreignKey, nullable, RowId, toId, tracked, TrackedRow, DaoBaseConfig } from './base';
import { ChangeRequestChildDaoBase } from './change-request';

const table = 'change_review';

const dependencies = ['user', 'change_request'];

const schema = [
    sql`
        CREATE TABLE change_review (
            id serial PRIMARY KEY,
            request_id integer NOT NULL,
            assignee_id integer NOT NULL,
            decision approval_decision_enum NOT NULL,
            comments text,

            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            updated_by integer NOT NULL,
            updated_at timestamptz NOT NULL,

            FOREIGN KEY(request_id) REFERENCES change_request(id),
            FOREIGN KEY(assignee_id) REFERENCES "user"(id)
        )
    `,
];

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

export interface ChangeReviewUpdateDaoInput {
    userId: Id;
    decision: ApprovalDecision;
    comments?: string;
}

export class ChangeReviewDao extends ChangeRequestChildDaoBase<ChangeReview, Row> {
    constructor(config: Partial<DaoBaseConfig<ChangeReview, Row>> = {}) {
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

    async byRequestAndAssigneeId(db: Db, requestId: Id, assigneeId: Id): Promise<ChangeReview> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM change_review
            WHERE request_id = ${requestId} and assignee_id = ${assigneeId}
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
