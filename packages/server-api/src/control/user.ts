import { ForbiddenError, UserInputError } from 'apollo-server-koa';
import validator from 'validator';
import { arraysHaveSameMembers, Id, User, UserInput } from '@engspace/core';
import { assertUserPerm, hasUserPerm } from './helpers';
import { EsContext, Pagination } from '.';

export class UserControl {
    async create(ctx: EsContext, { name, email, fullName, roles }: UserInput): Promise<User> {
        assertUserPerm(ctx, 'user.create');
        const {
            db,
            runtime: { dao },
        } = ctx;
        if (!validator.isEmail(email)) {
            throw new UserInputError(`"${email}" is not a valid email address`);
        }

        return dao.user.create(db, { name, email, fullName, roles }, { withRoles: true });
    }

    async byIds(ctx: EsContext, ids: readonly Id[]): Promise<User[]> {
        assertUserPerm(ctx, 'user.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.user.batchByIds(db, ids);
    }

    async byName(ctx: EsContext, name: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.user.byName(db, name);
    }

    async byEmail(ctx: EsContext, email: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.user.byEmail(db, email);
    }

    async rolesById(ctx: EsContext, userId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'user.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.user.rolesById(db, userId);
    }

    async search(
        ctx: EsContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; users: User[] }> {
        assertUserPerm(ctx, 'user.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        const { offset, limit } = pag;
        return dao.user.search(db, {
            phrase: search,
            offset,
            limit,
        });
    }

    async update(ctx: EsContext, userId: Id, input: UserInput): Promise<User> {
        const {
            db,
            auth,
            runtime: { dao },
        } = ctx;
        const self = userId === auth.userId;
        const hasPerm = hasUserPerm(ctx, 'user.update');
        if (!self && !hasPerm) {
            throw new ForbiddenError('missing permission: "user.update"');
        }
        const roles = await dao.user.rolesById(db, userId);
        const sameRoles = arraysHaveSameMembers(roles, input.roles);
        if (!sameRoles && !hasPerm) {
            throw new ForbiddenError('missing permission: "user.update"');
        }

        if (!validator.isEmail(input.email)) {
            throw new UserInputError(`"${input.email}" is not a valid email address`);
        }
        const user = await dao.user.update(db, userId, input);
        if (!sameRoles) {
            user.roles = await dao.user.updateRoles(db, userId, input.roles);
        } else {
            user.roles = roles;
        }
        return user;
    }
}
