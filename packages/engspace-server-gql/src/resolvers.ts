import { searchProjects, searchUsers } from '@engspace/server-logic';
import { GqlContext } from '.';
import { IUser, IProject } from '@engspace/core';

export const resolvers = {
    Query: {
        userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: IUser[] }> {
            const { phrase, offset, limit } = args;
            return searchUsers(ctx.user.perms, ctx.db, phrase, { offset, limit });
        },
        projectSearch(
            parent,
            args,
            ctx: GqlContext
        ): Promise<{ count: number; projects: IProject[] }> {
            const { phrase, offset, limit } = args;
            return searchProjects(ctx.user.perms, ctx.db, phrase, { offset, limit });
        },
    },
};
