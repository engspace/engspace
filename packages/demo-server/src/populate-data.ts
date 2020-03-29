import { Document, DocumentInput, ProjectMember } from '@engspace/core';
import {
    asyncKeyMap,
    DemoDocInput,
    DemoPartFamilyInputSet,
    DemoPartFamilySet,
    DemoProjectInputSet,
    DemoProjectSet,
    DemoUserInputSet,
    DemoUserSet,
    documentInput,
    membersInput,
    partFamiliesInput,
    prepareProjects,
    prepareRevision,
    prepareStore,
    prepareUsers,
} from '@engspace/demo-data-input';
import { Db, DbPool } from '@engspace/server-db';
import { dao } from '.';

export async function createDemoUsers(db: Db, users: DemoUserInputSet): Promise<DemoUserSet> {
    return asyncKeyMap(users, async u => dao.user.create(db, u));
}

export async function createDemoLogins(db: Db, users: Promise<DemoUserSet>): Promise<void> {
    const usrs = await users;
    for (const name in usrs) {
        await dao.login.create(db, usrs[name].id, name);
    }
}

export async function createDemoProjects(
    db: Db,
    projs: DemoProjectInputSet
): Promise<DemoProjectSet> {
    return asyncKeyMap(projs, async p => dao.project.create(db, p));
}

export async function createDemoMembers(
    db,
    projects: Promise<DemoProjectSet>,
    users: Promise<DemoUserSet>
): Promise<ProjectMember[]> {
    const [projs, usrs] = await Promise.all([projects, users]);
    return Promise.all(
        membersInput.map(m =>
            dao.projectMember.create(db, {
                projectId: projs[m.project].id,
                userId: usrs[m.user].id,
                roles: m.roles,
            })
        )
    );
}

export async function createDemoPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    return asyncKeyMap(input, async pf => dao.partFamily.create(db, pf));
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
    const doc = await dao.document.create(db, docInput, usrs[creator].id);
    const { input, sha1 } = await prepareRevision(Promise.resolve(doc), filepath, storePath);
    const rev = await dao.documentRevision.create(db, input, usrs[creator].id);
    await dao.documentRevision.updateSha1(db, rev.id, sha1);
    doc.revisions = [rev];
    doc.lastRevision = rev;
    return doc;
}

export async function createDemoDocuments(
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
            const users = createDemoUsers(db, prepareUsers());
            const projects = createDemoProjects(db, prepareProjects());
            await Promise.all([
                createDemoMembers(db, projects, users),
                createDemoDocuments(db, users, storePath),
                createDemoLogins(db, users),
                createDemoPartFamilies(db, partFamiliesInput),
            ]);
        });
    } catch (err) {
        console.error('error while populating the demo data set:');
        console.error(err);
    }
}
