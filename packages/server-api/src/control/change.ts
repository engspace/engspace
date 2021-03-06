import { UserInputError } from 'apollo-server-koa';
import {
    ChangePartFork,
    ChangePartCreate,
    ChangePartRevision,
    ChangeRequest,
    Id,
    ChangeReview,
    ChangeRequestInput,
    PartCycle,
    ApprovalDecision,
    ChangeRequestUpdateInput,
    ChangePartForkInput,
    ChangePartRevisionInput,
    ChangeRequestCycle,
    ChangeReviewInput,
    Part,
    PartRevision,
} from '@engspace/core';
import { assertUserPerm } from './helpers';
import { EsContext } from '.';

export class ChangeControl {
    async requestCreate(ctx: EsContext, input: ChangeRequestInput): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.create');
        const {
            config,
            db,
            auth: { userId },
        } = ctx;
        if (input.partForks?.length > 0) {
            await this.checkPartChanges(ctx, input.partForks);
        }
        if (input.partRevisions?.length > 0) {
            await this.checkPartRevisions(ctx, input.partRevisions);
        }
        const { dao } = ctx.runtime;
        const counter = await dao.globalCounter.bumpChangeRequest(db);
        const name = config.naming.changeRequest().buildName({ counter });
        const req = await dao.changeRequest.create(db, {
            name,
            description: input.description,
            userId,
        });
        if (input.partCreations)
            req.partCreations = await Promise.all(
                input.partCreations?.map((inp) =>
                    dao.changePartCreate.create(db, { requestId: req.id, ...inp })
                )
            );
        if (input.partForks)
            req.partForks = await Promise.all(
                input.partForks?.map((inp) =>
                    dao.changePartFork.create(db, { requestId: req.id, ...inp })
                )
            );
        if (input.partRevisions)
            req.partRevisions = await Promise.all(
                input.partRevisions?.map((inp) =>
                    dao.changePartRevision.create(db, { requestId: req.id, ...inp })
                )
            );
        if (input.reviewerIds) {
            req.reviews = await Promise.all(
                input.reviewerIds.map((id) =>
                    dao.changeReview.create(db, {
                        requestId: req.id,
                        assigneeId: id,
                        decision: ApprovalDecision.Pending,
                        userId,
                    })
                )
            );
        }

