import { ForbiddenError, UserInputError } from 'apollo-server-koa';
import {
    ApprovalDecision,
    Id,
    Part,
    PartApproval,
    PartApprovalInput,
    PartApprovalUpdateInput,
    PartCreateInput,
    PartCycle,
    PartForkInput,
    PartRevision,
    PartRevisionInput,
    PartUpdateInput,
    PartValidation,
    PartValidationCloseInput,
    PartValidationInput,
    ValidationResult,
} from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { assertUserPerm } from './helpers';
import { ApiContext } from '.';

export class PartControl {
    constructor(private dao: DaoSet) {}

    async create(ctx: ApiContext, input: PartCreateInput): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const { userId } = ctx.auth;

        const ref = await ctx.db.transaction(async (db) => {
            const fam = await this.dao.partFamily.bumpCounterById(db, input.familyId);
            return ctx.config.naming.partRef.buildName({
                familyCode: fam.code,
                familyCount: fam.counter,
                partVersion: input.initialVersion,
            });
        });
        const part = await this.dao.part.create(ctx.db, {
            familyId: input.familyId,
            ref,
            designation: input.designation,
            userId,
        });

        return this.dao.partRevision.create(ctx.db, {
            partId: part.id,
            designation: input.designation,
            changeId: input.changeId,
            cycle: PartCycle.Edition,
            userId,
        });
    }

    async fork(
        ctx: ApiContext,
        { partId, version, designation, changeId }: PartForkInput
    ): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');
        const { userId } = ctx.auth;
        const part = await this.dao.part.byId(ctx.db, partId);
        const prn = ctx.config.naming.partRef;
        const { familyCode, familyCount, partVersion } = prn.extractComps(part.ref);
        const ref = prn.buildName({
            familyCode,
            familyCount,
            partVersion: version ?? prn.versionFormat.getNext(partVersion),
        });
        const fork = await this.dao.part.create(ctx.db, {
            familyId: part.family.id,
            ref,
            designation: designation ?? part.designation,
            userId,
        });
        return this.dao.partRevision.create(ctx.db, {
            partId: fork.id,
            designation: fork.designation,
            changeId,
            cycle: PartCycle.Edition,
            userId,
        });
    }

    async revise(
        ctx: ApiContext,
        { partId, designation, changeId }: PartRevisionInput
    ): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const last = await this.dao.partRevision.lastByPartId(ctx.db, partId);
        if (last && last.cycle === PartCycle.Edition) {
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
            changeId,
            cycle: PartCycle.Edition,
            userId: ctx.auth.userId,
        });
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
        const partRev = await this.dao.partRevision.byId(ctx.db, partRevId);
        if (partRev.cycle !== PartCycle.Edition) {
            throw new UserInputError('cannot validate a part that is not in edition mode');
        }
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

        await this.dao.partRevision.updateCycleState(ctx.db, partRevId, PartCycle.Validation);

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
            const { fullName, email } = await this.dao.user.byId(db, assignee.id);
            throw new ForbiddenError(
                `Only ${fullName} (${email}) is allowed to set this approval decision`
            );
        }
        return this.dao.partApproval.update(db, approvalId, {
            decision: decision,
            comments,
            userId,
        });
    }

    async closeValidation(
        ctx: ApiContext,
        validationId: Id,
        { result, comments }: PartValidationCloseInput
    ): Promise<PartValidation> {
        const { createdBy, state, partRev } = await this.dao.partValidation.byId(
            ctx.db,
            validationId
        );
        if (createdBy.id !== ctx.auth.userId) {
            const { fullName, email } = await this.dao.user.byId(ctx.db, createdBy.id);
            throw new ForbiddenError(
                `Only ${fullName} (${email}) is allowed to close this validation`
            );
        }
        if (
            result === ValidationResult.Release &&
            state !== ApprovalDecision.Approved &&
            state !== ApprovalDecision.Reserved
        ) {
            throw new UserInputError(
                `Cannot release with a validation that is in "${state}" state`
            );
        }
        const val = await this.dao.partValidation.update(ctx.db, validationId, {
            result,
            comments,
            userId: ctx.auth.userId,
        });

        switch (result) {
            case ValidationResult.Release:
                await this.dao.partRevision.updateCycleState(ctx.db, partRev.id, PartCycle.Release);
                break;
            case ValidationResult.Cancel:
                await this.dao.partRevision.updateCycleState(
                    ctx.db,
                    partRev.id,
                    PartCycle.Cancelled
                );
                break;
            case ValidationResult.TryAgain:
                await this.dao.partRevision.updateCycleState(ctx.db, partRev.id, PartCycle.Edition);
                break;
        }

        return val;
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
        return this.dao.part.updateById(ctx.db, id, {
            ...input,
            userId: ctx.auth.userId,
        });
    }
}
