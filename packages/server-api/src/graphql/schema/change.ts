import { IResolvers } from 'apollo-server-koa';
import gql from 'graphql-tag';
import {
    ChangePartFork,
    ChangePartCreate,
    ChangePartRevision,
    Change,
    ChangeInput,
    ChangeUpdateInput,
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

export const typeDefs = gql`
    enum ChangeCycle {
        PREPARATION
        EVALUATION
        ENGINEERING
        CANCELLED
    }

    """
    An input to describe a part creation in a Change
    """
    input ChangePartCreateInput {
        familyId: ID!
        version: String!
        designation: String!
        comments: String
    }

    """
    An input to describe a part change in a Change
    """
    input ChangePartForkInput {
        partId: ID!
        version: String!
        designation: String
        comments: String
    }

    """
    An input to describe a part revision in a Change
    """
    input ChangePartRevisionInput {
        partId: ID!
        designation: String
        comments: String
    }

    """
    An input to create Change
    """
    input ChangeInput {
        description: String
        partCreations: [ChangePartCreateInput!]
        partForks: [ChangePartForkInput!]
        partRevisions: [ChangePartRevisionInput!]
        reviewerIds: [ID!]
    }

    """
    An input to update Change
    """
    input ChangeUpdateInput {
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
        change: Change!
        family: PartFamily!
        version: String!
        designation: String!
        comments: String
    }

    type ChangePartFork {
        id: ID!
        change: Change!
        part: Part!
        version: String!
        designation: String
        comments: String
    }

    type ChangePartRevision {
        id: ID!
        change: Change!
        part: Part!
        designation: String
        comments: String
    }

    """
    Input to review a change
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

        change: Change!
    }

    """
    A Change gathers all informations about a requeste change.
    It helps to inform and gather approval of the involved persons.
    """
    type Change implements Tracked {
        id: ID!
        name: String!
        description: String
        cycle: ChangeCycle!
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
        change(id: ID!): Change
    }

    extend type Mutation {
        changeCreate(input: ChangeInput!): Change!
        changeUpdate(id: ID!, input: ChangeUpdateInput!): Change!
        """
        Submit a change to review in the EVALUATION cycle.
        The change must be in PREPARATION cycle and will be placed
        in the EVALUATION cycle to allow reviews to start.
        """
        changeSubmit(id: ID!): Change!
        """
        Withdraw a change from the EVALUATION cycle.
        The change must be in EVALUATION cycle and will be placed
        back in the PREPARATION cycle to allow changes to be made.
        """
        changeWithdraw(id: ID!): Change!
        """
        Edit a review for a change.
        The logged-in user must be a reviewer of the given change.
        Previous reviews of the same user and same change are erased.
        """
        changeReview(id: ID!, input: ChangeReviewInput!): ChangeReview!

        """
        Approve a change and apply changes.
        Can only be done only from EVALUATION cycle in approved or reserved state.
        If all changes apply succesfully, the change is placed into ENGINEERING cycle.
        Once a change is approved, it cannot be cancelled.
        """
        changeApprove(id: ID!): Change!

        """
        Cancel a change.
        Can be done from any cycle other than ENGINEERING.
        Will place the change in the CANCELLED cycle.
        Cannot be undone.
        """
        changeCancel(id: ID!): Change!
    }
`;

export function buildResolvers(control: ControllerSet): IResolvers {
    return {
        ChangeReview: {
            async change({ change }: ChangeReview, args, ctx: GqlContext): Promise<Change> {
                const req = await control.change.change(ctx, change.id);
                return req;
            },
        },

        Change: {
            partCreations({ id }: Change, args, ctx: GqlContext): Promise<ChangePartCreate[]> {
                return control.change.partCreations(ctx, id);
            },
            partForks({ id }: Change, args, ctx: GqlContext): Promise<ChangePartFork[]> {
                return control.change.partChanges(ctx, id);
            },
            partRevisions({ id }: Change, args, ctx: GqlContext): Promise<ChangePartRevision[]> {
                return control.change.partRevisions(ctx, id);
            },
            reviews({ id }: Change, args, ctx: GqlContext): Promise<ChangeReview[]> {
                return control.change.reviews(ctx, id);
            },

            createdParts({ id }: Change, args, ctx: GqlContext): Promise<Part[]> {
                return control.change.createdParts(ctx, id);
            },
            revisedParts({ id }: Change, args, ctx: GqlContext): Promise<PartRevision[]> {
                return control.change.revisedParts(ctx, id);
            },

            ...resolveTracked,
        },
        Query: {
            change(parent, { id }: { id: Id }, ctx: GqlContext): Promise<Change> {
                return control.change.change(ctx, id);
            },
        },
        Mutation: {
            changeCreate(
                parent,
                { input }: { input: ChangeInput },
                ctx: GqlContext
            ): Promise<Change> {
                return control.change.create(ctx, input);
            },

            changeUpdate(
                parent,
                { id, input }: { id: Id; input: ChangeUpdateInput },
                ctx: GqlContext
            ): Promise<Change> {
                return control.change.update(ctx, id, input);
            },

            changeSubmit(parent, { id }: HasId, ctx: GqlContext): Promise<Change> {
                return control.change.submit(ctx, id);
            },

            changeWithdraw(parent, { id }: HasId, ctx: GqlContext): Promise<Change> {
                return control.change.withdraw(ctx, id);
            },

            changeReview(
                parent,
                { id, input }: { id: Id; input: ChangeReviewInput },
                ctx: GqlContext
            ): Promise<ChangeReview> {
                return control.change.review(ctx, id, input);
            },

            changeApprove(parent, { id }: Change, ctx: GqlContext): Promise<Change> {
                return control.change.approve(ctx, id);
            },

            changeCancel(parent, { id }: Change, ctx: GqlContext): Promise<Change> {
                return control.change.cancel(ctx, id);
            },
        },
    };
}
