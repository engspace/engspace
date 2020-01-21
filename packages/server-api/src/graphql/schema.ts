import { gql } from 'apollo-server-koa';

export const typeDefs = gql`
    scalar DateTime

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
        roles: [String!]
    }
    type ProjectMember {
        id: ID!
        project: Project!
        user: User!
        roles: [String!]!
    }

    input DocumentInput {
        name: String!
        description: String
        initialCheckout: Boolean
    }
    type Document {
        id: ID!
        name: String!
        description: String
        createdBy: User!
        createdAt: DateTime!
        checkout: User

        revisions: [DocumentRevision!]!
        lastRevision: DocumentRevision
    }
    type DocumentSearch {
        count: Int!
        documents: [Document!]!
    }

    input DocumentRevisionInput {
        documentId: ID!
        filename: String!
        filesize: Int!
        changeDescription: String
        retainCheckout: Boolean
    }

    type DocumentRevision {
        id: ID!
        document: Document!
        revision: Int!
        filename: String!
        filesize: Int!
        changeDescription: String
        author: User!
        createdAt: DateTime!
        uploaded: Int
        sha1: String
    }

    type Query {
        user(id: ID!): User
        userByName(name: String!): User
        userByEmail(email: String!): User
        userSearch(search: String, offset: Int = 0, limit: Int = 1000): UserSearch!

        project(id: ID!): Project
        projectByCode(code: String!): Project
        projectSearch(search: String, offset: Int = 0, limit: Int = 1000): ProjectSearch!

        projectMember(id: ID!): ProjectMember
        projectMemberByProjectAndUserId(projectId: ID!, userId: ID!): ProjectMember

        document(id: ID!): Document
        documentSearch(search: String, offset: Int = 0, limit: Int = 1000): DocumentSearch!
        documentRevision(id: ID!): DocumentRevision
    }

    type Mutation {
        userCreate(user: UserInput!): User!
        userUpdate(id: ID!, user: UserInput!): User!

        projectCreate(project: ProjectInput!): Project!
        projectUpdate(id: ID!, project: ProjectInput!): Project!

        projectMemberCreate(projectMember: ProjectMemberInput!): ProjectMember!
        projectMemberUpdateRoles(id: ID!, roles: [String!]): ProjectMember!
        projectMemberDelete(id: ID!): Boolean!

        documentCreate(document: DocumentInput): Document!
        documentCheckout(id: ID!, revision: Int!): Document!
        documentDiscardCheckout(id: ID!): Document!
        documentRevise(documentRevision: DocumentRevisionInput): DocumentRevision!
        documentRevisionCheck(docRevId: ID!, sha1: String!): DocumentRevision!
    }
`;
