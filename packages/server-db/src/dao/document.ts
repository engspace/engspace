import {
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
} from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

export namespace DocumentDao {
    interface Row {
        id: Id;
        name: string;
        description: string;
        createdBy: Id;
        createdAt: number;
        checkout: Id;
    }

    function mapRow({ id, name, description, createdBy, createdAt, checkout }: Row): Document {
        if (!id) return null;
        return {
            id,
            name,
            description,
            createdBy: { id: createdBy },
            createdAt: createdAt * 1000,
            checkout: checkout ? { id: checkout } : null,
        };
    }

    const rowToken = sql`
        id, name, description, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at, checkout
    `;

    export async function create(db: Db, document: DocumentInput, userId: Id): Promise<Document> {
        const { name, description, initialCheckout } = document;
        const row: Row = await db.one(sql`
            INSERT INTO document (name, description, created_by, created_at, checkout)
            VALUES (${name}, ${description}, ${userId}, NOW(), ${initialCheckout ? userId : null})
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    export async function byId(db: Db, id: Id): Promise<Document | null> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM document
            WHERE id = ${id}
        `);
        return mapRow(row);
    }

    export async function search(
        db: Db,
        search: string,
        offset: number,
        limit: number
    ): Promise<DocumentSearch> {
        const boolExpressions = [sql`TRUE`];
        if (search) {
            const phrase = `%${search.replace(/s/g, '%')}%`;
            boolExpressions.push(sql`(
                name ILIKE ${phrase} OR
                description ILIKE ${phrase})`);
        }
        const whereToken = sql.join(boolExpressions, sql` AND `);
        const limitToken = sql`${limit ? limit : 1000}`;
        const offsetToken = sql`${offset | 0}`;
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} FROM document
            WHERE ${whereToken}
            LIMIT ${limitToken}
            OFFSET ${offsetToken}
        `);
        const documents = rows.map(r => mapRow(r));
        let count = documents.length + (offset | 0);
        if (limit && documents.length === limit) {
            count = (await db.oneFirst(sql`
                SELECT COUNT(id) FROM document
                WHERE ${whereToken}
            `)) as number;
        }
        return { count, documents };
    }

    export async function checkout(
        db: Db,
        id: Id,
        revision: number,
        userId: Id
    ): Promise<Document | null> {
        const row: Row = await db.maybeOne(sql`
            UPDATE document SET checkout = COALESCE(checkout, ${userId})
            WHERE
                id = ${id} AND
                (
                    SELECT MAX(revision) FROM document_revision WHERE document_id = ${id}
                ) = ${revision}
            RETURNING ${rowToken}
        `);
        if (!row) return null;
        return mapRow(row);
    }

    export async function discardCheckout(db: Db, id: Id, userId: Id): Promise<Document | null> {
        const row: Row = await db.maybeOne(sql`
            UPDATE document SET checkout = (
                SELECT checkout FROM document WHERE id = ${id} AND checkout <> ${userId}
            )
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        if (!row) return null;
        return mapRow(row);
    }
}

export namespace DocumentRevisionDao {
    interface Row {
        id: Id;
        docId: Id;
        revision: number;
        filename: string;
        filesize: number;
        sha1: string;
        changeDescription: string;
        author: Id;
        createdAt: number;
        uploaded: number;
        uploadChecked: boolean;
    }

    function mapRow({
        id,
        docId,
        revision,
        filename,
        filesize,
        sha1,
        changeDescription,
        author,
        createdAt,
        uploaded,
        uploadChecked,
    }: Row): DocumentRevision {
        if (!id) return null;
        return {
            id,
            document: { id: docId },
            revision,
            filename,
            filesize,
            sha1,
            changeDescription,
            author: { id: author },
            createdAt: createdAt * 1000,
            uploaded: uploaded ? uploaded : 0,
            uploadChecked: uploadChecked ? uploadChecked : false,
        };
    }

    const rowToken = sql`
        id, document_id, revision, filename, filesize, change_description, ENCODE(sha1, 'hex') AS sha1,
        author, EXTRACT(EPOCH FROM created_at) AS created_at, uploaded, upload_checked
    `;

    export async function create(
        db: Db,
        documentRev: DocumentRevisionInput,
        userId: Id
    ): Promise<DocumentRevision> {
        const { documentId, filename, filesize, sha1, changeDescription } = documentRev;
        const row: Row = await db.one(sql`
            INSERT INTO document_revision (
                document_id, revision, filename, filesize, change_description, sha1, author, created_at
            ) VALUES (
                ${documentId},
                COALESCE(
                    (SELECT MAX(revision) FROM document_revision WHERE document_id = ${documentId}),
                    0
                ) + 1,
                ${filename},
                ${filesize},
                ${changeDescription},
                DECODE(${sha1}, 'hex'),
                (SELECT checkout FROM document WHERE id = ${documentId} AND checkout = ${userId}),
                NOW()
            )
            RETURNING ${rowToken}
        `);
        if (!documentRev.retainCheckout) {
            await db.query(sql`
                UPDATE document SET checkout = NULL
                WHERE id = ${documentId}
            `);
        }
        return mapRow(row);
    }

    export async function byId(db: Db, id: Id): Promise<DocumentRevision | null> {
        const row: Row = await db.one(sql`
            SELECT ${rowToken} FROM document_revision
            WHERE id = ${id}
        `);
        if (!row) return null;
        return mapRow(row);
    }

    export async function byDocumentId(db: Db, documentId: Id): Promise<DocumentRevision[]> {
        const rows: Row[] = await db.any(sql`
            SELECT ${rowToken} FROM document_revision
            WHERE document_id = ${documentId}
            ORDER BY revision
        `);
        return rows.map(r => mapRow(r));
    }

    export async function lastByDocumentId(
        db: Db,
        documentId: Id
    ): Promise<DocumentRevision | null> {
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

    export async function byDocumentIdAndRev(
        db: Db,
        documentId: Id,
        revision: number
    ): Promise<DocumentRevision> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM document_revision
            WHERE document_id = ${documentId} AND revision = ${revision}
        `);
        if (!row) return null;
        return mapRow(row);
    }
}
