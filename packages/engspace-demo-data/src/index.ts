
import { Pool } from '@engspace/server-api/dist/db';
import { createUsers } from './user';
import { createProjects } from './project';

export async function populateDemo(): Promise<void> {
    return Pool.connect(async (db) => {
        await createUsers(db);
        await createProjects(db);
    });
}
