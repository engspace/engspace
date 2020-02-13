import {
    createProjects,
    createUsers,
    DemoProjectSet,
    DemoUserSet,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data';
import { projectDao } from '@engspace/server-db';
import chai from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { auth } from './auth';
import { deleteAllUsers } from './user';

const { expect } = chai;

export async function deleteAllProjects(): Promise<void> {
    await pool.transaction(async db => projectDao.deleteAll(db));
}

export const PROJECT_FIELDS = gql`
    fragment ProjectFields on Project {
        id
        code
        name
        description
    }
`;

describe('GraphQL Project', () => {
    const projectsInput = prepareProjects();
    let users: DemoUserSet;

    before('Create users', async () => {
        users = await pool.transaction(db => createUsers(db, prepareUsers()));
    });

    after(deleteAllUsers);

    describe('Query', function() {
        let projects: DemoProjectSet;

        before('Create projects', async () => {
            projects = await pool.transaction(db => createProjects(db, projectsInput));
        });

        after(deleteAllProjects);

        it('should read one project', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, auth(users.tania));
                return query({
                    query: gql`
                        query ReadProject($id: ID!) {
                            project(id: $id) {
                                ...ProjectFields
                            }
                        }
                        ${PROJECT_FIELDS}
                    `,
                    variables: { id: projects.chair.id },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.project).to.deep.include(projects.chair);
        });
    });
});
