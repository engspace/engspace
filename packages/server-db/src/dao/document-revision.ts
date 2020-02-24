import { DocumentRevision, DocumentRevisionInput, HasId, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap } from './base';

interface Row extends HasId {
    id: Id;
    documentId: Id;
    revision: number;
    filename: string;
    filesize: number;
    createdBy: Id;
    createdAt: number;
    changeDescription: string;
    uploaded: number;
    sha1: string;
}

function mapRow({
    id,
    documentId,
    revision,
    filename,
    filesize,
    createdBy,
    createdAt,
    changeDescription,
    uploaded,
    sha1,
}: Row): DocumentRevision {
    if (!id) return null;
    return {
        id,
        document: { id: documentId },
        revision,
        filename,
        filesize,
        createdBy: { id: createdBy },
        createdAt: createdAt * 1000,
        changeDescription,
        uploaded,
        sha1: sha1 ? sha1 : null,
    };
}

const rowToken = sql`
        id, document_id, revision, filename, filesize, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at, change_description, uploaded,
        ENCODE(sha1, 'hex') as sha1
    `;

class DocumentRevisionDao extends DaoRowMap<DocumentRevision, Row> {
    public async create(
        db: Db,
        documentRev: DocumentRevisionInput,
        userId: Id
    ): Promise<DocumentRevision> {
        const { documentId, filename, filesize, changeDescription } = documentRev;
        const row: Row = await db.one(sql`
            INSERT INTO document_revision (
                document_id, revision, filename, filesize, created_by, created_at, change_description
            ) VALUES (
                ${documentId},
                COALESCE(
                    (SELECT MAX(revision) FROM document_revision WHERE document_id = ${documentId}),
                    0
                ) + 1,
                ${filename},
                ${filesize},
                (SELECT checkout FROM document WHERE id = ${documentId} AND checkout = ${userId}),
                NOW(),
                ${changeDescription}
            )
            RETURNING ${rowToken}
        `);
        // TODO: mv to controller
        if (!documentRev.retainCheckout) {
            await db.query(sql`
                UPDATE document SET checkout = NULL
                WHERE id = ${documentId}
            `);
        }
        return mapRow(row);
    }

    async byId(db: Db, id: Id): Promise<DocumentRevision | null> {
        const row: Row = await db.one(sql`
            SELECT ${rowToken} FROM document_revision
            WHERE id = ${id}
        `);
        if (!row) return null;
        return mapRow(row);
    }

    async byDocumentId(db: Db, documentId: Id): Promise<DocumentRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} FROM document_revision
            WHERE document_id = ${documentId}
            ORDER BY revision
        `);
        return rows.map(r => mapRow(r));
    }

    async lastByDocumentId(db: Db, documentId: Id): Promise<DocumentRevision | null> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM document_revision
            WHERE
                document_id = ${documentId} AND
                revision = (
                    SELECT MAX(revision) FROM document_revision WHERE document_id = ${documentId}
                )
        `);
        if (!row) return null;
        return mapRow(row);
    }

    async byDocumentIdAndRev(db: Db, documentId: Id, revision: number): Promise<DocumentRevision> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM document_revision
            WHERE document_id = ${documentId} AND revision = ${revision}
        `);
        if (!row) return null;
        return mapRow(row);
    }

    async updateAddProgress(db: Db, revisionId: Id, addUploaded: number): Promise<number> {
        const uploaded = await db.oneFirst(sql`
            UPDATE document_revision SET uploaded = uploaded + ${addUploaded}
            WHERE id = ${revisionId}
            RETURNING uploaded
        `);
        return uploaded as number;
    }

    async updateSha1(db: Db, revisionId: Id, sha1: string): Promise<DocumentRevision> {
        const row: Row = await db.maybeOne(sql`
            UPDATE document_revision SET uploaded = filesize, sha1=DECODE(${sha1}, 'hex')
            WHERE id = ${revisionId}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}

export const documentRevisionDao = new DocumentRevisionDao({
    table: 'document_revision',
    rowToken,
    mapRow,
});
