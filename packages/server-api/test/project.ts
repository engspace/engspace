import {
    DemoProjectSet,
    DemoUserSet,
    prepareProjects,
    prepareUsers,
    DemoProjectInputSet,
} from '@engspace/demo-data-input';
import { projectDao, Db } from '@engspace/server-db';
import chai from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';
import { deleteAllUsers, createUsers } from './user';

const { expect } = chai;

export async function deleteAllProjects(): Promise<void> {
    await pool.transaction(async db => projectDao.deleteAll(db));
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
        projectByCode(code: $code) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

const PROJECT_SEARCH = gql`
    query SeachProject($search: String) {
        projectSearch(search: $search) {
            count
            projects {
                ...ProjectFields
            }
        }
    }
    ${PROJECT_FIELDS}
`;

const PROJECT_CREATE = gql`
    mutation CreateProject($project: ProjectInput!) {
        projectCreate(project: $project) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

const PROJECT_UPDATE = gql`
    mutation UpdateProject($id: ID!, $project: ProjectInput!) {
        projectUpdate(id: $id, project: $project) {
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
            expect(result.data.projectByCode).to.deep.include(projects.desk);
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

        it('should search project with "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, ['project.read']));
                return query({
                    query: PROJECT_SEARCH,
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.projectSearch).to.eql({
                count: 2,
                projects: [projects.chair, projects.desk],
            });
        });

        it('should not search project without "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, []));
                return query({
                    query: PROJECT_SEARCH,
                });
            });
            expect(result.errors)
                .to.be.an('array')
                .with.lengthOf.at.least(1);
            expect(result.data).to.be.null;
        });

        it('should search project by code', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, ['project.read']));
                return query({
                    query: PROJECT_SEARCH,
                    variables: { search: 'chair' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.projectSearch).to.eql({
                count: 1,
                projects: [projects.chair],
            });
        });
    });

    describe('Mutation', () => {
        describe('Create', () => {
            afterEach(deleteAllProjects);

            it('should create project with "project.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.tania, ['project.create'])
                    );
                    return mutate({
                        mutation: PROJECT_CREATE,
                        variables: {
                            project: projectsInput.chair,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.projectCreate).to.deep.include(projectsInput.chair);
                expect(data.projectCreate.id).to.be.a('string');
            });
            it('should not create project without "project.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, permsAuth(users.tania, []));
                    return mutate({
                        mutation: PROJECT_CREATE,
                        variables: {
                            project: projectsInput.chair,
                        },
                    });
                });
                expect(errors)
                    .to.be.an('array')
                    .with.lengthOf.at.least(1);
                expect(data).to.be.null;
            });
        });

        describe('Update', function() {
            let projects: DemoProjectSet;

            before('Create projects', async () => {
                projects = await pool.transaction(db => createProjects(db, projectsInput));
            });

            after(deleteAllProjects);

            const mars = {
                code: 'mars',
                name: 'Mars',
                description: 'A journey to Mars',
            };

            it('should update project with "project.update"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.tania, ['project.update'])
                    );
                    return mutate({
                        mutation: PROJECT_UPDATE,
                        variables: {
                            id: projects.chair.id,
                            project: mars,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.projectUpdate).to.deep.include({
                    ...mars,
                    id: projects.chair.id,
                });
            });
            it('should not update project without "project.update"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, permsAuth(users.tania, []));
                    return mutate({
                        mutation: PROJECT_UPDATE,
                        variables: {
                            id: projects.chair.id,
                            project: mars,
                        },
                    });
                });
                expect(errors)
                    .to.be.an('array')
                    .with.lengthOf.at.least(1);
                expect(data).to.be.null;
            });
        });
    });
});
