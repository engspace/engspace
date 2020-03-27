import {
    CycleState,
    Id,
    Part,
    PartBase,
    PartBaseInput,
    PartBaseUpdateInput,
    PartCreateNewInput,
    PartInput,
    PartRevision,
    PartUpdateInput,
} from '@engspace/core';
import { partBaseDao, partDao, partFamilyDao, partRevisionDao } from '@engspace/server-db';
import { UserInputError } from 'apollo-server-koa';
import { ApiContext } from '.';
import { assertUserPerm } from './helpers';

export class PartControl2 {
    async createNew(ctx: ApiContext, input: PartCreateNewInput): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const { userId } = ctx.auth;

        const baseRef = await ctx.db.transaction(async db => {
            const fam = await partFamilyDao.bumpCounterById(db, input.familyId);
            return ctx.config.refNaming.partBase.getBaseRef(fam);
        });

        const partBase = await partBaseDao.create(
            ctx.db,
            {
                familyId: input.familyId,
                designation: input.designation,
            },
            baseRef,
            userId
        );

        const ref = ctx.config.refNaming.part.getRef(partBase, input.initialVersion);

        const part = await partDao.create(ctx.db, {
            baseId: partBase.id,
            designation: input.designation,
            ref,
            userId,
        });

        return partRevisionDao.create(ctx.db, {
            partId: part.id,
            designation: input.designation,
            cycleState: CycleState.Edition,
            userId,
        });
    }

    async baseById(ctx: ApiContext, id: Id): Promise<PartBase> {
        assertUserPerm(ctx, 'part.read');
        return partBaseDao.byId(ctx.db, id);
    }

    async updateBase(ctx: ApiContext, id: Id, partBase: PartBaseUpdateInput): Promise<PartBase> {
        assertUserPerm(ctx, 'part.update');
        return partBaseDao.updateById(ctx.db, id, partBase, ctx.auth.userId);
    }

    async partById(ctx: ApiContext, id: Id): Promise<Part> {
        assertUserPerm(ctx, 'part.read');
        return partDao.byId(ctx.db, id);
    }

    async updatePart(ctx: ApiContext, id: Id, input: PartUpdateInput): Promise<Part> {
        assertUserPerm(ctx, 'part.update');
        return partDao.updateById(ctx.db, id, input, ctx.auth.userId);
    }

    async revisionById(ctx: ApiContext, id: Id): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.read');
        return partRevisionDao.byId(ctx.db, id);
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
}
