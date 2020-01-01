import { gql } from 'apollo-server-koa';

export const typeDefs = gql`
    input UserInput {
        name: String!
        email: String!
        fullName: String
        roles: [String!]
    }

    type User {
        id: ID!
        name: String!
        email: String!
        fullName: String
        roles: [String!]!
        membership: [ProjectMember!]!
    }

    type UserSearch {
        count: Int!
        users: [User!]!
    }

    input ProjectInput {
        name: String!
        code: String!
        description: String
    }

    type Project {
        id: ID!
        name: String!
        code: String!
        description: String
        members: [ProjectMember!]!
    }

    type ProjectSearch {
        count: Int!
        projects: [Project!]!
    }

    input ProjectMemberInput {
        projectId: ID!
        userId: ID!
        roles: [String!]!
    }

    type ProjectMember {
        id: ID!
        project: Project!
        user: User!
        roles: [String!]!
    }

    type Query {
        user(id: ID!): User
        userByName(name: String!): User
        userByEmail(email: String!): User
        userSearch(phrase: String, offset: Int = 0, limit: Int = 1000): UserSearch!

        project(id: ID!): Project
        projectByCode(code: String!): Project
        projectSearch(
            phrase: String
            member: String
            offset: Int = 0
            limit: Int = 1000
        ): ProjectSearch!
    }

    type Mutation {
        createUser(user: UserInput!): User!
        updateUser(id: ID!, user: UserInput!): User!

        updateProject(id: ID!, project: ProjectInput!): Project!

        createProjectMember(projectMember: ProjectMemberInput!): ProjectMember!
        updateProjectMemberRoles(id: ID!, roles: [String!]): ProjectMember!
        deleteProjectMember(id: ID!): Boolean!
    }
`;
