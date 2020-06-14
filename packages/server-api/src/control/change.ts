import { UserInputError } from 'apollo-server-koa';
import {
    ChangePartChange,
    ChangePartCreate,
    ChangePartRevision,
    ChangeRequest,
    Id,
    ChangeReview,
    ChangeRequestInput,
    PartCycle,
    ApprovalDecision,
    ChangeRequestUpdateInput,
    ChangePartChangeInput,
    ChangePartRevisionInput,
    ChangeRequestCycle,
    ChangeReviewInput,
    Part,
    PartRevision,
} from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { assertUserPerm } from './helpers';
import { PartControl } from './part';
import { ApiContext } from '.';

export class ChangeControl {
    constructor(private dao: DaoSet, private partControl: PartControl) {}

    async requestCreate(ctx: ApiContext, input: ChangeRequestInput): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.create');
        const {
            db,
            auth: { userId },
        } = ctx;
        if (input.partChanges?.length > 0) {
            await this.checkPartChanges(ctx, input.partChanges);
        }
        if (input.partRevisions?.length > 0) {
            await this.checkPartRevisions(ctx, input.partRevisions);
        }
        const req = await this.dao.changeRequest.create(db, {
            description: input.description,
            userId,
        });
        if (input.partCreations)
            req.partCreations = await Promise.all(
                input.partCreations?.map((inp) =>
                    this.dao.changePartCreate.create(db, { requestId: req.id, ...inp })
                )
            );
        if (input.partChanges)
            req.partChanges = await Promise.all(
                input.partChanges?.map((inp) =>
                    this.dao.changePartChange.create(db, { requestId: req.id, ...inp })
                )
            );
        if (input.partRevisions)
            req.partRevisions = await Promise.all(
                input.partRevisions?.map((inp) =>
                    this.dao.changePartRevision.create(db, { requestId: req.id, ...inp })
                )
            );
        if (input.reviewerIds) {
            req.reviews = await Promise.all(
                input.reviewerIds.map((id) =>
                    this.dao.changeReview.create(db, {
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

    request(ctx: ApiContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changeRequest.byId(ctx.db, id);
    }

    requestPartCreations(ctx: ApiContext, requestId: Id): Promise<ChangePartCreate[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changePartCreate.byRequestId(ctx.db, requestId);
    }

    requestPartChanges(ctx: ApiContext, requestId: Id): Promise<ChangePartChange[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changePartChange.byRequestId(ctx.db, requestId);
    }

    requestPartRevisions(ctx: ApiContext, requestId: Id): Promise<ChangePartRevision[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changePartRevision.byRequestId(ctx.db, requestId);
    }

    requestReviews(ctx: ApiContext, requestId: Id): Promise<ChangeReview[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changeReview.byRequestId(ctx.db, requestId);
    }

    requestCreatedParts(ctx: ApiContext, requestId: Id): Promise<Part[]> {
        assertUserPerm(ctx, 'part.read');
        // parts created by a change request have their first revision associated with it
        return this.dao.part.whoseRev1IsCreatedBy(ctx.db, requestId);
    }

    requestRevisedParts(ctx: ApiContext, requestId: Id): Promise<PartRevision[]> {
        assertUserPerm(ctx, 'part.read');
        return this.dao.partRevision.aboveRev1ByChangeRequestId(ctx.db, requestId);
    }

    async requestUpdate(
        ctx: ApiContext,
        requestId: Id,
        {
            description,
            partCreationsAdd,
            partCreationsRem,
            partChangesAdd,
            partChangesRem,
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

        let req = await this.dao.changeRequest.byId(db, requestId);

        await this.assertEditor(ctx, req);
        const promises = [];

        if (partCreationsRem?.length > 0) {
            const reqIds = await Promise.all(
                partCreationsRem.map((pcId) => this.dao.changePartCreate.checkRequestId(db, pcId))
            );
            if (!reqIds.every((reqId) => reqId == requestId)) {
                throw new UserInputError('Part creation do not belong to the Change request');
            }
            promises.push(
                partCreationsRem.map((id) => this.dao.changePartCreate.deleteById(db, id))
            );
        }

        if (partChangesRem?.length > 0) {
            const reqIds = await Promise.all(
                partChangesRem.map((pcId) => this.dao.changePartChange.checkRequestId(db, pcId))
            );
            if (!reqIds.every((reqId) => reqId == requestId)) {
                throw new UserInputError('Part change do not belong to the Change request');
            }
            promises.push(partChangesRem.map((id) => this.dao.changePartChange.deleteById(db, id)));
        }

        if (partRevisionsRem?.length > 0) {
            const reqIds = await Promise.all(
                partRevisionsRem.map((prId) => this.dao.changePartRevision.checkRequestId(db, prId))
            );
            if (!reqIds.every((reqId) => reqId == requestId)) {
                throw new UserInputError('Part revision do not belong to the Change request');
            }
            promises.push(
                partRevisionsRem.map((id) => this.dao.changePartRevision.deleteById(db, id))
            );
        }

        if (reviewsRem?.length > 0) {
            const reqIds = await Promise.all(
                reviewsRem.map((rId) => this.dao.changeReview.checkRequestId(db, rId))
            );
            if (!reqIds.every((reqId) => reqId === requestId)) {
                throw new UserInputError('Change review do not belong to the change request');
            }
            promises.push(reviewsRem.map((id) => this.dao.changeReview.deleteById(db, id)));
        }

        if (partCreationsAdd?.length > 0) {
            promises.push(
                partCreationsAdd.map((inp) =>
                    this.dao.changePartCreate.create(db, { requestId, ...inp })
                )
            );
        }
        if (partChangesAdd?.length > 0) {
            await this.checkPartChanges(ctx, partChangesAdd);
            promises.push(
                partChangesAdd.map((inp) =>
                    this.dao.changePartChange.create(db, { requestId, ...inp })
                )
            );
        }
        if (partRevisionsAdd?.length > 0) {
            await this.checkPartRevisions(ctx, partRevisionsAdd);
            promises.push(
                partRevisionsAdd.map((inp) =>
                    this.dao.changePartRevision.create(db, { requestId, ...inp })
                )
            );
        }
        if (reviewerIdsAdd?.length > 0) {
            promises.push(
                reviewerIdsAdd.map((id) =>
                    this.dao.changeReview.create(db, { requestId, userId, assigneeId: id })
                )
            );
        }

        if (description) {
            req = await this.dao.changeRequest.update(db, requestId, { description, userId });
        }

        await Promise.all(promises);

        return req;
    }

    async requestSubmit(ctx: ApiContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.changeRequest.byId(db, id);
        await this.assertEditor(ctx, req);
        if (req.cycle !== ChangeRequestCycle.Edition) {
            throw new UserInputError(`Can't submit a change request that is in ${req.cycle} cycle`);
        }
        return this.dao.changeRequest.updateCycle(db, id, ChangeRequestCycle.Validation, userId);
    }

    async requestWithdraw(ctx: ApiContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.changeRequest.byId(db, id);
        await this.assertEditor(ctx, req);
        if (req.cycle !== ChangeRequestCycle.Validation) {
            throw new UserInputError(`Can't submit a change request that is in ${req.cycle} cycle`);
        }
        return this.dao.changeRequest.updateCycle(db, id, ChangeRequestCycle.Edition, userId);
    }

    async requestReview(
        ctx: ApiContext,
        requestId: Id,
        input: ChangeReviewInput
    ): Promise<ChangeReview> {
        assertUserPerm(ctx, 'change.review');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.changeRequest.byId(db, requestId);
        if (!req) {
            throw new UserInputError('Cannot find specified change request');
        }
        if (req.cycle !== ChangeRequestCycle.Validation) {
            throw new UserInputError('Cannot review a change that is not in validation');
        }
        const review = await this.dao.changeReview.byRequestAndAssigneeId(db, requestId, userId);
        if (!review) {
            const user = await this.dao.user.byId(db, userId);
            throw new UserInputError(
                `User ${user.fullName} is not a reviewer of the specified change request`
            );
        }
        return this.dao.changeReview.update(db, review.id, {
            decision: input.decision,
            comments: input.comments,
            userId,
        });
    }

    async requestApprove(ctx: ApiContext, requestId: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.changeRequest.byId(db, requestId);
        await this.assertEditor(ctx, req);

        if (req.cycle !== ChangeRequestCycle.Validation) {
            throw new UserInputError(`Can't approve a change request from the ${req.cycle} cycle`);
        }

        if (req.state !== ApprovalDecision.Approved && req.state !== ApprovalDecision.Reserved) {
            throw new UserInputError('Specified change request does not have required approvals');
        }

        // Everything looks OK. Let's proceed to changes

        const creations = await this.dao.changePartCreate.byRequestId(db, requestId);
        const changes = await this.dao.changePartChange.byRequestId(db, requestId);
        const revisions = await this.dao.changePartRevision.byRequestId(db, requestId);
        for (const creation of creations) {
            await this.partControl.create(ctx, {
                familyId: creation.family.id,
                designation: creation.designation,
                initialVersion: creation.version,
                changeRequestId: req.id,
            });
        }
        for (const change of changes) {
            await this.partControl.fork(ctx, {
                partId: change.part.id,
                designation: change.designation,
                version: change.version,
                changeRequestId: req.id,
            });
        }
        for (const revision of revisions) {
            await this.partControl.revise(ctx, {
                partId: revision.part.id,
                designation: revision.designation,
                changeRequestId: req.id,
            });
        }

        // All changes done without error. We bump the cycle to APPROVED and return result.

        return this.dao.changeRequest.updateCycle(
            db,
            requestId,
            ChangeRequestCycle.Approved,
            userId
        );
    }

    async requestCancel(ctx: ApiContext, id: Id): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.changeRequest.byId(db, id);
        await this.assertEditor(ctx, req);
        if (
            req.cycle === ChangeRequestCycle.Approved ||
            req.cycle === ChangeRequestCycle.Cancelled
        ) {
            throw new UserInputError(
                `Cannot cancel a change request that is in the ${req.cycle} cycle`
            );
        }
        return this.dao.changeRequest.updateCycle(db, id, ChangeRequestCycle.Cancelled, userId);
    }

    private async checkPartChanges(
        { db, config }: ApiContext,
        partChanges: ChangePartChangeInput[]
    ): Promise<void> {
        const parts = await this.dao.part.batchByIds(
            db,
            partChanges.map((pc) => pc.partId)
        );
        for (let i = 0; i < parts.length; ++i) {
            const refParts = config.refNaming.extractParts(parts[i].ref);
            const newRef = config.refNaming.buildRef({
                ...refParts,
                partVersion: partChanges[i].version,
            });
            if (await this.dao.part.checkRef(db, newRef)) {
                throw new UserInputError(`Part with reference "${newRef}" already exists.`);
            }
        }
    }

    private async checkPartRevisions(
        { db }: ApiContext,
        partRevisions: ChangePartRevisionInput[]
    ): Promise<void> {
        const partRevs = await Promise.all(
            partRevisions.map((pr) => this.dao.partRevision.lastByPartId(db, pr.partId))
        );
        for (const pr of partRevs) {
            if (pr.cycle === PartCycle.Edition) {
                const part = await this.dao.part.byId(db, pr.part.id);
                throw new UserInputError(
                    `Part "${part.ref}" has its last revision in "Edition" mode and be currently revised`
                );
            }
        }
    }

    private async assertEditor(
        { db, auth: { userId } }: ApiContext,
        req: ChangeRequest
    ): Promise<void> {
        // FIXME: editor list
        if (userId !== req.createdBy.id) {
            const user = await this.dao.user.byId(db, userId);
            throw new UserInputError(
                `User ${user.fullName} cannot edit the specified change request`
            );
        }
    }
}
