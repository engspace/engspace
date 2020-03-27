import { gql } from 'apollo-server-koa';

export const typeDefs = gql`
    scalar DateTime

    enum CycleState {
        EDITION
        VALIDATION
        RELEASE
        OBSOLETE
        CANCELLED
    }

    interface Tracked {
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!
    }

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

    input PartFamilyInput {
        name: String!
        code: String!
    }

    type PartFamily {
        id: ID!
        name: String!
        code: String!
        counter: Int!
    }

    """
    An input to build a new part from scratch:
     - new PartBase
     - new Part (with initial version)
     - new PartRevision (1)
    """
    input NewPartInput {
        familyId: ID!
        initialVersion: String!
        designation: String!
    }

    input PartBaseInput {
        familyId: ID!
        designation: ID!
    }

    input PartBaseUpdateInput {
        designation: ID!
    }

    type PartBase implements Tracked {
        id: ID!
        family: PartFamily!
        baseRef: String!
        designation: String!
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!
    }

    input PartInput {
        baseId: ID!
        designation: String
        version: String!
    }

    input PartUpdateInput {
        designation: String!
    }

    type Part implements Tracked {
        id: ID!
        base: PartBase!
        ref: String!
        designation: String!
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!
    }

    type PartRevision implements Tracked {
        id: ID!
        part: Part!
        revision: Int!
        designation: String!
        cycleState: CycleState!
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!
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
        createdBy: User!
        createdAt: DateTime!
        changeDescription: String
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
        projectMember(memberId: ID!): ProjectMember
        projectMemberByProjectAndUserId(projectId: ID!, userId: ID!): ProjectMember

        partFamily(id: ID!): PartFamily

        partBase(id: ID!): PartBase

        part(id: ID!): Part

        partRevision(id: ID!): PartRevision

        document(id: ID!): Document
        documentSearch(search: String, offset: Int = 0, limit: Int = 1000): DocumentSearch!
        documentRevision(id: ID!): DocumentRevision

        testDateTimeToIso8601(dt: DateTime!): String!
    }

    type Mutation {
        userCreate(user: UserInput!): User!
        userUpdate(id: ID!, user: UserInput!): User!

        projectCreate(project: ProjectInput!): Project!
        projectUpdate(id: ID!, project: ProjectInput!): Project!
        projectAddMember(input: ProjectMemberInput!): ProjectMember!
        projectUpdateMemberRoles(memberId: ID!, roles: [String!]): ProjectMember!
        projectDeleteMember(memberId: ID!): ProjectMember!

        partFamilyCreate(partFamily: PartFamilyInput!): PartFamily!
        partFamilyUpdate(id: ID!, partFamily: PartFamilyInput!): PartFamily!

        partCreateNew(input: NewPartInput): PartRevision!

        partBaseCreate(partBase: PartBaseInput!): PartBase!
        partBaseUpdate(id: ID!, partBase: PartBaseUpdateInput!): PartBase!

        partCreate(input: PartInput!): Part!
        partUpdate(id: ID!, input: PartUpdateInput!): Part!

        documentCreate(document: DocumentInput!): Document!
        documentCheckout(id: ID!, revision: Int!): Document!
        documentDiscardCheckout(id: ID!): Document!
        documentRevise(documentRevision: DocumentRevisionInput): DocumentRevision!
        documentRevisionCheck(id: ID!, sha1: String!): DocumentRevision!
    }
`;
