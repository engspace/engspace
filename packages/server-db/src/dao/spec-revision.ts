import { CycleStatus, Id, SpecRevision } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap } from './impl';

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

class SpecRevisionDao extends DaoRowMap<SpecRevision, Row> {
    async byPartRevId(db: Db, partRevId: Id): Promise<SpecRevision[]> {
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

export const specRevisionDao = new SpecRevisionDao({
    table: 'spec_revision',
    rowToken,
    mapRow,
});
