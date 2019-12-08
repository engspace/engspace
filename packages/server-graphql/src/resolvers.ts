import { Project, ProjectMember, User, Role } from '@engspace/core';
import { UserControl, ProjectControl } from './controllers';
import { GqlContext } from '.';

export const resolvers = {
    Query: {
        user(parent, { id }, ctx: GqlContext): Promise<User> {
            return ctx.loaders.user.load(id);
        },
        userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: User[] }> {
            const { phrase, offset, limit } = args;
            return UserControl.search(ctx, phrase, { offset, limit });
        },
        project(parent, { id }, ctx: GqlContext): Promise<Project> {
            return ctx.loaders.project.load(id);
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

    User: {
        roles({ id }: User, args, ctx: GqlContext): Promise<Role[]> {
            return ctx.loaders.roles.load(id);
        },
    },

    Project: {
        members({ id }: Project, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return ctx.loaders.members.load(id);
        },
    },
};
