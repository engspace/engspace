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
import { EsGqlContext } from '../context';
import { resolveTracked } from '.';

export default {
    typeDefs: gql`
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
    `,

    resolvers: {
        Part: {
            family({ family }: Part, args: unknown, ctx: EsGqlContext): Promise<PartFamily> {
                return ctx.runtime.control.partFamily.byId(ctx, family.id);
            },

            ...resolveTracked,
        },

        PartRevision: {
            part({ part }: PartRevision, args: unknown, ctx: EsGqlContext): Promise<Part> {
                return ctx.runtime.control.part.partById(ctx, part.id);
            },

            ...resolveTracked,
        },

        PartValidation: {
            partRev(
                { partRev }: PartValidation,
                args: unknown,
                ctx: EsGqlContext
            ): Promise<PartRevision> {
                return ctx.runtime.control.part.revisionById(ctx, partRev.id);
            },

            approvals(
                { id }: PartValidation,
                args: unknown,
                ctx: EsGqlContext
            ): Promise<PartApproval[]> {
                return ctx.runtime.control.part.approvalsByValidationId(ctx, id);
            },

            ...resolveTracked,
        },

        PartApproval: {
            validation(
                { validation }: PartApproval,
                args: unknown,
                ctx: EsGqlContext
            ): Promise<PartValidation> {
                return ctx.runtime.control.part.validationById(ctx, validation.id);
            },

            assignee({ assignee }: PartApproval, args: unknown, ctx: EsGqlContext): Promise<User> {
                return ctx.loaders.user.load(assignee.id);
            },

            ...resolveTracked,
        },

        Query: {
            partFamily(
                parent: unknown,
                { id }: { id: Id },
                ctx: EsGqlContext
            ): Promise<PartFamily | null> {
                return ctx.runtime.control.partFamily.byId(ctx, id);
            },

            part(parent: unknown, { id }: { id: Id }, ctx: EsGqlContext): Promise<Part | null> {
                return ctx.runtime.control.part.partById(ctx, id);
            },

            partRevision(
                parent: unknown,
                { id }: { id: Id },
                ctx: EsGqlContext
            ): Promise<PartRevision | null> {
                return ctx.runtime.control.part.revisionById(ctx, id);
            },

            partValidation(
                parent: unknown,
                { id }: { id: Id },
                ctx: EsGqlContext
            ): Promise<PartValidation | null> {
                return ctx.runtime.control.part.validationById(ctx, id);
            },

            partApproval(
                parent: unknown,
                { id }: { id: Id },
                ctx: EsGqlContext
            ): Promise<PartApproval | null> {
                return ctx.runtime.control.part.approvalById(ctx, id);
            },
        },
        Mutation: {
            partFamilyCreate(
                parent: unknown,
                { input }: { input: PartFamilyInput },
                ctx: EsGqlContext
            ): Promise<PartFamily> {
                return ctx.runtime.control.partFamily.create(ctx, input);
            },
            partFamilyUpdate(
                parent: unknown,
                { id, input }: { id: Id; input: PartFamilyInput },
                ctx: EsGqlContext
            ): Promise<PartFamily> {
                return ctx.runtime.control.partFamily.update(ctx, id, input);
            },

            partCreate(
                parent: unknown,
                { input }: { input: PartCreateInput },
                ctx: EsGqlContext
            ): Promise<PartRevision> {
                return ctx.runtime.control.part.create(ctx, input);
            },
            partFork(
                parent: unknown,
                { input }: { input: PartForkInput },
                ctx: EsGqlContext
            ): Promise<PartRevision> {
                return ctx.runtime.control.part.fork(ctx, input);
            },
            partUpdate(
                parent: unknown,
                { id, input }: { id: Id; input: PartUpdateInput },
                ctx: EsGqlContext
            ): Promise<Part> {
                return ctx.runtime.control.part.updatePart(ctx, id, input);
            },
            partRevise(
                parent: unknown,
                { input }: { input: PartRevisionInput },
                ctx: EsGqlContext
            ): Promise<PartRevision> {
                return ctx.runtime.control.part.revise(ctx, input);
            },
            partStartValidation(
                parent: unknown,
                { input }: { input: PartValidationInput },
                ctx: EsGqlContext
            ): Promise<PartValidation> {
                return ctx.runtime.control.part.startValidation(ctx, input);
            },
            partUpdateApproval(
                parent: unknown,
                { id, input }: { id: Id; input: PartApprovalUpdateInput },
                ctx: EsGqlContext
            ): Promise<PartApproval> {
                return ctx.runtime.control.part.updateApproval(ctx, id, input);
            },
            partCloseValidation(
                parent: unknown,
                { id, input }: { id: Id; input: PartValidationCloseInput },
                ctx: EsGqlContext
            ): Promise<PartValidation> {
                return ctx.runtime.control.part.closeValidation(ctx, id, input);
            },
        },
    },
};
