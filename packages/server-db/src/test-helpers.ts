import {
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    PartFamily,
    PartFamilyInput,
    Project,
    ProjectInput,
    User,
    UserInput,
} from '@engspace/core';
import {
    DemoPartFamilySet,
    DemoProjectSet,
    DemoUserSet,
    partFamiliesInput,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data-input';
import { sql } from 'slonik';
import { Db, DbPool } from '.';
import { documentDao, documentRevisionDao, partFamilyDao, projectDao, userDao } from './dao';
import { createDemoPartFamilies, createDemoProjects, createDemoUsers } from './populate-demo';

export function cleanTable(pool: DbPool, tableName: string) {
    return async function(): Promise<void> {
        return pool.transaction(async db => {
            await db.query(sql`DELETE FROM ${sql.identifier([tableName])}`);
        });
    };
}

export function cleanTables(pool: DbPool, tableNames: string[]) {
    return async function(): Promise<void> {
        return pool.transaction(async db => {
            for (const tableName of tableNames) {
                await db.query(sql`DELETE FROM ${sql.identifier([tableName])}`);
            }
        });
    };
}
export function transacDemoUsers(pool: DbPool): Promise<DemoUserSet> {
    return pool.transaction(async db => createDemoUsers(db, prepareUsers()));
}

export function transacDemoProjects(pool: DbPool): Promise<DemoProjectSet> {
    return pool.transaction(async db => createDemoProjects(db, prepareProjects()));
}

export function transacDemoPartFamilies(pool: DbPool): Promise<DemoPartFamilySet> {
    return pool.transaction(async db => createDemoPartFamilies(db, partFamiliesInput));
}

export function createUser(db: Db, input: Partial<UserInput> = {}): Promise<User> {
    return userDao.create(db, {
        name: 'user.name',
        email: 'user.name@email.net',
        fullName: 'User Name',
        ...input,
    });
}

export function createProject(db: Db, input: Partial<ProjectInput> = {}): Promise<Project> {
    return projectDao.create(db, {
        name: 'project',
        description: 'a project',
        code: 'proj',
        ...input,
    });
}

export function createPartFamily(
    db: Db,
    input: Partial<PartFamilyInput> = {}
): Promise<PartFamily> {
    return partFamilyDao.create(db, {
        name: 'Part Family',
        code: 'P',
        ...input,
    });
}

export function resetFamilyCounters(pool: DbPool) {
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