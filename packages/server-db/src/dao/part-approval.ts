import { sql } from 'slonik';
import { ApprovalDecision, Id, PartApproval } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, tracked, TrackedRow, DaoBaseConfig } from './base';

const table = 'part_approval';

const dependencies = ['user', 'part_validation'];

const schema = [
    sql`
        CREATE TABLE part_approval (
            id serial PRIMARY KEY,
            validation_id integer NOT NULL,
            assignee_id integer NOT NULL,
            decision approval_decision_enum NOT NULL,
            comments text,

            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            updated_by integer NOT NULL,
            updated_at timestamptz NOT NULL,

            FOREIGN KEY(validation_id) REFERENCES part_validation(id),
            FOREIGN KEY(assignee_id) REFERENCES "user"(id),
            FOREIGN KEY(created_by) REFERENCES "user"(id),
            FOREIGN KEY(updated_by) REFERENCES "user"(id)
        )
    `,
];

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
    constructor(config: Partial<DaoBaseConfig<PartApproval, Row>> = {}) {
        super({
            table,
            dependencies,
            schema,
            rowToken,
            mapRow,
            ...config,
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
