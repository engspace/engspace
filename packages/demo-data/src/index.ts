import { DbPool } from '@engspace/server-db';
import { createDocuments } from './document';
import { createLogins } from './login';
import { createMembers } from './member';
import { createProjects, prepareProjects } from './project';
import { createUsers, prepareUsers } from './user';

export { DemoProjectInputSet, DemoProjectSet } from './project';
export { DemoUserInputSet, DemoUserSet } from './user';
export {
    createDocuments,
    createLogins,
    createMembers,
    createProjects,
    createUsers,
    prepareProjects,
    prepareUsers,
};

export async function populateDemo(pool: DbPool, storePath: string): Promise<void> {
    try {
        await pool.connect(async db => {
            const users = createUsers(db, prepareUsers());
            const projects = createProjects(db, prepareProjects());
            await Promise.all([
                createMembers(db, projects, users),
                createDocuments(db, users, storePath),
                createLogins(db, users),
            ]);
        });
    } catch (err) {
        console.error('error while populating the demo data set:');
        console.error(err);
    }
}
