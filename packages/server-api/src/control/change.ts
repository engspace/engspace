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
} from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { ApiContext } from '.';
import { assertUserPerm } from './helpers';
import { UserInputError } from 'apollo-server-koa';

export class ChangeControl {
    constructor(private dao: DaoSet) {}

    async createRequest(ctx: ApiContext, input: ChangeRequestInput): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.create');
        const {
            db,
            auth: { userId },
        } = ctx;
        if (input.partChanges) {
            const parts = await this.dao.part.batchByIds(
                db,
                input.partChanges.map((pc) => pc.partId)
            );
            for (let i = 0; i < parts.length; ++i) {
                const refParts = ctx.config.refNaming.extractParts(parts[i].ref);
                const newRef = ctx.config.refNaming.buildRef({
                    ...refParts,
                    partVersion: input.partChanges[i].version,
                });
                if (await this.dao.part.checkRef(db, newRef)) {
                    throw new UserInputError(`Part with reference "${newRef}" already exists.`);
                }
            }
        }
        if (input.partRevisions) {
            const partRevs = await Promise.all(
                input.partRevisions.map((pr) => this.dao.partRevision.lastByPartId(db, pr.partId))
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

    updateRequest(
        ctx: ApiContext,
        id: Id,
        { description }: ChangeRequestUpdateInput
    ): Promise<ChangeRequest> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        return this.dao.changeRequest.update(db, id, { description, userId });
    }
}
