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
import { permsAuth } from './auth';
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

const PROJECT_READ = gql`
    query ReadProject($id: ID!) {
        project(id: $id) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

const PROJECT_READ_BYCODE = gql`
    query ReadProjectByCode($code: String!) {
        projectByCode(code: $String) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
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

        it('should read project with "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, ['project.read']));
                return query({
                    query: PROJECT_READ,
                    variables: { id: projects.chair.id },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.project).to.deep.include(projects.chair);
        });

        it('should not read project without "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, []));
                return query({
                    query: PROJECT_READ,
                    variables: { id: projects.chair.id },
                });
            });
            expect(result.errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(result.data).to.be.an('object');
            expect(result.data.project).to.be.null;
        });

        it('should read project by code with "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, ['project.read']));
                return query({
                    query: PROJECT_READ_BYCODE,
                    variables: { code: 'desk' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.projectByCode).to.deep.include(projects.chair);
        });

        it('should not read project by code without "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, []));
                return query({
                    query: PROJECT_READ_BYCODE,
                    variables: { code: 'desk' },
                });
            });
            expect(result.errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(result.data).to.be.an('object');
            expect(result.data.projectByCode).to.be.null;
        });
    });
});
