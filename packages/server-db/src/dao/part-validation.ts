import { ApprovalState, Id, PartValidation, ValidationResult } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap, foreignKey, nullable, tracked, TrackedRow } from './base';

interface Row extends TrackedRow {
    id: Id;
    partRevId: Id;
    state: string;
    result?: ValidationResult;
    comments?: string;
}

function mapRow(row: Row): PartValidation {
    const { id, partRevId, state, result, comments } = row;
    return {
        id,
        partRev: foreignKey(partRevId),
        state: state as ApprovalState,
        result: nullable(result),
        comments: nullable(comments),
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

class PartValidationDao extends DaoRowMap<PartValidation, Row> {
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
}

export const partValidationDao = new PartValidationDao({
    table: 'part_validation',
    rowToken,
    mapRow,
});
