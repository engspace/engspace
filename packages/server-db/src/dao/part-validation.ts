import { ApprovalDecision, Id, PartValidation, ValidationResult } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, tracked, TrackedRow } from './base';

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
    constructor() {
        super({
            rowToken,
            mapRow,
            table: 'part_validation',
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
            RETURNING ${rowToken}
        `);
        return mapRow(row);
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
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
