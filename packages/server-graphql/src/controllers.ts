import { Id, Project, ProjectMember, ProjectRole, Role, User } from '@engspace/core';
import { MemberDao, ProjectDao, UserDao } from '@engspace/server-db';
import { ForbiddenError } from 'apollo-server-koa';
import { GqlContext } from '.';

function assertPerm(ctx: GqlContext, perm: string, message?: string): void {
    if (!ctx.user.perms.includes(perm))
        throw new ForbiddenError(message ? message : `Missing permission: '${perm}'`);
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
}

export class MemberControl {
    static async byProjectId(ctx: GqlContext, projId: Id): Promise<ProjectMember[]> {
        assertPerm(ctx, 'member.get');
        return MemberDao.byProjectId(ctx.db, projId);
    }

    static async byUserId(ctx: GqlContext, userId: Id): Promise<ProjectMember[]> {
        assertPerm(ctx, 'member.get');
        return MemberDao.byUserId(ctx.db, userId);
    }

    static async roles(ctx: GqlContext, projId: Id, userId: Id): Promise<ProjectRole[]> {
        assertPerm(ctx, 'member.get');
        return MemberDao.rolesByProjAndUserId(ctx.db, projId, userId);
    }
}
