import {
    Id,
    Project,
    ProjectMember,
    User,
    UserInput,
    ProjectInput,
    ProjectMemberInput,
} from '@engspace/core';
import { MemberDao, ProjectDao, UserDao } from '@engspace/server-db';
import { ForbiddenError } from 'apollo-server-koa';
import { GqlContext } from '.';

function hasUserPerm(ctx: GqlContext, perm: string): boolean {
    return ctx.auth.userPerms.includes(perm);
}

function assertUserPerm(ctx: GqlContext, perm: string, message?: string): void {
    if (!hasUserPerm(ctx, perm)) {
        throw new ForbiddenError(message ? message : `Missing permission: '${perm}'`);
    }
}

async function hasProjectPerm(ctx: GqlContext, projectId: Id, perm: string): Promise<boolean> {
    const member = await MemberDao.byProjectAndUserId(ctx.db, projectId, ctx.auth.userId, true);
    console.log(member.roles);
    console.log(ctx.rolePolicies.project.permissions(member.roles));
    return member && ctx.rolePolicies.project.permissions(member.roles).includes(perm);
}

async function assertProjectPerm(
    ctx: GqlContext,
    projectId: Id,
    perm: string,
    message?: string
): Promise<void> {
    const has = await hasProjectPerm(ctx, projectId, perm);
    if (!has) {
        throw new ForbiddenError(message ? message : `Missing permission: '${perm}'`);
    }
}

async function assertUserOrProjectPerm(
    ctx: GqlContext,
    projectId: Id,
    perm: string,
    message?: string
): Promise<void> {
    if (hasUserPerm(ctx, perm)) {
        return;
    }
    const has = await hasProjectPerm(ctx, projectId, perm);
    if (!has) {
        throw new ForbiddenError(message ? message : `Missing permission: '${perm}'`);
    }
}

async function assertRole(ctx: GqlContext, role: string, message?: string): Promise<void> {
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
        assertUserPerm(ctx, 'user.create');
        return UserDao.create(ctx.db, user);
    }

    static async byIds(ctx: GqlContext, ids: readonly Id[]): Promise<User[]> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.batchByIds(ctx.db, ids);
    }

    static async byName(ctx: GqlContext, name: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.byName(ctx.db, name);
    }

    static async byEmail(ctx: GqlContext, email: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.byEmail(ctx.db, email);
    }

    static async rolesById(ctx: GqlContext, userId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.rolesById(ctx.db, userId);
    }

    static async search(
        ctx: GqlContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; users: User[] }> {
        assertUserPerm(ctx, 'user.read');
        const { offset, limit } = pag;
        return UserDao.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    static async update(ctx: GqlContext, userId: Id, user: UserInput): Promise<User> {
        if (userId !== ctx.auth.userId) {
            assertUserPerm(ctx, 'user.update');
        }
        return UserDao.update(ctx.db, userId, user);
    }
}

export class ProjectControl {
    static create(ctx: GqlContext, project: ProjectInput): Promise<Project> {
        assertUserPerm(ctx, 'project.create');
        return ProjectDao.create(ctx.db, project);
    }

    static byIds(ctx: GqlContext, ids: readonly Id[]): Promise<Project[]> {
        assertUserPerm(ctx, 'project.read');
        return ProjectDao.batchByIds(ctx.db, ids);
    }

    static async byCode(ctx: GqlContext, code: string): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return ProjectDao.byCode(ctx.db, code);
    }

    static async search(
        ctx: GqlContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; projects: Project[] }> {
        assertUserPerm(ctx, 'project.read');
        const { offset, limit } = pag;
        return ProjectDao.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    static async update(ctx: GqlContext, id: Id, project: ProjectInput): Promise<Project> {
        await assertUserOrProjectPerm(ctx, id, 'project.update');
        return ProjectDao.updateById(ctx.db, id, project);
    }
}

export class MemberControl {
    static async create(
        ctx: GqlContext,
        projectMember: ProjectMemberInput
    ): Promise<ProjectMember> {
        await assertUserOrProjectPerm(ctx, projectMember.projectId, 'member.create');
        return MemberDao.create(ctx.db, projectMember);
    }

    static async byId(ctx: GqlContext, id: Id): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byId(ctx.db, id);
    }

    static async byProjectAndUserId(
        ctx: GqlContext,
        projectId: Id,
        userId: Id
    ): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byProjectAndUserId(ctx.db, projectId, userId);
    }

    static async byProjectId(ctx: GqlContext, projId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byProjectId(ctx.db, projId);
    }

    static async byUserId(ctx: GqlContext, userId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byUserId(ctx.db, userId);
    }

    static async rolesById(ctx: GqlContext, id: Id): Promise<string[]> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.rolesById(ctx.db, id);
    }

    static async updateRolesById(ctx: GqlContext, id: Id, roles: string[]): Promise<ProjectMember> {
        const mem = await MemberDao.byId(ctx.db, id);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.update');
        return MemberDao.updateRolesById(ctx.db, id, roles);
    }

    static async deleteById(ctx: GqlContext, id: Id): Promise<void> {
        const mem = await MemberDao.byId(ctx.db, id);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.delete');
        return MemberDao.deleteById(ctx.db, id);
    }
}
