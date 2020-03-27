import { ApiContext } from '.';
import {
    PartFamilyInput,
    PartFamily,
    Id,
    PartBaseInput,
    PartBase,
    PartBaseUpdateInput,
    PartInput,
    Part,
    PartUpdateInput,
    PartRevision,
} from '@engspace/core';
import { assertUserPerm } from './helpers';
import { partFamilyDao, partBaseDao, partDao, partRevisionDao } from '@engspace/server-db';
import { UserInputError } from 'apollo-server-koa';

export class PartFamilyControl {
    async create(ctx: ApiContext, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.create');
        return partFamilyDao.create(ctx.db, partFamily);
    }

    async byId(ctx: ApiContext, id: Id): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.read');
        return partFamilyDao.byId(ctx.db, id);
    }

    async update(ctx: ApiContext, id: Id, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.update');
        return partFamilyDao.updateById(ctx.db, id, partFamily);
    }
}

export class PartBaseControl {
    async create(ctx: ApiContext, partBase: PartBaseInput): Promise<PartBase> {
        assertUserPerm(ctx, 'part.create');
        const baseRef = await ctx.db.transaction(async db => {
            const fam = await partFamilyDao.bumpCounterById(db, partBase.familyId);
            return ctx.config.refNaming.partBase.getBaseRef(fam);
        });
        return partBaseDao.create(ctx.db, partBase, baseRef, ctx.auth.userId);
    }

    async byId(ctx: ApiContext, id: Id): Promise<PartBase> {
        assertUserPerm(ctx, 'part.read');
        return partBaseDao.byId(ctx.db, id);
    }

    async update(ctx: ApiContext, id: Id, partBase: PartBaseUpdateInput): Promise<PartBase> {
        assertUserPerm(ctx, 'part.update');
        return partBaseDao.updateById(ctx.db, id, partBase, ctx.auth.userId);
    }
}

export class PartControl {
    async create(ctx: ApiContext, input: PartInput): Promise<Part> {
        assertUserPerm(ctx, 'part.create');
        const base = await partBaseDao.byId(ctx.db, input.baseId);
        if (!base) {
            throw new UserInputError(`unexisting PartRef: "${input.baseId}"`);
        }
        return partDao.create(ctx.db, {
            baseId: input.baseId,
            designation: input.designation ?? base.designation,
            ref: ctx.config.refNaming.part.getRef(base, input.version),
            userId: ctx.auth.userId,
        });
    }

    async byId(ctx: ApiContext, id: Id): Promise<Part> {
        assertUserPerm(ctx, 'part.read');
        return partDao.byId(ctx.db, id);
    }

    async update(ctx: ApiContext, id: Id, input: PartUpdateInput): Promise<Part> {
        assertUserPerm(ctx, 'part.update');
        return partDao.updateById(ctx.db, id, input, ctx.auth.userId);
    }
}

export class PartRevisionControl {
    async byId(ctx: ApiContext, id: Id): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.read');
        return partRevisionDao.byId(ctx.db, id);
    }
}
