import { sql } from 'slonik';
import { ApprovalDecision, Id, PartValidation, ValidationResult } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, tracked, TrackedRow, DaoBaseConfig } from './base';

const table = 'part_validation';

const dependencies = ['user', 'part_revision'];

const schema = [
    sql`
        CREATE TABLE part_validation (
            id serial PRIMARY KEY,
            part_rev_id integer NOT NULL,
            result text,
            comments text,

            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            updated_by integer NOT NULL,
            updated_at timestamptz NOT NULL,

            FOREIGN KEY(part_rev_id) REFERENCES part_revision(id),
            FOREIGN KEY(result) REFERENCES validation_result_enum(id),
            FOREIGN KEY(created_by) REFERENCES "user"(id),
            FOREIGN KEY(updated_by) REFERENCES "user"(id)
        )
    `,
];

interface Row extends TrackedRow {
    id: RowId;
    partRevId: RowId;
    state: string;
    result?: ValidationResult;
    comments?: string;
}

function mapRow(row: Row): PartValidation {
    const { id, partRevId, state, result, comments } = row;
    return {
        id: toId(id),
        partRev: foreignKey(partRevId),
        state: state as ApprovalDecision,
        result,
        comments,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id,
    part_rev_id,
    es_validation_state(id) AS state,
    result,
    comments,
    ${tracked.selectToken}
`;

export interface PartValidationDaoInput {
    partRevId: Id;
    userId: Id;
}

export interface PartValidationUpdateDaoInput {
    result: ValidationResult;
    comments?: string;
    userId: Id;
}

export class PartValidationDao extends DaoBase<PartValidation, Row> {
    constructor(config: Partial<DaoBaseConfig<PartValidation, Row>> = {}) {
        super(table, {
            dependencies,
            schema,
            rowToken,
            mapRow,
            ...config,
        });
    }
    async create(db: Db, { partRevId, userId }: PartValidationDaoInput): Promise<PartValidation> {
        const row: Row = await db.one(sql`
            INSERT INTO part_validation (
                part_rev_id,
                ${tracked.insertListToken}
            )
            VALUES (
                ${partRevId},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }
    async update(
        db: Db,
        id: Id,
        { result, comments, userId }: PartValidationUpdateDaoInput
    ): Promise<PartValidation> {
        const row: Row = await db.one(sql`
            UPDATE part_validation SET
                result = ${result},
                comments = ${comments ?? null},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE id = ${id}
            RETURNING ${this.rowToken}
        `);
        return this.mapRow(row);
    }
}
