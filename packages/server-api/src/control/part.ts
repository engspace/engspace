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
import { assertUserPerm } from './helpers';
import { ApiContext } from '.';

export class PartControl {
    async create(ctx: ApiContext, input: PartCreateInput): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const {
            db,
            auth: { userId },
            runtime: { dao },
            config: { naming },
        } = ctx;

        const ref = await db.transaction(async (db) => {
            const fam = await dao.partFamily.bumpCounterById(db, input.familyId);
            return naming.partRef().buildName({
                familyCode: fam.code,
                familyCount: fam.counter,
                partVersion: input.initialVersion,
            });
        });
        const part = await dao.part.create(db, {
            familyId: input.familyId,
            ref,
            designation: input.designation,
            userId,
        });

        return dao.partRevision.create(db, {
            partId: part.id,
            designation: input.designation,
            changeRequestId: input.changeRequestId,
            cycle: PartCycle.Edition,
            userId,
        });
    }

    async fork(
        ctx: ApiContext,
        { partId, version, designation, changeRequestId }: PartForkInput
    ): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');
        const {
            db,
            auth: { userId },
            runtime: { dao },
            config: { naming },
        } = ctx;
        const part = await dao.part.byId(db, partId);
        const prn = naming.partRef();
        const { familyCode, familyCount, partVersion } = prn.extractComps(part.ref);
        const ref = prn.buildName({
            familyCode,
            familyCount,
            partVersion: version ?? prn.versionFormat.getNext(partVersion),
        });
        const fork = await dao.part.create(db, {
            familyId: part.family.id,
            ref,
            designation: designation ?? part.designation,
            userId,
        });
        return dao.partRevision.create(db, {
            partId: fork.id,
            designation: fork.designation,
            changeRequestId,
            cycle: PartCycle.Edition,
            userId,
        });
    }

    async revise(
        ctx: ApiContext,
        { partId, designation, changeRequestId }: PartRevisionInput
    ): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.create');

        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;

        const last = await dao.partRevision.lastByPartId(db, partId);
        if (last && last.cycle === PartCycle.Edition) {
            throw new UserInputError('Cannot revise a part that is in edition mode!');
        }

        let des = designation;
        if (!des) {
            const part = await dao.part.byId(db, partId);
            des = part.designation;
        }

        return dao.partRevision.create(db, {
            partId,
            designation: des,
            changeRequestId,
            cycle: PartCycle.Edition,
            userId: userId,
        });
    }

    partById(ctx: ApiContext, partId: Id): Promise<Part> {
        assertUserPerm(ctx, 'part.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.part.byId(db, partId);
    }

    revisionById(ctx: ApiContext, revisionId: Id): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partRevision.byId(db, revisionId);
    }

    async startValidation(
        ctx: ApiContext,
        { partRevId, requiredApprovals }: PartValidationInput
    ): Promise<PartValidation> {
        assertUserPerm(ctx, 'partval.create');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const partRev = await dao.partRevision.byId(db, partRevId);
        if (partRev.cycle !== PartCycle.Edition) {
            throw new UserInputError('cannot validate a part that is not in edition mode');
        }
        const val = await dao.partValidation.create(db, {
            partRevId: partRevId,
            userId,
        });

        const approvals = await Promise.all(
            requiredApprovals.map(({ assigneeId }: PartApprovalInput) =>
                dao.partApproval.create(db, {
                    validationId: val.id,
                    assigneeId,
                    decision: ApprovalDecision.Pending,
                    userId,
                })
            )
        );

        await dao.partRevision.updateCycleState(db, partRevId, PartCycle.Validation);

        return {
            ...val,
            approvals,
            state: approvals.length > 0 ? ApprovalDecision.Pending : ApprovalDecision.Approved,
        };
    }

    async updateApproval(
        { db, auth: { userId }, runtime: { dao } }: ApiContext,
        approvalId: Id,
        { decision, comments }: PartApprovalUpdateInput
    ): Promise<PartApproval> {
        const { assignee } = await dao.partApproval.byId(db, approvalId);
        if (assignee.id !== userId) {
            const { fullName, email } = await dao.user.byId(db, assignee.id);
            throw new ForbiddenError(
                `Only ${fullName} (${email}) is allowed to set this approval decision`
            );
        }
        return dao.partApproval.update(db, approvalId, {
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
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const { createdBy, state, partRev } = await dao.partValidation.byId(db, validationId);
        if (createdBy.id !== userId) {
            const { fullName, email } = await dao.user.byId(db, createdBy.id);
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
        const val = await dao.partValidation.update(db, validationId, {
            result,
            comments,
            userId: userId,
        });

        switch (result) {
            case ValidationResult.Release:
                await dao.partRevision.updateCycleState(db, partRev.id, PartCycle.Release);
                break;
            case ValidationResult.Cancel:
                await dao.partRevision.updateCycleState(db, partRev.id, PartCycle.Cancelled);
                break;
            case ValidationResult.TryAgain:
                await dao.partRevision.updateCycleState(db, partRev.id, PartCycle.Edition);
                break;
        }

        return val;
    }

    validationById(ctx: ApiContext, validationId: Id): Promise<PartValidation> {
        assertUserPerm(ctx, 'partval.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partValidation.byId(db, validationId);
    }

    approvalById(ctx: ApiContext, approvalId: Id): Promise<PartApproval> {
        assertUserPerm(ctx, 'partval.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partApproval.byId(db, approvalId);
    }

    approvalsByValidationId(ctx: ApiContext, validationId: Id): Promise<PartApproval[]> {
        assertUserPerm(ctx, 'partval.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partApproval.byValidationId(db, validationId);
    }

    updatePart(ctx: ApiContext, id: Id, input: PartUpdateInput): Promise<Part> {
        assertUserPerm(ctx, 'part.update');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        return dao.part.updateById(db, id, {
            ...input,
            userId: userId,
        });
    }
}
