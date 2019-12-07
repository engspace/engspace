import { ForbiddenError } from 'apollo-server-koa';
import { User, Project, ProjectMember, Role } from '@engspace/core';
import { UserDao, ProjectDao } from '@engspace/server-db';
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
): Promise<{ count: number; users: User[] }> {
    assertPerm(ctx, 'user.get');
    const { offset, limit } = pag;
    return UserDao.search(ctx.db, {
        phrase,
        offset,
        limit,
    });
}

export async function userRoles(ctx: GqlContext, userId: number): Promise<Role[]> {
    assertPerm(ctx, 'user.get');
    return UserDao.rolesById(ctx.db, userId);
}

export async function searchProjects(
    ctx: GqlContext,
    phrase: string,
    member: string,
    pag?: Pagination
): Promise<{ count: number; projects: Project[] }> {
    assertPerm(ctx, 'project.get');
    const { offset, limit } = pag;
    return ProjectDao.search(ctx.db, {
        phrase,
        member,
        offset,
        limit,
    });
}

export async function projectMembers(ctx: GqlContext, projId: number): Promise<ProjectMember[]> {
    assertPerm(ctx, 'project.get');
    return ProjectDao.membersById(ctx.db, projId);
}
