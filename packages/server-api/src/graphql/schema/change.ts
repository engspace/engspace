import { IResolvers } from 'apollo-server-koa';
import gql from 'graphql-tag';
import {
    ChangePartChange,
    ChangePartCreate,
    ChangePartRevision,
    ChangeRequest,
    ChangeRequestInput,
    ChangeRequestUpdateInput,
    ChangeReview,
    ChangeReviewInput,
    HasId,
    Id,
} from '@engspace/core';
import { ControllerSet } from '../../control';
import { GqlContext } from '../context';
import { resolveTracked } from '.';

export const typeDefs = gql`
    enum ChangeRequestCycle {
        EDITION
        VALIDATION
        APPROVED
        CANCELLED
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

    extend type Query {
        changeRequest(id: ID!): ChangeRequest
    }

    extend type Mutation {
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
    }
`;

export function buildResolvers(control: ControllerSet): IResolvers {
    return {
        ChangeReview: {
            async request(
                { request }: ChangeReview,
                args,
                ctx: GqlContext
            ): Promise<ChangeRequest> {
                const req = await control.change.request(ctx, request.id);
                return req;
            },
        },

        ChangeRequest: {
            partCreations(
                { id }: ChangeRequest,
                args,
                ctx: GqlContext
            ): Promise<ChangePartCreate[]> {
                return control.change.requestPartCreations(ctx, id);
            },
            partChanges({ id }: ChangeRequest, args, ctx: GqlContext): Promise<ChangePartChange[]> {
                return control.change.requestPartChanges(ctx, id);
            },
            partRevisions(
                { id }: ChangeRequest,
                args,
                ctx: GqlContext
            ): Promise<ChangePartRevision[]> {
                return control.change.requestPartRevisions(ctx, id);
            },
            reviews({ id }: ChangeRequest, args, ctx: GqlContext): Promise<ChangeReview[]> {
                return control.change.requestReviews(ctx, id);
            },

            ...resolveTracked,
        },
        Query: {
            changeRequest(parent, { id }: { id: Id }, ctx: GqlContext): Promise<ChangeRequest> {
                return control.change.request(ctx, id);
            },
        },
        Mutation: {
            changeRequestCreate(
                parent,
                { input }: { input: ChangeRequestInput },
                ctx: GqlContext
            ): Promise<ChangeRequest> {
                return control.change.createRequest(ctx, input);
            },

            changeRequestUpdate(
                parent,
                { id, input }: { id: Id; input: ChangeRequestUpdateInput },
                ctx: GqlContext
            ): Promise<ChangeRequest> {
                return control.change.updateRequest(ctx, id, input);
            },

            changeRequestStartValidation(
                parent,
                { id }: HasId,
                ctx: GqlContext
            ): Promise<ChangeRequest> {
                return control.change.startValidation(ctx, id);
            },

            changeRequestReview(
                parent,
                { id, input }: { id: Id; input: ChangeReviewInput },
                ctx: GqlContext
            ): Promise<ChangeReview> {
                return control.change.review(ctx, id, input);
            },
        },
    };
}
