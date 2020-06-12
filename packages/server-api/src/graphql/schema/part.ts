import { IResolvers } from 'apollo-server-koa';
import gql from 'graphql-tag';
import {
    Id,
    Part,
    PartApproval,
    PartApprovalUpdateInput,
    PartCreateInput,
    PartFamily,
    PartFamilyInput,
    PartForkInput,
    PartRevision,
    PartRevisionInput,
    PartUpdateInput,
    PartValidation,
    PartValidationCloseInput,
    PartValidationInput,
    User,
} from '@engspace/core';
import { ControllerSet } from '../../control';
import { GqlContext } from '../context';
import { resolveTracked } from '.';

export const typeDefs = gql`
    enum PartCycle {
        EDITION
        VALIDATION
        RELEASE
        OBSOLETE
        CANCELLED
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

    extend type Query {
        partFamily(id: ID!): PartFamily

        part(id: ID!): Part
        partRevision(id: ID!): PartRevision
        partValidation(id: ID!): PartValidation
        partApproval(id: ID!): PartApproval
    }

    extend type Mutation {
        partFamilyCreate(input: PartFamilyInput!): PartFamily!
        partFamilyUpdate(id: ID!, input: PartFamilyInput!): PartFamily!

        partCreate(input: PartCreateInput!): PartRevision!
        partFork(input: PartForkInput!): PartRevision!
        partUpdate(id: ID!, input: PartUpdateInput!): Part!
        partRevise(input: PartRevisionInput!): PartRevision!
        partStartValidation(input: PartValidationInput!): PartValidation!
        partUpdateApproval(id: ID!, input: PartApprovalUpdateInput!): PartApproval!
        partCloseValidation(id: ID!, input: PartValidationCloseInput!): PartValidation!
    }
`;

export function buildResolvers(control: ControllerSet): IResolvers {
    return {
        Part: {
            family({ family }: Part, args, ctx: GqlContext): Promise<PartFamily> {
                return control.partFamily.byId(ctx, family.id);
            },

            ...resolveTracked,
        },

        PartRevision: {
            part({ part }: PartRevision, args, ctx: GqlContext): Promise<Part> {
                return control.part.partById(ctx, part.id);
            },

            ...resolveTracked,
        },

        PartValidation: {
            partRev({ partRev }: PartValidation, args, ctx: GqlContext): Promise<PartRevision> {
                return control.part.revisionById(ctx, partRev.id);
            },

            approvals({ id }: PartValidation, args, ctx: GqlContext): Promise<PartApproval[]> {
                return control.part.approvalsByValidationId(ctx, id);
            },

            ...resolveTracked,
        },

        PartApproval: {
            validation(
                { validation }: PartApproval,
                args,
                ctx: GqlContext
            ): Promise<PartValidation> {
                return control.part.validationById(ctx, validation.id);
            },

            assignee({ assignee }: PartApproval, args, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(assignee.id);
            },

            ...resolveTracked,
        },

        Query: {
            partFamily(parent, { id }: { id: Id }, ctx: GqlContext): Promise<PartFamily | null> {
                return control.partFamily.byId(ctx, id);
            },

            part(parent, { id }: { id: Id }, ctx: GqlContext): Promise<Part | null> {
                return control.part.partById(ctx, id);
            },

            partRevision(
                parent,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<PartRevision | null> {
                return control.part.revisionById(ctx, id);
            },

            partValidation(
                parent,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<PartValidation | null> {
                return control.part.validationById(ctx, id);
            },

            partApproval(
                parent,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<PartApproval | null> {
                return control.part.approvalById(ctx, id);
            },
        },
        Mutation: {
            partFamilyCreate(
                parent,
                { input }: { input: PartFamilyInput },
                ctx: GqlContext
            ): Promise<PartFamily> {
                return control.partFamily.create(ctx, input);
            },
            partFamilyUpdate(
                parent,
                { id, input }: { id: Id; input: PartFamilyInput },
                ctx: GqlContext
            ): Promise<PartFamily> {
                return control.partFamily.update(ctx, id, input);
            },

            partCreate(
                parent,
                { input }: { input: PartCreateInput },
                ctx: GqlContext
            ): Promise<PartRevision> {
                return control.part.create(ctx, input);
            },
            partFork(
                parent,
                { input }: { input: PartForkInput },
                ctx: GqlContext
            ): Promise<PartRevision> {
                return control.part.fork(ctx, input);
            },
            partUpdate(
                parent,
                { id, input }: { id: Id; input: PartUpdateInput },
                ctx: GqlContext
            ): Promise<Part> {
                return control.part.updatePart(ctx, id, input);
            },
            partRevise(
                parent,
                { input }: { input: PartRevisionInput },
                ctx: GqlContext
            ): Promise<PartRevision> {
                return control.part.revise(ctx, input);
            },
            partStartValidation(
                parent,
                { input }: { input: PartValidationInput },
                ctx: GqlContext
            ): Promise<PartValidation> {
                return control.part.startValidation(ctx, input);
            },
            partUpdateApproval(
                parent,
                { id, input }: { id: Id; input: PartApprovalUpdateInput },
                ctx: GqlContext
            ): Promise<PartApproval> {
                return control.part.updateApproval(ctx, id, input);
            },
            partCloseValidation(
                parent,
                { id, input }: { id: Id; input: PartValidationCloseInput },
                ctx: GqlContext
            ): Promise<PartValidation> {
                return control.part.closeValidation(ctx, id, input);
            },
        },
    };
}
