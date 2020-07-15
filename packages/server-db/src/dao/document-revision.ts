import { sql } from 'slonik';
import { DocumentRevision, DocumentRevisionInput, Id } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, timestamp, toId, DaoBaseConfig } from './base';

const table = 'document_revision';

const dependencies = ['user', 'document'];

const schema = [
    sql`
        CREATE TABLE document_revision (
            id serial PRIMARY KEY,
            document_id integer NOT NULL,
            revision integer NOT NULL,
            filename text NOT NULL,
            filesize integer NOT NULL,
            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            change_description text,

            uploaded integer NOT NULL DEFAULT 0,
            sha1 bytea, -- initially null, set after check on both client and server

            CHECK(filesize > 0),
            CHECK(uploaded >= 0 AND uploaded <= filesize),
            UNIQUE(document_id, revision),
            FOREIGN KEY(document_id) REFERENCES document(id),
            FOREIGN KEY(created_by) REFERENCES "user"(id)
        )
    `,
];

interface Row {
    id: RowId;
    documentId: RowId;
    revision: number;
    filename: string;
    filesize: number;
    createdBy: RowId;
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
        id: toId(id),
        document: foreignKey(documentId),
        revision,
        filename,
        filesize,
        createdBy: foreignKey(createdBy),
        createdAt: timestamp(createdAt),
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

export class DocumentRevisionDao extends DaoBase<DocumentRevision, Row> {
    constructor(config: Partial<DaoBaseConfig<DocumentRevision, Row>> = {}) {
        super({
            table,
            dependencies,
            schema,
            rowToken,
            mapRow,
            ...config,
        });
    }

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
                    (SELECT MAX(revision) FROM document_revision
                    WHERE document_id = ${documentId}),
                    0
                ) + 1,
                ${filename},
                ${filesize},
                ${userId},
                NOW(),
                ${changeDescription}
            )
            RETURNING ${this.rowToken}
        `);
        // TODO: mv to controller
        if (!documentRev.retainCheckout) {
            await db.query(sql`
                UPDATE document SET checkout = NULL
                WHERE id = ${documentId}
            `);
        }
        return this.mapRow(row);
    }

    async byDocumentId(db: Db, documentId: Id): Promise<DocumentRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${this.rowToken} FROM document_revision
            WHERE document_id = ${documentId}
            ORDER BY revision
        `);
        return rows.map((r) => this.mapRow(r));
    }

    async lastByDocumentId(db: Db, documentId: Id): Promise<DocumentRevision | null> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${this.rowToken} FROM document_revision
            WHERE
                document_id = ${documentId} AND
                revision = (
                    SELECT MAX(revision) FROM document_revision
                    WHERE document_id = ${documentId}
                )
        `);
        if (!row) return null;
        return this.mapRow(row);
    }

    async byDocumentIdAndRev(db: Db, documentId: Id, revision: number): Promise<DocumentRevision> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${this.rowToken} FROM document_revision
            WHERE document_id = ${documentId} AND revision = ${revision}
        `);
        return row ? this.mapRow(row) : null;
    }

    async idByDocumentIdAndRev(db: Db, documentId: Id, revision: number): Promise<Id> {
        const id = await db.maybeOneFirst(sql`
            SELECT id FROM document_revision
            WHERE document_id = ${documentId} AND revision = ${revision}
        `);
        return id ? toId(id as RowId) : null;
    }

    async updateAddProgress(db: Db, revisionId: Id, addUploaded: number): Promise<number> {
        const uploaded = await db.oneFirst(sql`
            UPDATE document_revision SET uploaded = uploaded + ${addUploaded}
            WHERE id = ${revisionId}
            RETURNING uploaded
        `);
        return uploaded ? (uploaded as number) : null;
    }

    async updateSha1(db: Db, revisionId: Id, sha1: string): Promise<DocumentRevision> {
        const row: Row = await db.maybeOne(sql`
            UPDATE document_revision SET uploaded = filesize, sha1=DECODE(${sha1}, 'hex')
            WHERE id = ${revisionId}
            RETURNING ${this.rowToken}
        `);
        return row ? this.mapRow(row) : null;
    }
}
