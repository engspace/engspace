import { Id, User, UserInput } from '@engspace/core';
import { userDao } from '@engspace/server-db';
import { ForbiddenError, UserInputError } from 'apollo-server-koa';
import validator from 'validator';
import { ApiContext, Pagination } from '.';
import { arraysHaveSameMembers } from '../util';
import { assertUserPerm, hasUserPerm } from './helpers';

export class UserControl {
    async create(ctx: ApiContext, { name, email, fullName, roles }: UserInput): Promise<User> {
        assertUserPerm(ctx, 'user.create');
        if (!validator.isEmail(email)) {
            throw new UserInputError(`"${email}" is not a valid email address`);
        }

        return userDao.create(ctx.db, { name, email, fullName, roles }, { withRoles: true });
    }

    async byIds(ctx: ApiContext, ids: readonly Id[]): Promise<User[]> {
        assertUserPerm(ctx, 'user.read');
        return userDao.batchByIds(ctx.db, ids);
    }

    async byName(ctx: ApiContext, name: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return userDao.byName(ctx.db, name);
    }

    async byEmail(ctx: ApiContext, email: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return userDao.byEmail(ctx.db, email);
    }

    async rolesById(ctx: ApiContext, userId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'user.read');
        return userDao.rolesById(ctx.db, userId);
    }

    async search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; users: User[] }> {
        assertUserPerm(ctx, 'user.read');
        const { offset, limit } = pag;
        return userDao.search(ctx.db, {
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
        const roles = await userDao.rolesById(ctx.db, userId);
        const sameRoles = arraysHaveSameMembers(roles, input.roles);
        if (!sameRoles && !hasPerm) {
            throw new ForbiddenError('missing permission: "user.update"');
        }

        if (!validator.isEmail(input.email)) {
            throw new UserInputError(`"${input.email}" is not a valid email address`);
        }
        const user = await userDao.update(ctx.db, userId, input);
        if (!sameRoles) {
            user.roles = await userDao.updateRoles(ctx.db, userId, input.roles);
        } else {
            user.roles = roles;
        }
        return user;
    }
}
