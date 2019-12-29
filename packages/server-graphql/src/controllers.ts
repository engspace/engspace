import { Id, Project, ProjectMember, ProjectRole, Role, User, UserInput } from '@engspace/core';
import { MemberDao, ProjectDao, UserDao } from '@engspace/server-db';
import { ForbiddenError } from 'apollo-server-koa';
import { GqlContext } from '.';

function assertPerm(ctx: GqlContext, perm: string, message?: string): void {
    if (!ctx.auth.userPerms.includes(perm))
        throw new ForbiddenError(message ? message : `Missing permission: '${perm}'`);
}

async function assertRole(ctx: GqlContext, role: Role, message?: string): Promise<void> {
    const userRoles = await UserDao.rolesById(ctx.db, ctx.auth.userId);
    if (!userRoles.includes(role)) {
        throw new ForbiddenError(message ? message : `Missing role: '${role}`);
    }
}

export interface Pagination {
    offset: number;
    limit: number;
}

export class UserControl {
    static async create(ctx: GqlContext, user: UserInput): Promise<User> {
        assertPerm(ctx, 'user.post');
        return UserDao.create(ctx.db, user);
    }

    static async byIds(ctx: GqlContext, ids: readonly Id[]): Promise<User[]> {
        assertPerm(ctx, 'user.get');
        return UserDao.batchByIds(ctx.db, ids);
    }

    static async byName(ctx: GqlContext, name: string): Promise<User> {
        assertPerm(ctx, 'user.get');
        return UserDao.byName(ctx.db, name);
    }

    static async byEmail(ctx: GqlContext, email: string): Promise<User> {
        assertPerm(ctx, 'user.get');
        return UserDao.byEmail(ctx.db, email);
    }

    static async rolesById(ctx: GqlContext, userId: Id): Promise<Role[]> {
        assertPerm(ctx, 'user.get');
        return UserDao.rolesById(ctx.db, userId);
    }

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

    static async update(ctx: GqlContext, userId: Id, user: UserInput): Promise<User> {
        assertPerm(ctx, 'user.patch');
        if (userId !== ctx.auth.userId) {
            await assertRole(ctx, Role.Admin);
        }
        return UserDao.update(ctx.db, userId, user);
    }
}

export class ProjectControl {
    static byIds(ctx: GqlContext, ids: readonly Id[]): Promise<Project[]> {
        assertPerm(ctx, 'project.get');
        return ProjectDao.batchByIds(ctx.db, ids);
    }

    static async byCode(ctx: GqlContext, code: string): Promise<Project> {
        assertPerm(ctx, 'project.get');
        return ProjectDao.byCode(ctx.db, code);
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

    static async roles(ctx: GqlContext, projectId: Id, userId: Id): Promise<ProjectRole[]> {
        assertPerm(ctx, 'member.get');
        return MemberDao.rolesByProjectAndUserId(ctx.db, { projectId, userId });
    }

    static async update(
        ctx: GqlContext,
        projectId: Id,
        userId: Id,
        roles: string[]
    ): Promise<ProjectMember> {
        assertPerm(ctx, 'member.patch');
        return MemberDao.update(ctx.db, { projectId, userId }, roles);
    }

    static async delete(ctx: GqlContext, projectId: Id, userId: Id): Promise<void> {
        assertPerm(ctx, 'member.delete');
        return MemberDao.deleteById(ctx.db, { projectId, userId });
    }
}