        return req;
    }

    request(ctx: EsContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.changeRequest.byId(db, id);
    }

    requestPartCreations(ctx: EsContext, requestId: Id): Promise<ChangePartCreate[]> {
        assertUserPerm(ctx, 'change.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.changePartCreate.byRequestId(db, requestId);
    }

    requestPartChanges(ctx: EsContext, requestId: Id): Promise<ChangePartFork[]> {
        assertUserPerm(ctx, 'change.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.changePartFork.byRequestId(db, requestId);
    }

    requestPartRevisions(ctx: EsContext, requestId: Id): Promise<ChangePartRevision[]> {
        assertUserPerm(ctx, 'change.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.changePartRevision.byRequestId(db, requestId);
    }

    requestReviews(ctx: EsContext, requestId: Id): Promise<ChangeReview[]> {
        assertUserPerm(ctx, 'change.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.changeReview.byRequestId(db, requestId);
    }

    requestCreatedParts(ctx: EsContext, requestId: Id): Promise<Part[]> {
        assertUserPerm(ctx, 'part.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        // parts created by a change request have their first revision associated with it
        return dao.part.whoseRev1IsCreatedBy(db, requestId);
    }

    requestRevisedParts(ctx: EsContext, requestId: Id): Promise<PartRevision[]> {
        assertUserPerm(ctx, 'part.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partRevision.aboveRev1ByChangeRequestId(db, requestId);
    }

    async requestUpdate(
        ctx: EsContext,
        requestId: Id,
        {
            description,
            partCreationsAdd,
            partCreationsRem,
            partForksAdd,
            partForksRem,
            partRevisionsAdd,
            partRevisionsRem,
            reviewerIdsAdd,
            reviewsRem,
        }: ChangeRequestUpdateInput
    ): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;

        const { dao } = ctx.runtime;
        let req = await dao.changeRequest.byId(db, requestId);

        await this.assertEditor(ctx, req);
        const promises = [];

        if (partCreationsRem?.length > 0) {
            const reqIds = await Promise.all(
                partCreationsRem.map((pcId) => dao.changePartCreate.checkRequestId(db, pcId))
            );
            if (!reqIds.every((reqId) => reqId == requestId)) {
                throw new UserInputError('Part creation do not belong to the Change request');
            }
            promises.push(partCreationsRem.map((id) => dao.changePartCreate.deleteById(db, id)));
        }

        if (partForksRem?.length > 0) {
            const reqIds = await Promise.all(
                partForksRem.map((pcId) => dao.changePartFork.checkRequestId(db, pcId))
            );
            if (!reqIds.every((reqId) => reqId == requestId)) {
                throw new UserInputError('Part change do not belong to the Change request');
            }
            promises.push(partForksRem.map((id) => dao.changePartFork.deleteById(db, id)));
        }

        if (partRevisionsRem?.length > 0) {
            const reqIds = await Promise.all(
                partRevisionsRem.map((prId) => dao.changePartRevision.checkRequestId(db, prId))
            );
            if (!reqIds.every((reqId) => reqId == requestId)) {
                throw new UserInputError('Part revision do not belong to the Change request');
            }
            promises.push(partRevisionsRem.map((id) => dao.changePartRevision.deleteById(db, id)));
        }

        if (reviewsRem?.length > 0) {
            const reqIds = await Promise.all(
                reviewsRem.map((rId) => dao.changeReview.checkRequestId(db, rId))
            );
            if (!reqIds.every((reqId) => reqId === requestId)) {
                throw new UserInputError('Change review do not belong to the change request');
            }
            promises.push(reviewsRem.map((id) => dao.changeReview.deleteById(db, id)));
        }

        if (partCreationsAdd?.length > 0) {
            promises.push(
                partCreationsAdd.map((inp) =>
                    dao.changePartCreate.create(db, { requestId, ...inp })
                )
            );
        }
        if (partForksAdd?.length > 0) {
            await this.checkPartChanges(ctx, partForksAdd);
            promises.push(
                partForksAdd.map((inp) => dao.changePartFork.create(db, { requestId, ...inp }))
            );
        }
        if (partRevisionsAdd?.length > 0) {
            await this.checkPartRevisions(ctx, partRevisionsAdd);
            promises.push(
                partRevisionsAdd.map((inp) =>
                    dao.changePartRevision.create(db, { requestId, ...inp })
                )
            );
        }
        if (reviewerIdsAdd?.length > 0) {
            promises.push(
                reviewerIdsAdd.map((id) =>
                    dao.changeReview.create(db, { requestId, userId, assigneeId: id })
                )
            );
        }

        if (description) {
            req = await dao.changeRequest.update(db, requestId, { description, userId });
        }

        await Promise.all(promises);

        return req;
    }

    async requestSubmit(ctx: EsContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const req = await dao.changeRequest.byId(db, id);
        await this.assertEditor(ctx, req);
        if (req.cycle !== ChangeRequestCycle.Edition) {
            throw new UserInputError(`Can't submit a change request that is in ${req.cycle} cycle`);
        }
        return dao.changeRequest.updateCycle(db, id, ChangeRequestCycle.Validation, userId);
    }

    async requestWithdraw(ctx: EsContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const req = await dao.changeRequest.byId(db, id);
        await this.assertEditor(ctx, req);
        if (req.cycle !== ChangeRequestCycle.Validation) {
            throw new UserInputError(`Can't submit a change request that is in ${req.cycle} cycle`);
        }
        return dao.changeRequest.updateCycle(db, id, ChangeRequestCycle.Edition, userId);
    }

    async requestReview(
        ctx: EsContext,
        requestId: Id,
        input: ChangeReviewInput
    ): Promise<ChangeReview> {
        assertUserPerm(ctx, 'change.review');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const req = await dao.changeRequest.byId(db, requestId);
        if (!req) {
            throw new UserInputError('Cannot find specified change request');
        }
        if (req.cycle !== ChangeRequestCycle.Validation) {
            throw new UserInputError('Cannot review a change that is not in validation');
        }
        const review = await dao.changeReview.byRequestAndAssigneeId(db, requestId, userId);
        if (!review) {
            const user = await dao.user.byId(db, userId);
            throw new UserInputError(
                `User ${user.fullName} is not a reviewer of the specified change request`
            );
        }
        return dao.changeReview.update(db, review.id, {
            decision: input.decision,
            comments: input.comments,
            userId,
        });
    }

    async requestApprove(ctx: EsContext, requestId: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
            runtime: { dao, control },
        } = ctx;
        const req = await dao.changeRequest.byId(db, requestId);
        await this.assertEditor(ctx, req);

        if (req.cycle !== ChangeRequestCycle.Validation) {
            throw new UserInputError(`Can't approve a change request from the ${req.cycle} cycle`);
        }

        if (req.state !== ApprovalDecision.Approved && req.state !== ApprovalDecision.Reserved) {
            throw new UserInputError('Specified change request does not have required approvals');
        }

        // Everything looks OK. Let's proceed to changes

        const creations = await dao.changePartCreate.byRequestId(db, requestId);
        const changes = await dao.changePartFork.byRequestId(db, requestId);
        const revisions = await dao.changePartRevision.byRequestId(db, requestId);
        for (const creation of creations) {
            await control.part.create(ctx, {
                familyId: creation.family.id,
                designation: creation.designation,
                initialVersion: creation.version,
                changeRequestId: req.id,
            });
        }
        for (const change of changes) {
            await control.part.fork(ctx, {
                partId: change.part.id,
                designation: change.designation,
                version: change.version,
                changeRequestId: req.id,
            });
        }
        for (const revision of revisions) {
            await control.part.revise(ctx, {
                partId: revision.part.id,
                designation: revision.designation,
                changeRequestId: req.id,
            });
        }

        // All changes done without error. We bump the cycle to APPROVED and return result.

        return dao.changeRequest.updateCycle(db, requestId, ChangeRequestCycle.Approved, userId);
    }

    async requestCancel(ctx: EsContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const req = await dao.changeRequest.byId(db, id);
        await this.assertEditor(ctx, req);
        if (
            req.cycle === ChangeRequestCycle.Approved ||
            req.cycle === ChangeRequestCycle.Cancelled
        ) {
            throw new UserInputError(
                `Cannot cancel a change request that is in the ${req.cycle} cycle`
            );
        }
        return dao.changeRequest.updateCycle(db, id, ChangeRequestCycle.Cancelled, userId);
    }

    private async checkPartChanges(
        { db, config, runtime: { dao } }: EsContext,
        partForks: ChangePartForkInput[]
    ): Promise<void> {
        const parts = await dao.part.batchByIds(
            db,
            partForks.map((pc) => pc.partId)
        );
        for (let i = 0; i < parts.length; ++i) {
            const prn = config.naming.partRef();
            const comps = prn.extractComps(parts[i].ref);
            const newRef = prn.buildName({
                ...comps,
                partVersion: partForks[i].version,
            });
            if (await dao.part.checkRef(db, newRef)) {
                throw new UserInputError(`Part with reference "${newRef}" already exists.`);
            }
        }
    }

    private async checkPartRevisions(
        { db, runtime: { dao } }: EsContext,
        partRevisions: ChangePartRevisionInput[]
    ): Promise<void> {
        const partRevs = await Promise.all(
            partRevisions.map((pr) => dao.partRevision.lastByPartId(db, pr.partId))
        );
        for (const pr of partRevs) {
            if (pr.cycle === PartCycle.Edition) {
                const part = await dao.part.byId(db, pr.part.id);
                throw new UserInputError(
                    `Part "${part.ref}" has its last revision in "Edition" mode and be currently revised`
                );
            }
        }
    }

    private async assertEditor(
        { db, auth: { userId }, runtime: { dao } }: EsContext,
        req: ChangeRequest
    ): Promise<void> {
        // FIXME: editor list
        if (userId !== req.createdBy.id) {
            const user = await dao.user.byId(db, userId);
            throw new UserInputError(
                `User ${user.fullName} cannot edit the specified change request`
            );
        }
    }
}
