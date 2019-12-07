import { searchProjects, searchUsers, userRoles, projectMembers } from '@engspace/server-logic';
import { GqlContext } from '.';
import { Project2, ProjectMember2, User2, Role } from '@engspace/core';

export const resolvers = {
    Query: {
        userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: User2[] }> {
            const { phrase, offset, limit } = args;
            return searchUsers(ctx.user.perms, ctx.db, phrase, { offset, limit });
        },
        projectSearch(
            parent,
            args,
            ctx: GqlContext
        ): Promise<{ count: number; projects: Project2[] }> {
            const { phrase, offset, limit } = args;
            return searchProjects(ctx.user.perms, ctx.db, phrase, { offset, limit });
        },
    },

    User: {
        roles({ id }: User2, args, ctx: GqlContext): Promise<Role[]> {
            return userRoles(ctx.user.perms, ctx.db, id);
        },
    },

    Project: {
        members({ id }: Project2, args, ctx: GqlContext): Promise<ProjectMember2[]> {
            return projectMembers(ctx.user.perms, ctx.db, id);
        },
    },
};
