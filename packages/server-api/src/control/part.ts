import {
    CycleState,
    Id,
    Part,
    PartApproval,
    PartApprovalInput,
    PartApprovalUpdateInput,
    PartBase,
    PartCreateNewInput,
    PartForkInput,
    PartRevision,
    PartRevisionInput,
    PartUpdateInput,
    PartValidation,
    PartValidationInput,
    ApprovalDecision,
} from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { ApiContext } from '.';
import { assertUserPerm } from './helpers';
import { UserInputError, ForbiddenError } from 'apollo-server-koa';

export class PartControl {
    constructor(private dao: DaoSet) {}

    async createNew(ctx: ApiContext, input: PartCreateNewInput): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const { userId } = ctx.auth;

        const baseRef = await ctx.db.transaction(async db => {
            const fam = await this.dao.partFamily.bumpCounterById(db, input.familyId);
            return ctx.config.refNaming.partBase.getBaseRef(fam);
        });

        const base = await this.dao.partBase.create(ctx.db, {
            familyId: input.familyId,
            baseRef,
            userId,
        });

        const ref = ctx.config.refNaming.part.getRef(base, input.initialVersion);

        const part = await this.dao.part.create(ctx.db, {
            baseId: base.id,
            ref,
            designation: input.designation,
            userId,
        });

        return this.dao.partRevision.create(ctx.db, {
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
        const part = await this.dao.part.byId(ctx.db, partId);
        const base = await this.dao.partBase.byId(ctx.db, part.base.id);
        const prn = ctx.config.refNaming.part;
        const ref = version
            ? prn.getRef(base, version)
            : prn.getNext(base, prn.extractVersion(base, part.ref));
        const fork = await this.dao.part.create(ctx.db, {
            baseId: base.id,
            ref,
            designation: designation ?? part.designation,
            userId,
        });
        return this.dao.partRevision.create(ctx.db, {
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

        const last = await this.dao.partRevision.lastByPartId(ctx.db, partId);
        if (last && last.cycleState === CycleState.Edition) {
            throw new UserInputError('Cannot revise a part that is in edition mode!');
        }

        let des = designation;
        if (!des) {
            const part = await this.dao.part.byId(ctx.db, partId);
            des = part.designation;
        }

        return this.dao.partRevision.create(ctx.db, {
            partId,
            designation: des,
            cycleState: CycleState.Edition,
            userId: ctx.auth.userId,
        });
    }

    baseById(ctx: ApiContext, baseId: Id): Promise<PartBase> {
        assertUserPerm(ctx, 'part.read');
        return this.dao.partBase.byId(ctx.db, baseId);
    }

    partById(ctx: ApiContext, partId: Id): Promise<Part> {
        assertUserPerm(ctx, 'part.read');
        return this.dao.part.byId(ctx.db, partId);
    }

    revisionById(ctx: ApiContext, revisionId: Id): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.read');
        return this.dao.partRevision.byId(ctx.db, revisionId);
    }

    async startValidation(
        ctx: ApiContext,
        { partRevId, requiredApprovals }: PartValidationInput
    ): Promise<PartValidation> {
        assertUserPerm(ctx, 'partval.create');
        const { userId } = ctx.auth;
        const val = await this.dao.partValidation.create(ctx.db, {
            partRevId: partRevId,
            userId,
        });

        const approvals = await Promise.all(
            requiredApprovals.map(({ assigneeId }: PartApprovalInput) =>
                this.dao.partApproval.create(ctx.db, {
                    validationId: val.id,
                    assigneeId,
                    decision: ApprovalDecision.Pending,
                    userId,
                })
            )
        );

        return {
            ...val,
            approvals,
            state: approvals.length > 0 ? ApprovalDecision.Pending : ApprovalDecision.Approved,
        };
    }

    async updateApproval(
        { db, auth }: ApiContext,
        approvalId: Id,
        { decision, comments }: PartApprovalUpdateInput
    ): Promise<PartApproval> {
        const { userId } = auth;
        const { assignee } = await this.dao.partApproval.byId(db, approvalId);
        if (assignee.id !== userId) {
            throw new ForbiddenError("Cannot update someone else's approval");
        }
        return this.dao.partApproval.update(db, approvalId, {
            decision: decision,
            comments,
            userId,
        });
    }

    validationById(ctx: ApiContext, validationId: Id): Promise<PartValidation> {
        assertUserPerm(ctx, 'partval.read');
        return this.dao.partValidation.byId(ctx.db, validationId);
    }

    approvalById(ctx: ApiContext, approvalId: Id): Promise<PartApproval> {
        assertUserPerm(ctx, 'partval.read');
        return this.dao.partApproval.byId(ctx.db, approvalId);
    }

    approvalsByValidationId(ctx: ApiContext, validationId: Id): Promise<PartApproval[]> {
        assertUserPerm(ctx, 'partval.read');
        return this.dao.partApproval.byValidationId(ctx.db, validationId);
    }

    updatePart(ctx: ApiContext, id: Id, input: PartUpdateInput): Promise<Part> {
        assertUserPerm(ctx, 'part.update');
        return this.dao.part.updateById(ctx.db, id, input, ctx.auth.userId);
    }
}
