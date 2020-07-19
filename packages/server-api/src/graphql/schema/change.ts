import { IResolvers } from 'apollo-server-koa';
import gql from 'graphql-tag';
import {
    ChangePartFork,
    ChangePartCreate,
    ChangePartRevision,
    ChangeRequest,
    ChangeRequestInput,
    ChangeRequestUpdateInput,
    ChangeReview,
    ChangeReviewInput,
    HasId,
    Id,
    Part,
    PartRevision,
} from '@engspace/core';
import { ControllerSet } from '../../control';
import { GqlContext } from '../context';
import { resolveTracked } from '.';

export default {
    typeDefs: gql`
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
        input ChangePartForkInput {
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
            partForks: [ChangePartForkInput!]
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

            partForksAdd: [ChangePartForkInput!]
            partForksRem: [ID!]

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

        type ChangePartFork {
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
            name: String!
            description: String
            cycle: ChangeRequestCycle!
            state: ApprovalDecision

            partCreations: [ChangePartCreate!]
            partForks: [ChangePartFork!]
            partRevisions: [ChangePartRevision!]
            reviews: [ChangeReview!]

            """
            The parts created by this change.
            After approval, this field is populated with the
            parts that are created or forked by this change.
            """
            createdParts: [Part!]
            """
            The revisions made in this change.
            After approval, this field is populated with the
            revisions created by this change.
            """
            revisedParts: [PartRevision!]

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
            Submit a change request to review in the VALIDATION cycle.
            The change request must be in EDITION cycle and will be placed
            in the VALIDATION cycle to allow reviews to start.
            """
            changeRequestSubmit(id: ID!): ChangeRequest!
            """
            Withdraw a change request from the VALIDATION cycle.
            The change request must be in VALIDATION cycle and will be placed
            back in the EDITION cycle to allow changes to be made.
            """
            changeRequestWithdraw(id: ID!): ChangeRequest!
            """
            Edit a review for a change request.
            The logged-in user must be a reviewer of the given change request.
            Previous reviews of the same user and same change request are erased.
            """
            changeRequestReview(id: ID!, input: ChangeReviewInput!): ChangeReview!

            """
            Approve a change request and apply changes.
            Can only be done only from VALIDATION cycle in approved or reserved state.
            If all changes apply succesfully, the change is placed into APPROVED cycle.
            Once a change is approved, it cannot be cancelled.
            """
            changeRequestApprove(id: ID!): ChangeRequest!

            """
            Cancel a change request.
            Can be done from any cycle other than APPROVED.
            Will place the change in the CANCELLED cycle.
            Cannot be undone.
            """
            changeRequestCancel(id: ID!): ChangeRequest!
        }
    `,

    buildResolvers(control: ControllerSet): IResolvers {
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
                partForks({ id }: ChangeRequest, args, ctx: GqlContext): Promise<ChangePartFork[]> {
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

                createdParts({ id }: ChangeRequest, args, ctx: GqlContext): Promise<Part[]> {
                    return control.change.requestCreatedParts(ctx, id);
                },
                revisedParts(
                    { id }: ChangeRequest,
                    args,
                    ctx: GqlContext
                ): Promise<PartRevision[]> {
                    return control.change.requestRevisedParts(ctx, id);
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
                    return control.change.requestCreate(ctx, input);
                },

                changeRequestUpdate(
                    parent,
                    { id, input }: { id: Id; input: ChangeRequestUpdateInput },
                    ctx: GqlContext
                ): Promise<ChangeRequest> {
                    return control.change.requestUpdate(ctx, id, input);
                },

                changeRequestSubmit(
                    parent,
                    { id }: HasId,
                    ctx: GqlContext
                ): Promise<ChangeRequest> {
                    return control.change.requestSubmit(ctx, id);
                },

                changeRequestWithdraw(
                    parent,
                    { id }: HasId,
                    ctx: GqlContext
                ): Promise<ChangeRequest> {
                    return control.change.requestWithdraw(ctx, id);
                },

                changeRequestReview(
                    parent,
                    { id, input }: { id: Id; input: ChangeReviewInput },
                    ctx: GqlContext
                ): Promise<ChangeReview> {
                    return control.change.requestReview(ctx, id, input);
                },

                changeRequestApprove(
                    parent,
                    { id }: ChangeRequest,
                    ctx: GqlContext
                ): Promise<ChangeRequest> {
                    return control.change.requestApprove(ctx, id);
                },

                changeRequestCancel(
                    parent,
                    { id }: ChangeRequest,
                    ctx: GqlContext
                ): Promise<ChangeRequest> {
                    return control.change.requestCancel(ctx, id);
                },
            },
        };
    },
};
