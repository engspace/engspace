import { ForbiddenError } from 'apollo-server-koa';
import { Id } from '@engspace/core';
import { EsContext } from '.';

export function hasUserPerm(ctx: EsContext, perm: string): boolean {
    return ctx.auth.userPerms.includes(perm);
}

export function assertUserPerm(ctx: EsContext, perm: string): void {
    if (!hasUserPerm(ctx, perm)) {
        throw new ForbiddenError(`Missing permission: '${perm}'`);
    }
}

export async function hasProjectPerm(
    ctx: EsContext,
    projectId: Id,
    perm: string
): Promise<boolean> {
    const { rolePolicies } = ctx.config;
    const member = await ctx.runtime.dao.projectMember.byProjectAndUserId(
        ctx.db,
        projectId,
        ctx.auth.userId,
        true
    );
    return member && rolePolicies.project.permissions(member.roles).includes(perm);
}

export async function assertUserOrProjectPerm(
    ctx: EsContext,
    projectId: Id,
    perm: string
): Promise<void> {
    if (hasUserPerm(ctx, perm)) {
        return;
    }
    const has = await hasProjectPerm(ctx, projectId, perm);
    if (!has) {
        throw new ForbiddenError(`Missing permission: '${perm}'`);
    }
}
