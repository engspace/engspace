import {
    CycleState,
    Id,
    Part,
    PartApproval,
    PartBase,
    PartCreateNewInput,
    PartForkInput,
    PartRevision,
    PartRevisionInput,
    PartUpdateInput,
    PartValidation,
} from '@engspace/core';
import {
    partApprovalDao,
    partBaseDao,
    partDao,
    partFamilyDao,
    partRevisionDao,
    partValidationDao,
} from '@engspace/server-db';
import { ApiContext } from '.';
import { assertUserPerm } from './helpers';

export class PartControl {
    async createNew(ctx: ApiContext, input: PartCreateNewInput): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const { userId } = ctx.auth;

        const baseRef = await ctx.db.transaction(async db => {
            const fam = await partFamilyDao.bumpCounterById(db, input.familyId);
            return ctx.config.refNaming.partBase.getBaseRef(fam);
        });

        const partBase = await partBaseDao.create(ctx.db, {
            familyId: input.familyId,
            baseRef,
            designation: input.designation,
            userId,
        });

        const ref = ctx.config.refNaming.part.getRef(partBase, input.initialVersion);

        const part = await partDao.create(ctx.db, {
            baseId: partBase.id,
            ref,
            designation: input.designation,
            userId,
        });

        return partRevisionDao.create(ctx.db, {
            partId: part.id,
            designation: input.designation,
            cycleState: CycleState.Edition,
            userId,
        });
    }

    async fork(
        ctx: ApiContext,
        { partId, version, designation }: PartForkInput
    ): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');
        const { userId } = ctx.auth;
        const part = await partDao.byId(ctx.db, partId);
        const base = await partBaseDao.byId(ctx.db, part.base.id);
        const prn = ctx.config.refNaming.part;
        const ref = version
            ? prn.getRef(base, version)
            : prn.getNext(base, prn.extractVersion(base, part.ref));
        const fork = await partDao.create(ctx.db, {
            baseId: base.id,
            ref,
            designation: designation ?? part.designation,
            userId,
        });
        return partRevisionDao.create(ctx.db, {
            partId: fork.id,
            designation: fork.designation,
            cycleState: CycleState.Edition,
            userId,
        });
    }

    async revise(
        ctx: ApiContext,
        { partId, designation }: PartRevisionInput
    ): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        let des = designation;
        if (!des) {
            const part = await partDao.byId(ctx.db, partId);
            des = part.designation;
        }

        return partRevisionDao.create(ctx.db, {
            partId,
            designation: des,
            cycleState: CycleState.Edition,
            userId: ctx.auth.userId,
        });
    }

    baseById(ctx: ApiContext, baseId: Id): Promise<PartBase> {
        assertUserPerm(ctx, 'part.read');
        return partBaseDao.byId(ctx.db, baseId);
    }

    partById(ctx: ApiContext, partId: Id): Promise<Part> {
        assertUserPerm(ctx, 'part.read');
        return partDao.byId(ctx.db, partId);
    }

    revisionById(ctx: ApiContext, revisionId: Id): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.read');
        return partRevisionDao.byId(ctx.db, revisionId);
    }

    validationById(ctx: ApiContext, validationId: Id): Promise<PartValidation> {
        assertUserPerm(ctx, 'partval.read');
        return partValidationDao.byId(ctx.db, validationId);
    }

    approvalById(ctx: ApiContext, approvalId: Id): Promise<PartApproval> {
        assertUserPerm(ctx, 'partval.read');
        return partApprovalDao.byId(ctx.db, approvalId);
    }

    approvalsByValidationId(ctx: ApiContext, validationId: Id): Promise<PartApproval[]> {
        assertUserPerm(ctx, 'partval.read');
        return partApprovalDao.byValidationId(ctx.db, validationId);
    }

    updatePart(ctx: ApiContext, id: Id, input: PartUpdateInput): Promise<Part> {
        assertUserPerm(ctx, 'part.update');
        return partDao.updateById(ctx.db, id, input, ctx.auth.userId);
    }
}
