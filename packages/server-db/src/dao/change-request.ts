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

const table = 'change_request';

const dependencies = ['user'];

const schema = [
    sql`
        CREATE TABLE change_request (
            id serial PRIMARY KEY,
            name text NOT NULL,
            description text,
            cycle text NOT NULL,

            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            updated_by integer NOT NULL,
            updated_at timestamptz NOT NULL,

            UNIQUE(name),
            CHECK(LENGTH(name) > 0),

            FOREIGN KEY(cycle) REFERENCES change_request_cycle_enum(id),
            FOREIGN KEY(created_by) REFERENCES "user"(id),
            FOREIGN KEY(updated_by) REFERENCES "user"(id)
        )
    `,
];

interface Row extends TrackedRow {
    id: RowId;
    name: string;
    description?: string;
    cycle: string;
    state?: ApprovalDecision;
}

function mapRow(row: Row): ChangeRequest {
    const { id, name, description, cycle, state } = row;
    return {
        id: toId(id),
        name,
        description,
        cycle: cycle as ChangeRequestCycle,
        state: state as ApprovalDecision,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id,
    name,
    description,
    cycle,
    es_change_request_state(id, cycle) AS state,
    ${tracked.selectToken}
`;

export interface ChangeRequestDaoInput {
    name: string;
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
            table,
            dependencies,
            schema,
            rowToken,
            mapRow,
        });
    }

    async create(
        db: Db,
        { name, description, cycle, userId }: ChangeRequestDaoInput
    ): Promise<ChangeRequest> {
        const row: Row = await db.one(sql`
            INSERT INTO change_request (
                name,
                description,
                cycle,
                ${tracked.insertListToken}
            )
            VALUES (
                ${name},
                ${nullable(description)},
                ${cycle ?? ChangeRequestCycle.Edition},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byName(db: Db, name: string): Promise<ChangeRequest> {
        const row: Row = await db.maybeOne(sql`
            UPDATE ${rowToken} FROM change_request
            WHERE name = ${name}
        `);
        return row ? mapRow(row) : null;
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

    async updateCycle(
        db: Db,
        id: Id,
        cycle: ChangeRequestCycle,
        userId: Id
    ): Promise<ChangeRequest> {
        const row: Row = await db.one(sql`
            UPDATE change_request SET
                cycle=${cycle},
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
