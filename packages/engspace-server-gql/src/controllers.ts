import { ForbiddenError } from 'apollo-server-koa';
import { User2, Project2, ProjectMember2, Role } from '@engspace/core';
import { UserDao2, ProjectDao2 } from '@engspace/server-db';
import { GqlContext } from '.';

function assertPerm(ctx: GqlContext, perm: string, message?: string): void {
    if (!ctx.user.perms.includes(perm))
        throw new ForbiddenError(message ? message : `Missing permission: "${perm}"`);
}

export interface Pagination {
    offset: number;
    limit: number;
}

export async function searchUsers(
    ctx: GqlContext,
    phrase: string,
    pag?: Pagination
): Promise<{ count: number; users: User2[] }> {
    assertPerm(ctx, 'user.get');
    const { offset, limit } = pag;
    return UserDao2.search(ctx.db, {
        phrase,
        offset,
        limit,
    });
}

export async function userRoles(ctx: GqlContext, userId: number): Promise<Role[]> {
    assertPerm(ctx, 'user.get');
    return UserDao2.rolesById(ctx.db, userId);
}

export async function searchProjects(
    ctx: GqlContext,
    phrase: string,
    pag?: Pagination
): Promise<{ count: number; projects: Project2[] }> {
    assertPerm(ctx, 'project.get');
    const { offset, limit } = pag;
    return ProjectDao2.search(ctx.db, {
        phrase,
        offset,
        limit,
    });
}

export async function projectMembers(ctx: GqlContext, projId: number): Promise<ProjectMember2[]> {
    assertPerm(ctx, 'project.get');
    return ProjectDao2.membersById(ctx.db, projId);
}
