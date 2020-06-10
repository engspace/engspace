import { gql } from 'apollo-server-koa';

export const typeDefs = gql`
    scalar DateTime

    enum PartCycle {
        EDITION
        VALIDATION
        RELEASE
        OBSOLETE
        CANCELLED
    }

    enum ApprovalDecision {
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

    enum ChangeRequestCycle {
        EDITION
        VALIDATION
        APPROVED
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
    input PartCreateInput {
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
        decision: ApprovalDecision!
        comments: String
    }

    """
    An input that concludes a validation
    """
    input PartValidationCloseInput {
        result: ValidationResult!
        comments: String
    }

    type Part implements Tracked {
        id: ID!
        family: PartFamily!
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
        cycle: PartCycle!
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!
    }

    type PartValidation implements Tracked {
        id: ID!
        partRev: PartRevision!
        state: ApprovalDecision!
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
        decision: ApprovalDecision!
        comments: String
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!
    }

    """
    An input to describe a part creation in a ChangeRequest
    """
    input ChangePartCreateInput {
        familyId: ID!
        version: String!
        designation: String!
        comments: String
    }

    """
    An input to describe a part change in a ChangeRequest
    """
    input ChangePartChangeInput {
        partId: ID!
        version: String!
        designation: String
        comments: String
    }

    """
    An input to describe a part revision in a ChangeRequest
    """
    input ChangePartRevisionInput {
        partId: ID!
        designation: String
        comments: String
    }

    """
    An input to create ChangeRequest
    """
    input ChangeRequestInput {
        description: String
        partCreations: [ChangePartCreateInput!]
        partChanges: [ChangePartChangeInput!]
        partRevisions: [ChangePartRevisionInput!]
        reviewerIds: [ID!]
    }

    """
    An input to update ChangeRequest
    """
    input ChangeRequestUpdateInput {
        description: String

        partCreationsAdd: [ChangePartCreateInput!]
        partCreationsRem: [ID!]

        partChangesAdd: [ChangePartChangeInput!]
        partChangesRem: [ID!]

        partRevisionsAdd: [ChangePartRevisionInput!]
        partRevisionsRem: [ID!]

        reviewerIdsAdd: [ID!]
        reviewsRem: [ID!]
    }

    type ChangePartCreate {
        id: ID!
        request: ChangeRequest!
        family: PartFamily!
        version: String!
        designation: String!
        comments: String
    }

    type ChangePartChange {
        id: ID!
        request: ChangeRequest!
        part: Part!
        version: String!
        designation: String
        comments: String
    }

    type ChangePartRevision {
        id: ID!
        request: ChangeRequest!
        part: Part!
        designation: String
        comments: String
    }

    """
    Input to review a change request
    """
    input ChangeReviewInput {
        decision: ApprovalDecision!
        comments: String
    }

    type ChangeReview implements Tracked {
        id: ID!
        assignee: User!
        decision: ApprovalDecision!
        comments: String
        createdBy: User!
        createdAt: DateTime!
        updatedBy: User!
        updatedAt: DateTime!

        request: ChangeRequest!
    }

    """
    A ChangeRequest gathers all informations about a requeste change.
    It helps to inform and gather approval of the involved persons.
    """
    type ChangeRequest implements Tracked {
        id: ID!
        description: String
        cycle: ChangeRequestCycle!
        state: ApprovalDecision

        partCreations: [ChangePartCreate!]
        partChanges: [ChangePartChange!]
        partRevisions: [ChangePartRevision!]
        reviews: [ChangeReview!]

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

        part(id: ID!): Part
        partRevision(id: ID!): PartRevision
        partValidation(id: ID!): PartValidation
        partApproval(id: ID!): PartApproval

        changeRequest(id: ID!): ChangeRequest

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

        partCreate(input: PartCreateInput!): PartRevision!
        partFork(input: PartForkInput!): PartRevision!
        partUpdate(id: ID!, input: PartUpdateInput!): Part!
        partRevise(input: PartRevisionInput!): PartRevision!
        partStartValidation(input: PartValidationInput!): PartValidation!
        partUpdateApproval(id: ID!, input: PartApprovalUpdateInput!): PartApproval!
        partCloseValidation(id: ID!, input: PartValidationCloseInput!): PartValidation!

        changeRequestCreate(input: ChangeRequestInput!): ChangeRequest!
        changeRequestUpdate(id: ID!, input: ChangeRequestUpdateInput!): ChangeRequest!
        """
        Start the validation process of a change request.
        The change request must be in edition mode.
        """
        changeRequestStartValidation(id: ID!): ChangeRequest!
        """
        Edit a review for a change request.
        The logged-in user must be a reviewer of the given change request.
        Previous reviews of the same user and same change request are erased.
        """
        changeRequestReview(id: ID!, input: ChangeReviewInput!): ChangeReview!

        documentCreate(input: DocumentInput!): Document!
        documentCheckout(id: ID!, revision: Int!): Document!
        documentDiscardCheckout(id: ID!): Document!
        documentRevise(input: DocumentRevisionInput): DocumentRevision!
        documentRevisionCheck(id: ID!, sha1: String!): DocumentRevision!
    }
`;
