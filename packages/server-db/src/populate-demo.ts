// This module is placed in @engspace/server-db to solve circular dependencies
// Demo population uses server-db and is used by:
//  - server-db tests
//  - server-api tests
//  - demo-server

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
    prepareRevision,
    prepareStore,
} from '@engspace/demo-data-input';
import {
    Db,
    documentDao,
    documentRevisionDao,
    loginDao,
    memberDao,
    partFamilyDao,
    projectDao,
    userDao,
} from '@engspace/server-db';

export async function createDemoUsers(db: Db, users: DemoUserInputSet): Promise<DemoUserSet> {
    return asyncKeyMap(users, async u => userDao.create(db, u));
}

export async function createDemoLogins(db: Db, users: Promise<DemoUserSet>): Promise<void> {
    const usrs = await users;
    for (const name in usrs) {
        await loginDao.create(db, usrs[name].id, name);
    }
}

export async function createDemoProjects(
    db: Db,
    projs: DemoProjectInputSet
): Promise<DemoProjectSet> {
    return asyncKeyMap(projs, async p => projectDao.create(db, p));
}

export async function createDemoMembers(
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

export async function createDemoPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    return asyncKeyMap(input, async pf => partFamilyDao.create(db, pf));
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

export async function createDemoDocuments(
    db: Db,
    users: Promise<DemoUserSet>,
    storePath: string
): Promise<Document[]> {
    await prepareStore(storePath);
    return Promise.all(documentInput.map(di => createDocument(db, di, users, storePath)));
}
