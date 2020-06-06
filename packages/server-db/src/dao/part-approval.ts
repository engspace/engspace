import { sql } from 'slonik';
import { ApprovalDecision, Id, PartApproval } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, tracked, TrackedRow } from './base';

interface Row extends TrackedRow {
    id: RowId;
    validationId: RowId;
    assigneeId: RowId;
    decision: string;
    comments?: string;
}

function mapRow(row: Row): PartApproval {
    const { id, validationId, assigneeId, decision, comments } = row;
    return {
        id: toId(id),
        validation: foreignKey(validationId),
        assignee: foreignKey(assigneeId),
        decision: decision as ApprovalDecision,
        comments,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id,
    validation_id,
    assignee_id,
    decision,
    comments,
    ${tracked.selectToken}
`;

export interface PartApprovalDaoInput {
    validationId: Id;
    assigneeId: Id;
    decision?: ApprovalDecision;
    comments?: string;
    userId: Id;
}

export interface PartApprovalUpdateDaoInput {
    decision: ApprovalDecision;
    comments?: string;
    userId: Id;
}

export class PartApprovalDao extends DaoBase<PartApproval, Row> {
    constructor() {
        super({
            rowToken,
            mapRow,
            table: 'part_approval',
        });
    }
    async create(
        db: Db,
        { validationId, assigneeId, decision, comments, userId }: PartApprovalDaoInput
    ): Promise<PartApproval> {
        const row: Row = await db.one(sql`
            INSERT INTO part_approval (
                validation_id,
                assignee_id,
                decision,
                comments,
                ${tracked.insertListToken}
            )
            VALUES (
                ${validationId},
                ${assigneeId},
                ${decision ?? ApprovalDecision.Pending},
                ${comments ?? null},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byValidationId(db: Db, validationId: Id): Promise<PartApproval[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} FROM part_approval
            WHERE validation_id = ${validationId}
        `);
        return rows.map((r) => mapRow(r));
    }

    async update(
        db: Db,
        id: Id,
        { decision, comments, userId }: PartApprovalUpdateDaoInput
    ): Promise<PartApproval> {
        const row: Row = await db.maybeOne(sql`
            UPDATE part_approval SET
                decision = ${decision},
                comments = ${comments ?? null},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
