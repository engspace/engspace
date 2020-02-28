import { Document, DocumentInput, DocumentSearch, HasId, Id } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoRowMap } from './base';

interface Row extends HasId {
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

class DocumentDao extends DaoRowMap<Document, Row> {
    async create(db: Db, document: DocumentInput, userId: Id): Promise<Document> {
        const { name, description, initialCheckout } = document;
        const row: Row = await db.one(sql`
            INSERT INTO document (name, description, created_by, created_at, checkout)
            VALUES (${name}, ${description}, ${userId}, NOW(), ${initialCheckout ? userId : null})
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async checkoutIdById(db: Db, id: Id): Promise<Id> {
        const checkoutId = await db.maybeOneFirst(sql`
            SELECT checkout FROM document
            WHERE id = ${id}
        `);
        return checkoutId as Id;
    }

    async search(db: Db, search: string, offset: number, limit: number): Promise<DocumentSearch> {
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

    async checkout(db: Db, id: Id, userId: Id): Promise<Document | null> {
        const row: Row = await db.maybeOne(sql`
            UPDATE document SET checkout = COALESCE(checkout, ${userId})
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        if (!row) return null;
        return mapRow(row);
    }

    async discardCheckout(db: Db, id: Id, userId: Id): Promise<Document | null> {
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

export const documentDao = new DocumentDao({
    table: 'document',
    rowToken,
    mapRow,
});
