import { sql } from 'slonik';
import { ApprovalDecision, ChangeRequest, ChangeRequestCycle, HasId, Id } from '@engspace/core';
import { Db } from '..';
import {
    DaoBase,
    DaoBaseConfig,
    HasRowId,
    nullable,
    RowId,
    toId,
    tracked,
    TrackedRow,
} from './base';

interface Row extends TrackedRow {
    id: RowId;
    description?: string;
    cycle: string;
    state?: ApprovalDecision;
}

function mapRow(row: Row): ChangeRequest {
    const { id, description, cycle, state } = row;
    return {
        id: toId(id),
        description,
        cycle: cycle as ChangeRequestCycle,
        state: state as ApprovalDecision,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id,
    description,
    cycle,
    es_change_request_state(id, cycle) AS state,
    ${tracked.selectToken}
`;

export interface ChangeRequestDaoInput {
    description?: string;
    cycle?: ChangeRequestCycle;
    userId: Id;
}

export interface ChangeRequestUpdateDaoInput {
    description?: string;
    userId: Id;
}

export class ChangeRequestDao extends DaoBase<ChangeRequest, Row> {
    constructor() {
        super({
            table: 'change_request',
            rowToken,
            mapRow,
        });
    }

    async create(
        db: Db,
        { description, cycle, userId }: ChangeRequestDaoInput
    ): Promise<ChangeRequest> {
        const row: Row = await db.one(sql`
            INSERT INTO change_request (
                description,
                cycle,
                ${tracked.insertListToken}
            )
            VALUES (
                ${nullable(description)},
                ${cycle ?? ChangeRequestCycle.Edition},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async update(
        db: Db,
        id: Id,
        { description, userId }: ChangeRequestUpdateDaoInput
    ): Promise<ChangeRequest> {
        const row: Row = await db.one(sql`
            UPDATE change_request SET
                description=${nullable(description)},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE
                id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}

export abstract class ChangeRequestChildDaoBase<
    T extends HasId,
    R extends HasRowId
> extends DaoBase<T, R> {
    constructor(config: DaoBaseConfig<T, R>) {
        super(config);
    }

    async byRequestId(db: Db, requestId: Id): Promise<T[]> {
        const rows: R[] = await db.any(sql`
            SELECT ${this.rowToken}
            FROM ${sql.identifier([this.table])}
            WHERE request_id = ${requestId}
        `);
        return rows?.map((r) => this.mapRow(r));
    }

    async checkRequestId(db: Db, id: Id): Promise<Id> {
        const reqId = await db.oneFirst(sql`
            SELECT request_id FROM ${sql.identifier([this.table])} WHERE id = ${id}
        `);
        return toId(reqId as number);
    }
}
