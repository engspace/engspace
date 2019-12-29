import { Id, Project, ProjectMember, ProjectRole, Role, User, UserInput } from '@engspace/core';
import { GqlContext } from '.';
import { ProjectControl, UserControl, MemberControl } from './controllers';

export const resolvers = {
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
            const { phrase, offset, limit } = args;
            return UserControl.search(ctx, phrase, { offset, limit });
        },
        project(parent, { id }, ctx: GqlContext): Promise<Project> {
            return ctx.loaders.project.load(id);
        },
        projectByCode(parent, { code }, ctx: GqlContext): Promise<Project> {
            return ProjectControl.byCode(ctx, code);
        },
        projectSearch(
            parent,
            args,
            ctx: GqlContext
        ): Promise<{ count: number; projects: Project[] }> {
            const { phrase, member, offset, limit } = args;
            return ProjectControl.search(ctx, phrase, member, { offset, limit });
        },
    },
    Mutation: {
        async createUser(parent, { user }: { user: UserInput }, ctx: GqlContext): Promise<User> {
            return UserControl.create(ctx, user);
        },
        async updateUser(
            parent,
            { id, user }: { id: Id; user: UserInput },
            ctx: GqlContext
        ): Promise<User> {
            return UserControl.update(ctx, id, user);
        },

        async updateMember(
            parent,
            { projectId, userId, roles }: { projectId: Id; userId: Id; roles: string[] },
            ctx: GqlContext
        ): Promise<ProjectMember> {
            return MemberControl.update(ctx, projectId, userId, roles);
        },

        async deleteMember(
            parent,
            { projectId, userId }: { projectId: Id; userId: Id },
            ctx: GqlContext
        ): Promise<boolean> {
            await MemberControl.delete(ctx, projectId, userId);
            return true;
        },
    },

    User: {
        async roles({ id, roles }: User, args, ctx: GqlContext): Promise<Role[]> {
            if (roles) return roles;
            return ctx.loaders.roles.load(id);
        },
        membership({ id }: User, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return ctx.loaders.membersByUser.load(id);
        },
    },

    Project: {
        members({ id }: Project, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return ctx.loaders.membersByProj.load(id);
        },
    },

    ProjectMember: {
        project({ project }: ProjectMember, args, ctx: GqlContext): Promise<Project> {
            if (project['code']) {
                return Promise.resolve(project as Project);
            } else {
                return ctx.loaders.project.load(project.id);
            }
        },
        user({ user }: ProjectMember, args, ctx: GqlContext): Promise<User> {
            if (user['name']) {
                return Promise.resolve(user as User);
            } else {
                return ctx.loaders.user.load(user.id);
            }
        },
        roles({ project, user }: ProjectMember, args, ctx: GqlContext): Promise<ProjectRole[]> {
            return ctx.loaders.memberRoles.load({ projectId: project.id, userId: user.id });
        },
    },
};
