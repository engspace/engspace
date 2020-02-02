import { Id, Part, PartBase, PartFamily, PartRevision } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

export namespace PartFamilyDao {
    const rowToken = sql`id, name, code, counter`;

    export async function byId(db: Db, id: Id): Promise<PartFamily> {
        return db.maybeOne(sql`
            SELECT ${rowToken} FROM part_family
            WHERE id = ${id}
        `);
    }
}

export namespace PartBaseDao {
    interface Row {
        id: Id;
        familyId: Id;
        reference: string;
        designation: string;
    }

    function mapRow(row: Row): PartBase {
        return {
            id: row.id,
            family: { id: row.familyId },
            reference: row.reference,
            designation: row.designation,
        };
    }

    const rowToken = sql`id, reference, family_id`;

    export async function byId(db: Db, id: Id): Promise<PartBase> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM part_base
            WHERE id = ${id}
        `);
        return mapRow(row);
    }
}

export namespace PartDao {
    interface Row {
        id: Id;
        baseId: Id;
        reference: string;
        designation: string;
        createdBy: Id;
        createdAt: number;
    }

    function mapRow(row: Row): Part {
        return {
            id: row.id,
            base: { id: row.baseId },
            reference: row.reference,
            designation: row.designation,
            createdBy: { id: row.createdBy },
            createdAt: row.createdAt * 1000,
        };
    }
    const rowToken = sql`id, base_id, reference, designation, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at
    `;

    export async function byId(db: Db, id: Id): Promise<Part> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM part
            WHERE id = ${id}
        `);
        return mapRow(row);
    }
}

export namespace PartRevisionDao {
    interface Row {
        id: Id;
        partId: Id;
        revision: number;
        createdBy: Id;
        createdAt: number;
    }

    function mapRow(row: Row): PartRevision {
        return {
            id: row.id,
            part: { id: row.partId },
            revision: row.revision,
            createdBy: { id: row.createdBy },
            createdAt: row.createdAt * 1000,
        };
    }
    const rowToken = sql`
        id, part_id, revision, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at
    `;

    export async function byId(db: Db, id: Id): Promise<PartRevision> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM part_revision
            WHERE id = ${id}
        `);
        return mapRow(row);
    }
}
