import { Project, ProjectMember, User, Role } from '@engspace/core';
import { searchProjects, searchUsers, userRoles, projectMembers } from './controllers';
import { GqlContext } from '.';

export const resolvers = {
    Query: {
        userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: User[] }> {
            const { phrase, offset, limit } = args;
            return searchUsers(ctx, phrase, { offset, limit });
        },
        projectSearch(
            parent,
            args,
            ctx: GqlContext
        ): Promise<{ count: number; projects: Project[] }> {
            const { phrase, member, offset, limit } = args;
            return searchProjects(ctx, phrase, member, { offset, limit });
        },
    },

    User: {
        roles({ id }: User, args, ctx: GqlContext): Promise<Role[]> {
            return userRoles(ctx, id);
        },
    },

    Project: {
        members({ id }: Project, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return projectMembers(ctx, id);
        },
    },
};
