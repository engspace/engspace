import {
    cleanTable,
    transacProject,
    transacProjects,
    transacUsersAB,
} from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';

export const PROJECT_FIELDS = gql`
    fragment ProjectFields on Project {
        id
        code
        name
        description
    }
`;

export const PROJECT_READ = gql`
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

export const PROJECT_CREATE = gql`
    mutation CreateProject($input: ProjectInput!) {
        projectCreate(input: $input) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

export const PROJECT_UPDATE = gql`
    mutation UpdateProject($id: ID!, $input: ProjectInput!) {
        projectUpdate(id: $id, input: $input) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

describe('GraphQL Project', () => {
    let users;

    before('Create users', async () => {
        users = await transacUsersAB(pool);
    });

    after(cleanTable(pool, 'user'));

    describe('Query', function() {
        let projects;

        before('Create projects', async () => {
            projects = await transacProjects(pool, { a: { code: 'a' }, b: { code: 'b' } });
        });

        after(cleanTable(pool, 'project'));

        it('should read project with "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.a, ['project.read']));
                return query({
                    query: PROJECT_READ,
                    variables: { id: projects.a.id },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.project).to.deep.include(projects.a);
        });

        it('should not read project without "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
                return query({
                    query: PROJECT_READ,
                    variables: { id: projects.a.id },
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
                const { query } = buildGqlServer(db, permsAuth(users.a, ['project.read']));
                return query({
                    query: PROJECT_READ_BYCODE,
                    variables: { code: 'b' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.projectByCode).to.deep.include(projects.b);
        });

        it('should not read project by code without "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
                return query({
                    query: PROJECT_READ_BYCODE,
                    variables: { code: 'b' },
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
                const { query } = buildGqlServer(db, permsAuth(users.a, ['project.read']));
                return query({
                    query: PROJECT_SEARCH,
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.projectSearch).to.eql({
                count: 2,
                projects: [projects.a, projects.b],
            });
        });

        it('should not search project without "project.read"', async () => {
            const result = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.a, []));
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
                const { query } = buildGqlServer(db, permsAuth(users.a, ['project.read']));
                return query({
                    query: PROJECT_SEARCH,
                    variables: { search: 'a' },
                });
            });
            expect(result.errors).to.be.undefined;
            expect(result.data).to.be.an('object');
            expect(result.data.projectSearch).to.eql({
                count: 1,
                projects: [projects.a],
            });
        });
    });

    describe('Mutation', () => {
        describe('Create', () => {
            afterEach(cleanTable(pool, 'project'));

            const input = {
                code: 'a',
                name: 'A',
                description: 'Project A',
            };

            it('should create project with "project.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, permsAuth(users.a, ['project.create']));
                    return mutate({
                        mutation: PROJECT_CREATE,
                        variables: {
                            input,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.projectCreate).to.deep.include(input);
                expect(data.projectCreate.id).to.be.uuid();
            });
            it('should not create project without "project.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, permsAuth(users.a, []));
                    return mutate({
                        mutation: PROJECT_CREATE,
                        variables: {
                            input,
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
            let moon;

            beforeEach('Create projects', async () => {
                moon = await transacProject(pool, {
                    code: 'moon',
                    name: 'Moon',
                    description: 'Man on Moon',
                });
            });

            afterEach(cleanTable(pool, 'project'));

            const mars = {
                code: 'mars',
                name: 'Mars',
                description: 'A journey to Mars',
            };

            it('should update project with "project.update"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, permsAuth(users.a, ['project.update']));
                    return mutate({
                        mutation: PROJECT_UPDATE,
                        variables: {
                            id: moon.id,
                            input: mars,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.projectUpdate).to.deep.include({
                    ...mars,
                    id: moon.id,
                });
            });
            it('should not update project without "project.update"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(db, permsAuth(users.a, []));
                    return mutate({
                        mutation: PROJECT_UPDATE,
                        variables: {
                            id: moon.id,
                            input: mars,
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
