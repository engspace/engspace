import { gql } from 'apollo-server-koa';

export const typeDefs = gql`
    type Query {
        userSearch(phrase: String, offset: Int = 0, limit: Int = 1000): UserSearch!
        user(id: ID!): User

        projects(phrase: String, offset: Int = 0, limit: Int = 1000): [Project!]!
        project(id: ID!): Project
    }

    type Mutation {
        login(nameOrEmail: String): String
    }

    type User {
        id: ID!
        name: String!
        email: String!
        fullName: String
        roles: [String!]!
    }

    type UserSearch {
        count: Int!
        users: [User!]!
    }

    type Project {
        id: ID!
        name: String!
        code: String!
        description: String
        members: [ProjectMember!]!
    }

    type ProjectMember {
        user: User!
        roles: [String!]!
    }
`;
