import { sql } from 'slonik';
import { ApprovalDecision, Change, ChangeCycle, HasId, Id } from '@engspace/core';
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
    name: string;
    description?: string;
    cycle: string;
    state?: ApprovalDecision;
}

function mapRow(row: Row): Change {
    const { id, name, description, cycle, state } = row;
    return {
        id: toId(id),
        name,
        description,
        cycle: cycle as ChangeCycle,
        state: state as ApprovalDecision,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id,
    name,
    description,
    cycle,
    es_change_state(id, cycle) AS state,
    ${tracked.selectToken}
`;

export interface ChangeDaoInput {
    name: string;
    description?: string;
    cycle?: ChangeCycle;
    userId: Id;
}

export interface ChangeUpdateDaoInput {
    description?: string;
    userId: Id;
}

export class ChangeDao extends DaoBase<Change, Row> {
    constructor() {
        super({
            table: 'change',
            rowToken,
            mapRow,
        });
    }

    async create(db: Db, { name, description, cycle, userId }: ChangeDaoInput): Promise<Change> {
        const row: Row = await db.one(sql`
            INSERT INTO change (
                name,
                description,
                cycle,
                ${tracked.insertListToken}
            )
            VALUES (
                ${name},
                ${nullable(description)},
                ${cycle ?? ChangeCycle.Edition},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byName(db: Db, name: string): Promise<Change> {
        const row: Row = await db.maybeOne(sql`
            UPDATE ${rowToken} FROM change
            WHERE name = ${name}
        `);
        return row ? mapRow(row) : null;
    }

    async update(db: Db, id: Id, { description, userId }: ChangeUpdateDaoInput): Promise<Change> {
        const row: Row = await db.one(sql`
            UPDATE change SET
                description=${nullable(description)},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE
                id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async updateCycle(db: Db, id: Id, cycle: ChangeCycle, userId: Id): Promise<Change> {
        const row: Row = await db.one(sql`
            UPDATE change SET
                cycle=${cycle},
                ${tracked.updateAssignmentsToken(userId)}
            WHERE
                id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}

export abstract class ChangeChildDaoBase<T extends HasId, R extends HasRowId> extends DaoBase<
    T,
    R
> {
    constructor(config: DaoBaseConfig<T, R>) {
        super(config);
    }

    async byRequestId(db: Db, changeId: Id): Promise<T[]> {
        const rows: R[] = await db.any(sql`
            SELECT ${this.rowToken}
            FROM ${sql.identifier([this.table])}
            WHERE change_id = ${changeId}
        `);
        return rows?.map((r) => this.mapRow(r));
    }

    async checkRequestId(db: Db, id: Id): Promise<Id> {
        const reqId = await db.oneFirst(sql`
            SELECT change_id FROM ${sql.identifier([this.table])} WHERE id = ${id}
        `);
        return toId(reqId as number);
    }
}
