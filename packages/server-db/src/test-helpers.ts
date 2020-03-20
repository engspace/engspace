import {
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    Part,
    PartBase,
    PartBaseInput,
    PartFamily,
    PartFamilyInput,
    Project,
    ProjectInput,
    ProjectMember,
    User,
    UserInput,
} from '@engspace/core';
import { sql } from 'slonik';
import { Db, DbPool } from '.';
import {
    documentDao,
    documentRevisionDao,
    memberDao,
    partBaseDao,
    partDao,
    PartDaoInput,
    partFamilyDao,
    projectDao,
    userDao,
} from './dao';

export interface Dict<T> {
    [prop: string]: T;
}

export async function asyncDictMap<InT, OutT>(
    input: Dict<InT>,
    func: (inp: InT) => Promise<OutT>
): Promise<Dict<OutT>> {
    const keyVals = await Promise.all(
        Object.entries(input).map(async ([key, inp]) => [key, await func(inp)])
    );
    return Object.fromEntries(keyVals);
}

export function dictMap<InT, OutT>(input: Dict<InT>, func: (inp: InT) => OutT): Dict<OutT> {
    const keyVals = Object.entries(input).map(([key, inp]) => [key, func(inp)]);
    return Object.fromEntries(keyVals);
}

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

export async function createUser(db: Db, input: Partial<UserInput> = {}): Promise<User> {
    const name = 'user.name';
    const email = `${input.name ?? name}@engspace.net`;

    const u = await userDao.create(db, {
        name,
        email,
        fullName: 'User Name',
        ...input,
    });
    if (input.roles && input.roles.length) {
        u.roles = await userDao.insertRoles(db, u.id, input.roles);
    }
    return u;
}

export function transacUser(pool: DbPool, input: Partial<UserInput>): Promise<User> {
    return pool.transaction(db => createUser(db, input));
}

export function createUsers(db: Db, input: Dict<Partial<UserInput>>): Promise<Dict<User>> {
    return asyncDictMap(input, inp => createUser(db, inp));
}

export function createUsersAB(db: Db): Promise<{ a: User; b: User }> {
    return createUsers(db, { a: { name: 'a' }, b: { name: 'b' } }) as Promise<{
        a: User;
        b: User;
    }>;
}

export function transacUsers(pool: DbPool, input: Dict<Partial<UserInput>>): Promise<Dict<User>> {
    return pool.transaction(db => asyncDictMap(input, inp => createUser(db, inp)));
}

export function transacUsersAB(pool: DbPool): Promise<{ a: User; b: User }> {
    return transacUsers(pool, { a: { name: 'a' }, b: { name: 'b' } }) as Promise<{
        a: User;
        b: User;
    }>;
}

export function createProject(db: Db, input: Partial<ProjectInput> = {}): Promise<Project> {
    const code = input.code ?? 'P';
    const name = input.name ?? `${code.toUpperCase()}`;
    const description = input.description ?? `${code.toUpperCase()} Project`;
    return projectDao.create(db, {
        code,
        name,
        description,
    });
}

export function transacProject(pool: DbPool, input: Partial<ProjectInput> = {}): Promise<Project> {
    return pool.transaction(async db => {
        return createProject(db, input);
    });
}

export function createProjects(db: Db, input: Dict<Partial<ProjectInput>>): Promise<Dict<Project>> {
    return asyncDictMap(input, inp => createProject(db, inp));
}

export function transacProjects(
    pool: DbPool,
    input: Dict<Partial<ProjectInput>>
): Promise<Dict<Project>> {
    return pool.transaction(async db => {
        return asyncDictMap(input, inp => createProject(db, inp));
    });
}

export function createMember(
    db: Db,
    proj: Project,
    user: User,
    roles: string[]
): Promise<ProjectMember> {
    return memberDao.create(db, {
        projectId: proj.id,
        userId: user.id,
        roles,
    });
}

export function transacMember(
    pool: DbPool,
    proj: Project,
    user: User,
    roles: string[]
): Promise<ProjectMember> {
    return pool.transaction(async db =>
        memberDao.create(db, {
            projectId: proj.id,
            userId: user.id,
            roles,
        })
    );
}

export function createPartFamily(
    db: Db,
    input: Partial<PartFamilyInput> = {}
): Promise<PartFamily> {
    const code = input.code ?? 'P';
    const name = input.name ?? `${code.toUpperCase()} part family`;
    return partFamilyDao.create(db, {
        code,
        name,
    });
}

export function createPartFamilies(
    db: Db,
    input: Dict<Partial<PartFamilyInput>>
): Promise<Dict<PartFamily>> {
    return asyncDictMap(input, inp => createPartFamily(db, inp));
}

export function resetFamilyCounters(pool: DbPool) {
    return function(): Promise<void> {
        return pool.transaction(async db => {
            await db.query(sql`UPDATE part_family SET counter=0`);
        });
    };
}

export function createPartBase(
    db: Db,
    family: PartFamily,
    user: User,
    baseRef: string,
    input: Partial<PartBaseInput> = {}
): Promise<PartBase> {
    return partBaseDao.create(
        db,
        {
            designation: 'Part Designation',
            ...input,
            familyId: family.id,
        },
        baseRef,
        user.id
    );
}

export function createPart(
    db: Db,
    base: PartBase,
    user: User,
    ref: string,
    input: Partial<PartDaoInput> = {}
): Promise<Part> {
    return partDao.create(db, {
        designation: 'Part',
        ...input,
        ref,
        baseId: base.id,
        userId: user.id,
    });
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
