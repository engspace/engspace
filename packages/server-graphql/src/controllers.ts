import { ForbiddenError } from 'apollo-server-koa';
import { User, Project, ProjectMember, Role, Id } from '@engspace/core';
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

export class UserControl {
    static async search(
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

    static async byIds(ctx: GqlContext, ids: readonly Id[]): Promise<User[]> {
        assertPerm(ctx, 'user.get');
        return UserDao.batchByIds(ctx.db, ids);
    }

    static async roles(ctx: GqlContext, userId: Id): Promise<Role[]> {
        assertPerm(ctx, 'user.get');
        return UserDao.rolesById(ctx.db, userId);
    }
}

export class ProjectControl {
    static byIds(ctx: GqlContext, ids: readonly Id[]): Promise<Project[]> {
        assertPerm(ctx, 'project.get');
        return ProjectDao.batchByIds(ctx.db, ids);
    }

    static async search(
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

    static async members(ctx: GqlContext, projId: Id): Promise<ProjectMember[]> {
        assertPerm(ctx, 'project.get');
        return ProjectDao.membersById(ctx.db, projId);
    }
}
