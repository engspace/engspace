import { sql } from 'slonik';
import { Id, PartCycle, PartRevision } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, tracked, TrackedRow } from './base';

const table = 'part_revision';

const dependencies = ['user', 'change_request', 'part'];

const schema = [
    sql`
        CREATE TABLE part_revision (
            id serial PRIMARY KEY,
            part_id integer NOT NULL,

            revision integer NOT NULL,
            designation text NOT NULL,

            change_request_id integer NOT NULL,

            cycle text NOT NULL,

            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            updated_by integer NOT NULL,
            updated_at timestamptz NOT NULL,

            CHECK(revision > 0),
            CHECK(LENGTH(designation) > 0),

            FOREIGN KEY(part_id) REFERENCES part(id),
            FOREIGN KEY(change_request_id) REFERENCES change_request(id),
            FOREIGN KEY(cycle) REFERENCES part_cycle_enum(id),
            FOREIGN KEY(created_by) REFERENCES "user"(id),
            FOREIGN KEY(updated_by) REFERENCES "user"(id)
        )
    `,
];

export interface PartRevisionDaoInput {
    partId: Id;
    designation: string;
    changeRequestId: Id;
    cycle: PartCycle;
    userId: Id;
}

interface Row extends TrackedRow {
    id: RowId;
    partId: RowId;
    changeRequestId: RowId;
    revision: number;
    designation: string;
    cycle: string;
}

function mapRow(row: Row): PartRevision {
    const { id, partId, changeRequestId, revision, designation, cycle } = row;
    return {
        id: toId(id),
        part: foreignKey(partId),
        changeRequest: foreignKey(changeRequestId),
        revision,
        designation,
        cycle: cycle as PartCycle,
        ...tracked.mapRow(row),
    };
}

const rowToken = sql`
    id, part_id, revision, designation, change_request_id, cycle, ${tracked.selectToken}
`;

export class PartRevisionDao extends DaoBase<PartRevision, Row> {
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
        { partId, designation, cycle, changeRequestId, userId }: PartRevisionDaoInput
    ): Promise<PartRevision> {
        const row: Row = await db.one(sql`
            INSERT INTO part_revision (
                part_id, revision, designation, change_request_id, cycle, ${tracked.insertListToken}
            )
            VALUES (
                ${partId},
                COALESCE(
                    (SELECT MAX(revision) FROM part_revision WHERE part_id = ${partId}),
                    0
                ) + 1,
                ${designation},
                ${changeRequestId},
                ${cycle},
                ${tracked.insertValToken(userId)}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async byPartId(db: Db, partId: Id): Promise<PartRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} FROM part_revision
            WHERE part_id = ${partId}
        `);
        return rows.map((row) => mapRow(row));
    }

    async aboveRev1ByChangeRequestId(db: Db, changeRequestId: Id): Promise<PartRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} FROM part_revision
            WHERE change_request_id = ${changeRequestId} AND revision > 1
        `);
        return rows.map((row) => mapRow(row));
    }

    async lastByPartId(db: Db, partId: Id): Promise<PartRevision> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM part_revision
            WHERE
                part_id = ${partId} AND
                revision = (
                    SELECT MAX(revision) FROM part_revision WHERE part_id = ${partId}
                )
        `);
        if (!row) return null;
        return mapRow(row);
    }

    async updateCycleState(db: Db, id: Id, cycle: PartCycle): Promise<PartRevision> {
        const row: Row = await db.one(sql`
            UPDATE part_revision SET
                cycle = ${cycle}
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
