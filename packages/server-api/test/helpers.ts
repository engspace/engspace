import {
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    User,
    PartFamily,
} from '@engspace/core';
import {
    DemoPartFamilySet,
    DemoProjectSet,
    DemoUserSet,
    partFamiliesInput,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data-input';
import { Db, documentDao, documentRevisionDao, userDao, partFamilyDao } from '@engspace/server-db';
import {
    createDemoPartFamilies,
    createDemoProjects,
    createDemoUsers,
} from '@engspace/server-db/dist/populate-demo';
import { sql } from 'slonik';
import { pool } from '.';

// Misc

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

// Users

export function transacDemoUsers(): Promise<DemoUserSet> {
    return pool.transaction(async db => createDemoUsers(db, prepareUsers()));
}

export function createSingleUser(db: Db): Promise<User> {
    return userDao.create(db, {
        name: 'user.name',
        email: 'user.name@email.net',
        fullName: 'User Name',
    });
}

export function transacSingleUser(): Promise<User> {
    return pool.transaction(async db => createSingleUser(db));
}

// Projects

export function transacDemoProjects(): Promise<DemoProjectSet> {
    return pool.transaction(async db => createDemoProjects(db, prepareProjects()));
}

// Part families

export function transacDemoPartFamilies(): Promise<DemoPartFamilySet> {
    return pool.transaction(async db => createDemoPartFamilies(db, partFamiliesInput));
}

export function createSingleFamily(db: Db): Promise<PartFamily> {
    return partFamilyDao.create(db, {
        name: 'Part family',
        code: 'P',
    });
}

export function transacSingleFamily(): Promise<PartFamily> {
    return pool.transaction(async db => createSingleFamily(db));
}

export function resetFamilyCounters() {
    return function(): Promise<void> {
        return pool.transaction(async db => {
            await db.query(sql`UPDATE part_family SET counter=0`);
        });
    };
}

// Documents

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
