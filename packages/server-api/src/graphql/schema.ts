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

    enum ApprovalState {
        PENDING
        REJECTED
        RESERVED
        APPROVED
    }

    enum ValidationResult {
        RELEASE
        TRY_AGAIN
        CANCEL
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
    input PartCreateNewInput {
        familyId: ID!
        initialVersion: String!
        designation: String!
    }

    """
    An input to fork a part to another version:
     - sharing same PartBase
     - new Part (with version)
     - new PartRevision (1)
    """
    input PartForkInput {
        partId: ID!
        version: String
        designation: String
    }

    """
    An input to update a part
    """
    input PartUpdateInput {
        designation: String!
    }

    """
    An input to revise a part:
     - sharing same PartBase
     - sharing same Part
     - new PartRevision
    """
    input PartRevisionInput {
        partId: ID!
        designation: String
    }

    """
    An input that starts a validation process
    """
    input PartValidationInput {
        partRevId: ID!
        requiredApprovals: [PartApprovalInput!]!
    }

    """
    An input that initiate the approval of a part by a user
    """
    input PartApprovalInput {
        assigneeId: ID!
    }

    """
    An input that sets the approval decision
    """
    input PartApprovalUpdateInput {
        decision: ApprovalState!
        comments: String
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

    type PartValidation implements Tracked {
        id: ID!
        partRev: PartRevision!
        state: ApprovalState!
        approvals: [PartApproval!]!
        result: ValidationResult
        comments: String
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!
    }

    type PartApproval implements Tracked {
        id: ID!
        validation: PartValidation!
        assignee: User!
        state: ApprovalState!
        comments: String
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
        partValidation(id: ID!): PartValidation
        partApproval(id: ID!): PartApproval

        document(id: ID!): Document
        documentSearch(search: String, offset: Int = 0, limit: Int = 1000): DocumentSearch!
        documentRevision(id: ID!): DocumentRevision

        testDateTimeToIso8601(dt: DateTime!): String!
    }

    type Mutation {
        userCreate(input: UserInput!): User!
        userUpdate(id: ID!, input: UserInput!): User!

        projectCreate(input: ProjectInput!): Project!
        projectUpdate(id: ID!, input: ProjectInput!): Project!
        projectAddMember(input: ProjectMemberInput!): ProjectMember!
        projectUpdateMemberRoles(memberId: ID!, roles: [String!]): ProjectMember!
        projectDeleteMember(memberId: ID!): ProjectMember!

        partFamilyCreate(input: PartFamilyInput!): PartFamily!
        partFamilyUpdate(id: ID!, input: PartFamilyInput!): PartFamily!

        partCreateNew(input: PartCreateNewInput!): PartRevision!
        partFork(input: PartForkInput!): PartRevision!
        partUpdate(id: ID!, input: PartUpdateInput!): Part!
        partRevise(input: PartRevisionInput!): PartRevision!
        partStartValidation(input: PartValidationInput!): PartValidation!
        partApprovalUpdate(id: ID!, input: PartApprovalUpdateInput!): PartApproval!

        documentCreate(input: DocumentInput!): Document!
        documentCheckout(id: ID!, revision: Int!): Document!
        documentDiscardCheckout(id: ID!): Document!
        documentRevise(input: DocumentRevisionInput): DocumentRevision!
        documentRevisionCheck(id: ID!, sha1: String!): DocumentRevision!
    }
`;
