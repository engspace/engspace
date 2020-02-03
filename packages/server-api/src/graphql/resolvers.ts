import {
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
    Part,
    PartBase,
    PartFamily,
    PartRevision,
    Project,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    User,
    UserInput,
} from '@engspace/core';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import {
    DocumentControl,
    DocumentRevisionControl,
    MemberControl,
    PartBaseControl,
    PartControl,
    PartFamilyControl,
    PartRevisionControl,
    ProjectControl,
    UserControl,
} from '../controllers';
import { GqlContext } from './context';
import { FileRevision } from 'core/src/schema';

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
            }
            return null;
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
            if (project['code']) {
                return Promise.resolve(project as Project);
            } else {
                return ProjectControl.byId(ctx, project.id);
            }
        },
        user({ user }: ProjectMember, args, ctx: GqlContext): Promise<User> {
            if (user['name']) {
                return Promise.resolve(user as User);
            } else {
                return ctx.loaders.user.load(user.id);
            }
        },
        roles({ id }: ProjectMember, args, ctx: GqlContext): Promise<string[]> {
            return MemberControl.rolesById(ctx, id);
        },
    },

    File: {
        __resolveType(file: File, context, info): string {
            if (typeof file['createdAt'] !== 'undefined') return 'Document';
            else return 'Specification';
        },
    },

    FileRevision: {
        __resolveType(fileRev: FileRevision, context, info): string {
            if (typeof fileRev['status'] !== 'undefined') return 'SpecRevision';
            else return 'DocumentRevision';
        },
    },

    Document: {
        createdBy({ createdBy }: Document, args, ctx: GqlContext): Promise<User> {
            if (createdBy['name']) {
                return Promise.resolve(createdBy as User);
            }
            return ctx.loaders.user.load(createdBy.id);
        },

        checkout({ checkout }: Document, args, ctx: GqlContext): Promise<User | null> {
            if (!checkout) return null;
            if (checkout['name']) {
                return Promise.resolve(checkout as User);
            }
            return ctx.loaders.user.load(checkout.id);
        },

        revisions({ id, revisions }: Document, args, ctx: GqlContext): Promise<DocumentRevision[]> {
            if (revisions) {
                return Promise.resolve(revisions);
            }
            return DocumentRevisionControl.byDocumentId(ctx, id);
        },

        lastRevision(
            { id, lastRevision }: Document,
            args,
            ctx: GqlContext
        ): Promise<DocumentRevision | null> {
            if (lastRevision) {
                return Promise.resolve(lastRevision);
            }
            return DocumentRevisionControl.lastByDocumentId(ctx, id);
        },
    },

    DocumentRevision: {
        document({ document }: DocumentRevision, args, ctx: GqlContext): Promise<Document> {
            if (document['name']) {
                return Promise.resolve(document as Document);
            }
            return DocumentControl.byId(ctx, document.id);
        },
        createdBy({ createdBy }: DocumentRevision, args, ctx: GqlContext): Promise<User> {
            if (createdBy['name']) {
                return Promise.resolve(createdBy as User);
            }
            return ctx.loaders.user.load(createdBy.id);
        },
    },

    PartBase: {
        family({ family }: PartBase, args, ctx: GqlContext): Promise<PartFamily> {
            if (family['code']) {
                return Promise.resolve(family as PartFamily);
            }
            return PartFamilyControl.byId(ctx, family.id);
        },
    },

    Part: {
        base({ base }: Part, args, ctx: GqlContext): Promise<PartBase> {
            if (base['reference']) {
                return Promise.resolve(base as PartBase);
            }
            return PartBaseControl.byId(ctx, base.id);
        },
        createdBy({ createdBy }: Part, args, ctx: GqlContext): Promise<User> {
            if (createdBy['name']) {
                return Promise.resolve(createdBy as User);
            }
            return ctx.loaders.user.load(createdBy.id);
        },
    },

    PartRevision: {
        part({ part }: PartRevision, args, ctx: GqlContext): Promise<Part> {
            if (part['reference']) {
                return Promise.resolve(part as Part);
            }
            return PartControl.byId(ctx, part.id);
        },
        createdBy({ createdBy }: Part, args, ctx: GqlContext): Promise<User> {
            if (createdBy['name']) {
                return Promise.resolve(createdBy as User);
            }
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

        partFamily(parent, { id }: { id: Id }, ctx: GqlContext): Promise<PartFamily | null> {
            return PartFamilyControl.byId(ctx, id);
        },

        partBase(parent, { id }: { id: Id }, ctx: GqlContext): Promise<PartBase | null> {
            return PartBaseControl.byId(ctx, id);
        },

        part(parent, { id }: { id: Id }, ctx: GqlContext): Promise<Part | null> {
            return PartControl.byId(ctx, id);
        },

        partRevision(parent, { id }: { id: Id }, ctx: GqlContext): Promise<PartRevision | null> {
            return PartRevisionControl.byId(ctx, id);
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
        async projectMemberDelete(parent, { id }: { id: Id }, ctx: GqlContext): Promise<boolean> {
            await MemberControl.deleteById(ctx, id);
            return true;
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
            { docRevId, sha1 }: { docRevId: Id; sha1: string },
            ctx: GqlContext
        ): Promise<DocumentRevision> {
            return DocumentRevisionControl.finalizeUpload(ctx, docRevId, sha1);
        },
    },
};
