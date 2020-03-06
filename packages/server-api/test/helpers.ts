import {
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    User,
} from '@engspace/core';
import {
    DemoPartFamilySet,
    DemoProjectSet,
    DemoUserSet,
    partFamiliesInput,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data-input';
import {
    createDemoPartFamilies,
    createDemoProjects,
    createDemoUsers,
    Db,
    documentDao,
    documentRevisionDao,
} from '@engspace/server-db';
import { sql } from 'slonik';
import { pool } from '.';

export function transacDemoUsers(): Promise<DemoUserSet> {
    return pool.transaction(async db => createDemoUsers(db, prepareUsers()));
}

export function transacDemoProjects(): Promise<DemoProjectSet> {
    return pool.transaction(async db => createDemoProjects(db, prepareProjects()));
}

export function transacDemoPartFamilies(): Promise<DemoPartFamilySet> {
    return pool.transaction(async db => createDemoPartFamilies(db, partFamiliesInput));
}

export function cleanTable(tableName: string) {
    return async function(): Promise<void> {
        return pool.transaction(async db => {
            await db.query(sql`DELETE FROM ${sql.identifier([tableName])}`);
        });
    };
}

export function cleanTables(tableNames: string[]) {
    return async function(): Promise<void> {
        return pool.transaction(async db => {
            for (const tableName of tableNames) {
                await db.query(sql`DELETE FROM ${sql.identifier([tableName])}`);
            }
        });
    };
}

export async function createDoc(
    db: Db,
    user: User,
    input: Partial<DocumentInput> = {}
): Promise<Document> {
    return documentDao.create(
        db,
        {
            name: 'docname',
            description: 'doc description',
            initialCheckout: true,
            ...input,
        },
        user.id
    );
}

export async function createDocRev(
    db: Db,
    doc: Document,
    user: User,
    input: Partial<DocumentRevisionInput> = {}
): Promise<DocumentRevision> {
    return documentRevisionDao.create(
        db,
        {
            filename: 'file.ext',
            filesize: 1664,
            changeDescription: 'update file',
            retainCheckout: true,
            ...input,
            documentId: doc.id,
        },
        user.id
    );
}
