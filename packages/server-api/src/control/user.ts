import { ForbiddenError, UserInputError } from 'apollo-server-koa';
import validator from 'validator';
import { arraysHaveSameMembers, Id, User, UserInput } from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { assertUserPerm, hasUserPerm } from './helpers';
import { ApiContext, Pagination } from '.';

export class UserControl {
    constructor(private dao: DaoSet) {}

    async create(ctx: ApiContext, { name, email, fullName, roles }: UserInput): Promise<User> {
        assertUserPerm(ctx, 'user.create');
        if (!validator.isEmail(email)) {
            throw new UserInputError(`"${email}" is not a valid email address`);
        }

        return this.dao.user.create(ctx.db, { name, email, fullName, roles }, { withRoles: true });
    }

    async byIds(ctx: ApiContext, ids: readonly Id[]): Promise<User[]> {
        assertUserPerm(ctx, 'user.read');
        return this.dao.user.batchByIds(ctx.db, ids);
    }

    async byName(ctx: ApiContext, name: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return this.dao.user.byName(ctx.db, name);
    }

    async byEmail(ctx: ApiContext, email: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return this.dao.user.byEmail(ctx.db, email);
    }

    async rolesById(ctx: ApiContext, userId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'user.read');
        return this.dao.user.rolesById(ctx.db, userId);
    }

    async search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; users: User[] }> {
        assertUserPerm(ctx, 'user.read');
        const { offset, limit } = pag;
        return this.dao.user.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    async update(ctx: ApiContext, userId: Id, input: UserInput): Promise<User> {
        const self = userId === ctx.auth.userId;
        const hasPerm = hasUserPerm(ctx, 'user.update');
        if (!self && !hasPerm) {
            throw new ForbiddenError('missing permission: "user.update"');
        }
        const roles = await this.dao.user.rolesById(ctx.db, userId);
        const sameRoles = arraysHaveSameMembers(roles, input.roles);
        if (!sameRoles && !hasPerm) {
            throw new ForbiddenError('missing permission: "user.update"');
        }

        if (!validator.isEmail(input.email)) {
            throw new UserInputError(`"${input.email}" is not a valid email address`);
        }
        const user = await this.dao.user.update(ctx.db, userId, input);
        if (!sameRoles) {
            user.roles = await this.dao.user.updateRoles(ctx.db, userId, input.roles);
        } else {
            user.roles = roles;
        }
        return user;
    }
}
