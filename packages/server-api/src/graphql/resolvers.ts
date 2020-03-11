import {
    DateTime,
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
    PartFamily,
    PartFamilyInput,
    Project,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    User,
    UserInput,
    PartBase,
    PartBaseInput,
} from '@engspace/core';
import { UserInputError } from 'apollo-server-koa';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import {
    DocumentControl,
    DocumentRevisionControl,
    MemberControl,
    PartFamilyControl,
    ProjectControl,
    UserControl,
    PartBaseControl,
} from '../controllers';
import { GqlContext } from './context';

export const resolvers = {
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
                    throw new UserInputError(`Cannot read DateTime from ${ast.kind}: ${ast.value}`);
                }
                return ms;
            }
            throw new UserInputError(`Cannot read DateTime from ${ast.kind}`);
        },
    }),

    User: {
        async roles({ id, roles }: User, args, ctx: GqlContext): Promise<string[]> {
            if (roles) return roles;
            return UserControl.rolesById(ctx, id);
        },
        membership({ id }: User, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return MemberControl.byUserId(ctx, id);
        },
    },

    Project: {
        members({ id }: Project, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return MemberControl.byProjectId(ctx, id);
        },
    },

    ProjectMember: {
        project({ project }: ProjectMember, args, ctx: GqlContext): Promise<Project> {
            return ProjectControl.byId(ctx, project.id);
        },
        user({ user }: ProjectMember, args, ctx: GqlContext): Promise<User> {
            return ctx.loaders.user.load(user.id);
        },
        roles({ id }: ProjectMember, args, ctx: GqlContext): Promise<string[]> {
            return MemberControl.rolesById(ctx, id);
        },
    },

    PartBase: {
        family({ family }: PartBase, args, ctx: GqlContext): Promise<PartFamily> {
            return PartFamilyControl.byId(ctx, family.id);
        },
        createdBy({ createdBy }: PartBase, args, ctx: GqlContext): Promise<User> {
            return ctx.loaders.user.load(createdBy.id);
        },
        updatedBy({ updatedBy }: PartBase, args, ctx: GqlContext): Promise<User> {
            return updatedBy ? ctx.loaders.user.load(updatedBy.id) : null;
        },
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
            return DocumentRevisionControl.byDocumentId(ctx, id);
        },

        lastRevision({ id }: Document, args, ctx: GqlContext): Promise<DocumentRevision | null> {
            return DocumentRevisionControl.lastByDocumentId(ctx, id);
        },
    },

    DocumentRevision: {
        document({ document }: DocumentRevision, args, ctx: GqlContext): Promise<Document> {
            return DocumentControl.byId(ctx, document.id);
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
            return UserControl.byName(ctx, name);
        },
        userByEmail(parent, { email }, ctx: GqlContext): Promise<User> {
            return UserControl.byEmail(ctx, email);
        },
        userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: User[] }> {
            const { search, offset, limit } = args;
            return UserControl.search(ctx, search, { offset, limit });
        },

        project(parent, { id }, ctx: GqlContext): Promise<Project> {
            return ProjectControl.byId(ctx, id);
        },
        projectByCode(parent, { code }, ctx: GqlContext): Promise<Project> {
            return ProjectControl.byCode(ctx, code);
        },
        projectSearch(
            parent,
            args,
            ctx: GqlContext
        ): Promise<{ count: number; projects: Project[] }> {
            const { search, offset, limit } = args;
            return ProjectControl.search(ctx, search, { offset, limit });
        },

        projectMember(parent, { id }: { id: Id }, ctx: GqlContext): Promise<ProjectMember | null> {
            return MemberControl.byId(ctx, id);
        },

        projectMemberByProjectAndUserId(
            parent,
            { projectId, userId }: { projectId: Id; userId: Id },
            ctx: GqlContext
        ): Promise<ProjectMember | null> {
            return MemberControl.byProjectAndUserId(ctx, projectId, userId);
        },

        partFamily(parent, { id }: { id: Id }, ctx: GqlContext): Promise<PartFamily | null> {
            return PartFamilyControl.byId(ctx, id);
        },

        partBase(parent, { id }: { id: Id }, ctx: GqlContext): Promise<PartBase | null> {
            return PartBaseControl.byId(ctx, id);
        },

        document(parent, { id }: { id: Id }, ctx: GqlContext): Promise<Document | null> {
            return DocumentControl.byId(ctx, id);
        },
        documentSearch(
            parent,
            { search, offset, limit }: { search: string; offset: number; limit: number },
            ctx: GqlContext
        ): Promise<DocumentSearch> {
            return DocumentControl.search(ctx, search, offset, limit);
        },
        documentRevision(
            parent,
            { id }: { id: Id },
            ctx: GqlContext
        ): Promise<DocumentRevision | null> {
            return DocumentRevisionControl.byId(ctx, id);
        },

        testDateTimeToIso8601(parent, { dt }: { dt: DateTime }): Promise<string> {
            const date = new Date(dt);
            return Promise.resolve(date.toISOString());
        },
    },

    Mutation: {
        async userCreate(parent, { user }: { user: UserInput }, ctx: GqlContext): Promise<User> {
            return UserControl.create(ctx, user);
        },
        async userUpdate(
            parent,
            { id, user }: { id: Id; user: UserInput },
            ctx: GqlContext
        ): Promise<User> {
            return UserControl.update(ctx, id, user);
        },

        async projectCreate(
            parent,
            { project }: { project: ProjectInput },
            ctx: GqlContext
        ): Promise<Project> {
            return ProjectControl.create(ctx, project);
        },
        async projectUpdate(
            parent,
            { id, project }: { id: Id; project: ProjectInput },
            ctx: GqlContext
        ): Promise<Project> {
            return ProjectControl.update(ctx, id, project);
        },

        async projectMemberCreate(
            parent,
            { projectMember }: { projectMember: ProjectMemberInput },
            ctx: GqlContext
        ): Promise<ProjectMember> {
            return MemberControl.create(ctx, projectMember);
        },
        async projectMemberUpdateRoles(
            parent,
            { id, roles }: { id: Id; roles: string[] },
            ctx: GqlContext
        ): Promise<ProjectMember> {
            return MemberControl.updateRolesById(ctx, id, roles);
        },
        async projectMemberDelete(
            parent,
            { id }: { id: Id },
            ctx: GqlContext
        ): Promise<ProjectMember> {
            return MemberControl.deleteById(ctx, id);
        },

        async partFamilyCreate(
            parent,
            { partFamily }: { partFamily: PartFamilyInput },
            ctx: GqlContext
        ): Promise<PartFamily> {
            return PartFamilyControl.create(ctx, partFamily);
        },

        async partFamilyUpdate(
            parent,
            { id, partFamily }: { id: Id; partFamily: PartFamilyInput },
            ctx: GqlContext
        ): Promise<PartFamily> {
            return PartFamilyControl.update(ctx, id, partFamily);
        },

        async partBaseCreate(
            parent,
            { partBase }: { partBase: PartBaseInput },
            ctx: GqlContext
        ): Promise<PartBase> {
            return PartBaseControl.create(ctx, partBase);
        },

        async partBaseUpdate(
            parent,
            { id, partBase }: { id: Id; partBase: PartBaseInput },
            ctx: GqlContext
        ): Promise<PartBase> {
            return PartBaseControl.update(ctx, id, partBase);
        },

        async documentCreate(
            parent,
            { document }: { document: DocumentInput },
            ctx: GqlContext
        ): Promise<Document> {
            return DocumentControl.create(ctx, document);
        },

        async documentCheckout(
            parent,
            { id, revision }: { id: Id; revision: number },
            ctx: GqlContext
        ): Promise<Document> {
            return DocumentControl.checkout(ctx, id, revision);
        },

        async documentDiscardCheckout(
            parent,
            { id }: { id: Id },
            ctx: GqlContext
        ): Promise<Document> {
            return DocumentControl.discardCheckout(ctx, id);
        },

        async documentRevise(
            parent,
            { documentRevision }: { documentRevision: DocumentRevisionInput },
            ctx: GqlContext
        ): Promise<DocumentRevision> {
            return DocumentRevisionControl.create(ctx, documentRevision);
        },

        async documentRevisionCheck(
            parent,
            { id, sha1 }: { id: Id; sha1: string },
            ctx: GqlContext
        ): Promise<DocumentRevision> {
            return DocumentRevisionControl.finalizeUpload(ctx, id, sha1);
        },
    },
};
