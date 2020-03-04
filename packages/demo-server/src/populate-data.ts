import {
    createDemoDocuments,
    createDemoLogins,
    createDemoMembers,
    createDemoPartFamilies,
    createDemoProjects,
    createDemoUsers,
    DbPool,
} from '@engspace/server-db';
import { prepareUsers, prepareProjects, partFamiliesInput } from '@engspace/demo-data-input';

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
