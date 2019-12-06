import { DbPool } from '@engspace/server-db';
import { createUsers } from './user';
import { createProjects } from './project';

export { createUsers, createProjects };
export { userInput, prepareUsers, prepareUsersWithPswd } from './user';
export { projectInput, prepareProjects } from './project';

export async function populateDemo(pool: DbPool): Promise<void> {
    return pool.connect(async db => {
        await createUsers(db);
        await createProjects(db);
    });
}
