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
} from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { assertUserPerm } from './helpers';
import { ApiContext } from '.';

export class ChangeControl {
    constructor(private dao: DaoSet) {}

    async createRequest(ctx: ApiContext, input: ChangeRequestInput): Promise<ChangeRequest> {
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

    async updateRequest(
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

        await Promise.all(promises);

        return this.dao.changeRequest.update(db, requestId, { description, userId });
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
}
