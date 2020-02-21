import { ProjectMember, DocumentInput, Document } from '@engspace/core';
import {
    DemoProjectInputSet,
    DemoProjectSet,
    DemoUserInputSet,
    DemoUserSet,
    membersInput,
    documentInput,
    prepareRevision,
    DemoPartFamilySet,
    DemoPartFamilyInputSet,
    DemoDocInput,
    prepareStore,
    prepareUsers,
    prepareProjects,
    partFamiliesInput,
} from '@engspace/demo-data-input';
import {
    Db,
    loginDao,
    memberDao,
    projectDao,
    userDao,
    partFamilyDao,
    documentDao,
    DbPool,
    documentRevisionDao,
} from '@engspace/server-db';

export async function createUsers(db: Db, users: DemoUserInputSet): Promise<DemoUserSet> {
    const keyVals = await Promise.all(
        Object.entries(users).map(async ([name, input]) => [name, await userDao.create(db, input)])
    );
    return Object.fromEntries(keyVals);
}

export async function createLogins(db: Db, users: Promise<DemoUserSet>): Promise<void> {
    const usrs = await users;
    for (const name in usrs) {
        await loginDao.create(db, usrs[name].id, name);
    }
}

export async function createProjects(db: Db, projs: DemoProjectInputSet): Promise<DemoProjectSet> {
    const keyVals = await Promise.all(
        Object.entries(projs).map(async ([code, input]) => [
            code,
            await projectDao.create(db, input),
        ])
    );
    return Object.fromEntries(keyVals);
}

export async function createMembers(
    db,
    projects: Promise<DemoProjectSet>,
    users: Promise<DemoUserSet>
): Promise<ProjectMember[]> {
    const [projs, usrs] = await Promise.all([projects, users]);
    return Promise.all(
        membersInput.map(m =>
            memberDao.create(db, {
                projectId: projs[m.project].id,
                userId: usrs[m.user].id,
                roles: m.roles,
            })
        )
    );
}

export async function createPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    const keyVals = await Promise.all(
        Object.entries(input).map(async ([name, input]) => [
            name,
            await partFamilyDao.create(db, input),
        ])
    );
    return Object.fromEntries(keyVals);
}

async function createDocument(
    db: Db,
    { name, description, creator, filepath }: DemoDocInput,
    users: Promise<DemoUserSet>,
    storePath: string
): Promise<Document> {
    const docInput: DocumentInput = {
        name,
        description,
        initialCheckout: true,
    };
    const usrs = await users;
    const doc = await documentDao.create(db, docInput, usrs[creator].id);
    const { input, sha1 } = await prepareRevision(Promise.resolve(doc), filepath, storePath);
    const rev = await documentRevisionDao.create(db, input, usrs[creator].id);
    await documentRevisionDao.updateSha1(db, rev.id, sha1);
    doc.revisions = [rev];
    doc.lastRevision = rev;
    return doc;
}

export async function createDocuments(
    db: Db,
    users: Promise<DemoUserSet>,
    storePath: string
): Promise<Document[]> {
    await prepareStore(storePath);
    return Promise.all(documentInput.map(di => createDocument(db, di, users, storePath)));
}

export async function populateData(pool: DbPool, storePath: string): Promise<void> {
    try {
        await pool.connect(async db => {
            const users = createUsers(db, prepareUsers());
            const projects = createProjects(db, prepareProjects());
            await Promise.all([
                createMembers(db, projects, users),
                createDocuments(db, users, storePath),
                createLogins(db, users),
                createPartFamilies(db, partFamiliesInput),
            ]);
        });
    } catch (err) {
        console.error('error while populating the demo data set:');
        console.error(err);
    }
}
