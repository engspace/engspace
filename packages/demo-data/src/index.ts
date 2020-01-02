import { DbPool } from '@engspace/server-db';
import { createLogins } from './login';
import { createMembers } from './member';
import { createProjects, prepareProjects } from './project';
import { createUsers, prepareUsers } from './user';

export { DemoProjectInputSet, DemoProjectSet } from './project';
export { DemoUserInputSet, DemoUserSet } from './user';
export { createLogins, createMembers, createProjects, prepareProjects, createUsers, prepareUsers };

export async function populateDemo(pool: DbPool): Promise<void> {
    try {
        await pool.connect(async db => {
            const users = createUsers(db, prepareUsers());
            const projects = createProjects(db, prepareProjects());
            const members = createMembers(db, projects, users);
            await Promise.all([members, createLogins(db, users)]);
        });
    } catch (err) {
        console.error('error while populating the demo data set:');
        console.error(err);
    }
}
