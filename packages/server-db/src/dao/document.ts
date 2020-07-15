import { sql } from 'slonik';
import { Document, DocumentInput, DocumentSearch, Id } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, timestamp, toId, DaoBaseConfig } from './base';

const table = 'document';

const dependencies = ['user'];

const schema = [
    sql`
        CREATE TABLE document (
            id serial PRIMARY KEY,
            name text NOT NULL,
            description text,
            created_by integer NOT NULL,
            created_at timestamptz NOT NULL,
            checkout integer,

            FOREIGN KEY(created_by) REFERENCES "user"(id),
            FOREIGN KEY(checkout) REFERENCES "user"(id)
        )
    `,
];

interface Row {
    id: RowId;
    name: string;
    description: string;
    createdBy: RowId;
    createdAt: number;
    checkout: RowId;
}

function mapRow({ id, name, description, createdBy, createdAt, checkout }: Row): Document {
    if (!id) return null;
    return {
        id: toId(id),
        name,
        description,
        createdBy: foreignKey(createdBy),
        createdAt: timestamp(createdAt),
        checkout: foreignKey(checkout),
    };
}

const rowToken = sql`
        id, name, description, created_by,
        EXTRACT(EPOCH FROM created_at) AS created_at, checkout
    `;

export class DocumentDao extends DaoBase<Document, Row> {
    constructor(config: Partial<DaoBaseConfig<Document, Row>> = {}) {
        super({
            table,
            dependencies,
            schema,
            rowToken,
            mapRow,
            ...config,
        });
    }
    async create(db: Db, document: DocumentInput, userId: Id): Promise<Document> {
        const { name, description, initialCheckout } = document;
        const row: Row = await db.one(sql`
            INSERT INTO document (
                name,
                description,
                created_by,
                created_at,
                checkout
            )
            VALUES (
                ${name},
                ${description},
                ${userId},
                NOW(),
                ${initialCheckout ? userId : null}
            )
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async checkoutIdById(db: Db, id: Id): Promise<Id> {
        const checkoutId = await db.maybeOneFirst(sql`
            SELECT checkout FROM document
            WHERE id = ${id}
        `);
        return toId(checkoutId as RowId);
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
        const documents = rows.map((r) => mapRow(r));
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
        const _id = id;
        const row: Row = await db.maybeOne(sql`
            UPDATE document SET checkout = (
                SELECT checkout FROM document
                WHERE id = ${_id} AND checkout <> ${userId}
            )
            WHERE id = ${_id}
            RETURNING ${rowToken}
        `);
        if (!row) return null;
        return mapRow(row);
    }
}
