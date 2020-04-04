import {
    DateTime,
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
    Part,
    PartApproval,
    PartCreateInput,
    PartFamily,
    PartFamilyInput,
    PartForkInput,
    PartRevision,
    PartRevisionInput,
    PartUpdateInput,
    PartValidation,
    Project,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    Tracked,
    User,
    UserInput,
    PartValidationInput,
    PartApprovalUpdateInput,
    PartValidationCloseInput,
    ChangeRequest,
    ChangePartCreate,
    ChangePartChange,
    ChangePartRevision,
    ChangeReview,
} from '@engspace/core';
import { IResolvers, UserInputError } from 'apollo-server-koa';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import { ControllerSet } from '../control';
import { GqlContext } from './context';

export const resolveTracked = {
    createdBy({ createdBy }: Tracked, args, ctx: GqlContext): Promise<User> {
        return ctx.loaders.user.load(createdBy.id);
    },
    updatedBy({ updatedBy }: Tracked, args, ctx: GqlContext): Promise<User> {
        return ctx.loaders.user.load(updatedBy.id);
    },
};

export function buildResolvers(control: ControllerSet): IResolvers {
    return {
        DateTime: new GraphQLScalarType({
            name: 'DateTime',
            description: 'DateTime sent over the wire as milliseconds since epoch',
            serialize(value: number): number {
                return value;
            },
            parseValue(value: number): number {
                return value;
            },
            parseLiteral(ast: ValueNode): number | null {
                if (ast.kind === Kind.INT) {
                    return parseInt(ast.value);
                } else if (ast.kind === Kind.STRING) {
                    const date = new Date(ast.value);
                    const ms = date.getTime();
                    if (isNaN(ms)) {
                        throw new UserInputError(
                            `Cannot read DateTime from ${ast.kind}: ${ast.value}`
                        );
                    }
                    return ms;
                }
                throw new UserInputError(`Cannot read DateTime from ${ast.kind}`);
            },
        }),

        Tracked: {
            __resolveType(tracked): string {
                if (tracked.ref) return 'Part';
                return null;
            },
        },

        User: {
            async roles({ id, roles }: User, args, ctx: GqlContext): Promise<string[]> {
                if (roles) return roles;
                return control.user.rolesById(ctx, id);
            },
            membership({ id }: User, args, ctx: GqlContext): Promise<ProjectMember[]> {
                return control.project.membersByUserId(ctx, id);
            },
        },

        Project: {
            members({ id }: Project, args, ctx: GqlContext): Promise<ProjectMember[]> {
                return control.project.membersByProjectId(ctx, id);
            },
        },

        ProjectMember: {
            project({ project }: ProjectMember, args, ctx: GqlContext): Promise<Project> {
                return control.project.byId(ctx, project.id);
            },
            user({ user }: ProjectMember, args, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(user.id);
            },
            roles({ id }: ProjectMember, args, ctx: GqlContext): Promise<string[]> {
                return control.project.memberRoles(ctx, id);
            },
        },

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

        Document: {
            createdBy({ createdBy }: Document, args, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(createdBy.id);
            },

            checkout({ checkout }: Document, args, ctx: GqlContext): Promise<User | null> {
                if (!checkout) return null;
                return ctx.loaders.user.load(checkout.id);
            },

            revisions({ id }: Document, args, ctx: GqlContext): Promise<DocumentRevision[]> {
                return control.documentRevision.byDocumentId(ctx, id);
            },

            lastRevision(
                { id }: Document,
                args,
                ctx: GqlContext
            ): Promise<DocumentRevision | null> {
                return control.documentRevision.lastByDocumentId(ctx, id);
            },
        },

        DocumentRevision: {
            document({ document }: DocumentRevision, args, ctx: GqlContext): Promise<Document> {
                return control.document.byId(ctx, document.id);
            },
            createdBy({ createdBy }: DocumentRevision, args, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(createdBy.id);
            },
        },

        Query: {
            user(parent, { id }, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(id);
            },
            userByName(parent, { name }, ctx: GqlContext): Promise<User> {
                return control.user.byName(ctx, name);
            },
            userByEmail(parent, { email }, ctx: GqlContext): Promise<User> {
                return control.user.byEmail(ctx, email);
            },
            userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: User[] }> {
                const { search, offset, limit } = args;
                return control.user.search(ctx, search, { offset, limit });
            },

            project(parent, { id }, ctx: GqlContext): Promise<Project> {
                return control.project.byId(ctx, id);
            },
            projectByCode(parent, { code }, ctx: GqlContext): Promise<Project> {
                return control.project.byCode(ctx, code);
            },
            projectSearch(
                parent,
                args,
                ctx: GqlContext
            ): Promise<{ count: number; projects: Project[] }> {
                const { search, offset, limit } = args;
                return control.project.search(ctx, search, { offset, limit });
            },

            projectMember(
                parent,
                { memberId }: { memberId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember | null> {
                return control.project.memberById(ctx, memberId);
            },

            projectMemberByProjectAndUserId(
                parent,
                { projectId, userId }: { projectId: Id; userId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember | null> {
                return control.project.memberByProjectAndUserId(ctx, projectId, userId);
            },

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

            changeRequest(parent, { id }: { id: Id }, ctx: GqlContext): Promise<ChangeRequest> {
                return control.change.request(ctx, id);
            },

            document(parent, { id }: { id: Id }, ctx: GqlContext): Promise<Document | null> {
                return control.document.byId(ctx, id);
            },
            documentSearch(
                parent,
                { search, offset, limit }: { search: string; offset: number; limit: number },
                ctx: GqlContext
            ): Promise<DocumentSearch> {
                return control.document.search(ctx, search, offset, limit);
            },
            documentRevision(
                parent,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<DocumentRevision | null> {
                return control.documentRevision.byId(ctx, id);
            },

            testDateTimeToIso8601(parent, { dt }: { dt: DateTime }): Promise<string> {
                const date = new Date(dt);
                return Promise.resolve(date.toISOString());
            },
        },

        Mutation: {
            userCreate(parent, { input }: { input: UserInput }, ctx: GqlContext): Promise<User> {
                return control.user.create(ctx, input);
            },
            userUpdate(
                parent,
                { id, input }: { id: Id; input: UserInput },
                ctx: GqlContext
            ): Promise<User> {
                return control.user.update(ctx, id, input);
            },

            projectCreate(
                parent,
                { input }: { input: ProjectInput },
                ctx: GqlContext
            ): Promise<Project> {
                return control.project.create(ctx, input);
            },
            projectUpdate(
                parent,
                { id, input }: { id: Id; input: ProjectInput },
                ctx: GqlContext
            ): Promise<Project> {
                return control.project.update(ctx, id, input);
            },
            projectAddMember(
                parent,
                { input }: { input: ProjectMemberInput },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return control.project.addMember(ctx, input);
            },
            projectUpdateMemberRoles(
                parent,
                { memberId, roles }: { memberId: Id; roles: string[] },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return control.project.updateMemberRoles(ctx, memberId, roles);
            },
            projectDeleteMember(
                parent,
                { memberId }: { memberId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return control.project.deleteMember(ctx, memberId);
            },

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

            documentCreate(
                parent,
                { input }: { input: DocumentInput },
                ctx: GqlContext
            ): Promise<Document> {
                return control.document.create(ctx, input);
            },

            documentCheckout(
                parent,
                { id, revision }: { id: Id; revision: number },
                ctx: GqlContext
            ): Promise<Document> {
                return control.document.checkout(ctx, id, revision);
            },

            documentDiscardCheckout(
                parent,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<Document> {
                return control.document.discardCheckout(ctx, id);
            },

            documentRevise(
                parent,
                { input }: { input: DocumentRevisionInput },
                ctx: GqlContext
            ): Promise<DocumentRevision> {
                return control.documentRevision.create(ctx, input);
            },

            documentRevisionCheck(
                parent,
                { id, sha1 }: { id: Id; sha1: string },
                ctx: GqlContext
            ): Promise<DocumentRevision> {
                return control.documentRevision.finalizeUpload(ctx, id, sha1);
            },
        },
    };
}
