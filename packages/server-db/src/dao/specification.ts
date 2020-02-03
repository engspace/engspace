import { CycleStatus, Id, Specification, SpecRevision } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

export namespace SpecificationDao {
    interface Row {
        id: Id;
        name: string;
        description: string;
    }

    function mapRow({ id, name, description }: Row): Specification {
        if (!id) return null;
        return {
            id,
            name,
            description,
        };
    }

    const rowToken = sql`
        id, name, description
    `;

    const rowTokenAlias = sql`
        s.id, s.name, s.description
    `;

    export async function byId(db: Db, id: Id): Promise<Specification | null> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM specification
            WHERE id = ${id}
        `);
        return mapRow(row);
    }

    export async function byPartId(db, partId: Id): Promise<Specification[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowTokenAlias} FROM specification AS s
            LEFT OUTER JOIN part_spec AS ps
                ON ps.spec_id = s.id
            WHERE ps.part_id = ${partId}
        `);
        if (!rows) return null;
        return rows.map(r => mapRow(r));
    }
}

export namespace SpecRevisionDao {
    interface Row {
        id: Id;
        specId: Id;
        revision: number;
        humanRev: string;
        filename: string;
        filesize: number;
        createdBy: Id;
        createdAt: number;
        changeDescription: string;
        uploaded: number;
        sha1: string;
        status: number;
    }

    function mapRow({
        id,
        specId,
        revision,
        humanRev,
        filename,
        filesize,
        createdBy,
        createdAt,
        changeDescription,
        uploaded,
        sha1,
        status,
    }: Row): SpecRevision {
        if (!id) return null;
        return {
            id,
            spec: { id: specId },
            revision,
            humanRev,
            filename,
            filesize,
            createdBy: { id: createdBy },
            createdAt: createdAt * 1000,
            changeDescription,
            uploaded,
            sha1,
            status: status as CycleStatus,
        };
    }

    const rowToken = sql`
        id, spec_id, revision, human_rev, filename, filesize, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at, change_description,
        uploaded, ENCODE(sha1, 'hex') AS sha1, status
    `;

    const rowTokenAlias = sql`
        sr.id, sr.spec_id, sr.revision, sr.human_rev, sr.filename, sr.filesize, sr.created_by,
        EXTRACT(EPOCH FROM sr.created_at) AS created_at, sr.change_description,
        sr.uploaded, ENCODE(sr.sha1, 'hex') AS sha1, sr.status
    `;

    export async function byId(db: Db, id: Id): Promise<SpecRevision | null> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM spec_revision
            WHERE id = ${id}
        `);
        return mapRow(row);
    }

    export async function byPartRevId(db, partRevId: Id): Promise<SpecRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowTokenAlias} FROM spec_revision AS sr
            LEFT OUTER JOIN part_rev_spec AS prs
                ON prs.spec_rev_id = sr.id
            WHERE prs.part_rev_id = ${partRevId}
        `);
        if (!rows) return null;
        return rows.map(r => mapRow(r));
    }
}
