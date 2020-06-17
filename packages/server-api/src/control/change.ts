import { UserInputError } from 'apollo-server-koa';
import {
    ChangePartFork,
    ChangePartCreate,
    ChangePartRevision,
    Change,
    Id,
    ChangeReview,
    ChangeInput,
    PartCycle,
    ApprovalDecision,
    ChangeUpdateInput,
    ChangePartForkInput,
    ChangePartRevisionInput,
    ChangeCycle,
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

    async create(ctx: ApiContext, input: ChangeInput): Promise<Change> {
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
        const counter = await this.dao.globalCounter.bumpChange(db);
        const name = config.naming.change.buildName({ counter });
        const req = await this.dao.change.create(db, {
            name,
            description: input.description,
            userId,
        });
        if (input.partCreations)
            req.partCreations = await Promise.all(
                input.partCreations?.map((inp) =>
                    this.dao.changePartCreate.create(db, { changeId: req.id, ...inp })
                )
            );
        if (input.partForks)
            req.partForks = await Promise.all(
                input.partForks?.map((inp) =>
                    this.dao.changePartFork.create(db, { changeId: req.id, ...inp })
                )
            );
        if (input.partRevisions)
            req.partRevisions = await Promise.all(
                input.partRevisions?.map((inp) =>
                    this.dao.changePartRevision.create(db, { changeId: req.id, ...inp })
                )
            );
        if (input.reviewerIds) {
            req.reviews = await Promise.all(
                input.reviewerIds.map((id) =>
                    this.dao.changeReview.create(db, {
                        changeId: req.id,
                        assigneeId: id,
                        decision: ApprovalDecision.Pending,
                        userId,
                    })
                )
            );
        }

        return req;
    }

    change(ctx: ApiContext, id: Id): Promise<Change> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.change.byId(ctx.db, id);
    }

    partCreations(ctx: ApiContext, changeId: Id): Promise<ChangePartCreate[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changePartCreate.byRequestId(ctx.db, changeId);
    }

    partChanges(ctx: ApiContext, changeId: Id): Promise<ChangePartFork[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changePartFork.byRequestId(ctx.db, changeId);
    }

    partRevisions(ctx: ApiContext, changeId: Id): Promise<ChangePartRevision[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changePartRevision.byRequestId(ctx.db, changeId);
    }

    reviews(ctx: ApiContext, changeId: Id): Promise<ChangeReview[]> {
        assertUserPerm(ctx, 'change.read');
        return this.dao.changeReview.byRequestId(ctx.db, changeId);
    }

    createdParts(ctx: ApiContext, changeId: Id): Promise<Part[]> {
        assertUserPerm(ctx, 'part.read');
        // parts created by a change have their first revision associated with it
        return this.dao.part.whoseRev1IsCreatedBy(ctx.db, changeId);
    }

    revisedParts(ctx: ApiContext, changeId: Id): Promise<PartRevision[]> {
        assertUserPerm(ctx, 'part.read');
        return this.dao.partRevision.aboveRev1ByChangeId(ctx.db, changeId);
    }

    async update(
        ctx: ApiContext,
        changeId: Id,
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
        }: ChangeUpdateInput
    ): Promise<Change> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;

        let req = await this.dao.change.byId(db, changeId);

        await this.assertEditor(ctx, req);
        const promises = [];

        if (partCreationsRem?.length > 0) {
            const reqIds = await Promise.all(
                partCreationsRem.map((pcId) => this.dao.changePartCreate.checkRequestId(db, pcId))
            );
            if (!reqIds.every((reqId) => reqId == changeId)) {
                throw new UserInputError('Part creation do not belong to the Change request');
            }
            promises.push(
                partCreationsRem.map((id) => this.dao.changePartCreate.deleteById(db, id))
            );
        }

        if (partForksRem?.length > 0) {
            const reqIds = await Promise.all(
                partForksRem.map((pcId) => this.dao.changePartFork.checkRequestId(db, pcId))
            );
            if (!reqIds.every((reqId) => reqId == changeId)) {
                throw new UserInputError('Part change do not belong to the Change request');
            }
            promises.push(partForksRem.map((id) => this.dao.changePartFork.deleteById(db, id)));
        }

        if (partRevisionsRem?.length > 0) {
            const reqIds = await Promise.all(
                partRevisionsRem.map((prId) => this.dao.changePartRevision.checkRequestId(db, prId))
            );
            if (!reqIds.every((reqId) => reqId == changeId)) {
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
            if (!reqIds.every((reqId) => reqId === changeId)) {
                throw new UserInputError('Change review do not belong to the change');
            }
            promises.push(reviewsRem.map((id) => this.dao.changeReview.deleteById(db, id)));
        }

        if (partCreationsAdd?.length > 0) {
            promises.push(
                partCreationsAdd.map((inp) =>
                    this.dao.changePartCreate.create(db, { changeId, ...inp })
                )
            );
        }
        if (partForksAdd?.length > 0) {
            await this.checkPartChanges(ctx, partForksAdd);
            promises.push(
                partForksAdd.map((inp) => this.dao.changePartFork.create(db, { changeId, ...inp }))
            );
        }
        if (partRevisionsAdd?.length > 0) {
            await this.checkPartRevisions(ctx, partRevisionsAdd);
            promises.push(
                partRevisionsAdd.map((inp) =>
                    this.dao.changePartRevision.create(db, { changeId, ...inp })
                )
            );
        }
        if (reviewerIdsAdd?.length > 0) {
            promises.push(
                reviewerIdsAdd.map((id) =>
                    this.dao.changeReview.create(db, { changeId, userId, assigneeId: id })
                )
            );
        }

        if (description) {
            req = await this.dao.change.update(db, changeId, { description, userId });
        }

        await Promise.all(promises);

        return req;
    }

    async submit(ctx: ApiContext, id: Id): Promise<Change> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.change.byId(db, id);
        await this.assertEditor(ctx, req);
        if (req.cycle !== ChangeCycle.Preparation) {
            throw new UserInputError(`Can't submit a change that is in ${req.cycle} cycle`);
        }
        return this.dao.change.updateCycle(db, id, ChangeCycle.Evaluation, userId);
    }

    async withdraw(ctx: ApiContext, id: Id): Promise<Change> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.change.byId(db, id);
        await this.assertEditor(ctx, req);
        if (req.cycle !== ChangeCycle.Evaluation) {
            throw new UserInputError(`Can't submit a change that is in ${req.cycle} cycle`);
        }
        return this.dao.change.updateCycle(db, id, ChangeCycle.Preparation, userId);
    }

    async review(ctx: ApiContext, changeId: Id, input: ChangeReviewInput): Promise<ChangeReview> {
        assertUserPerm(ctx, 'change.review');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.change.byId(db, changeId);
        if (!req) {
            throw new UserInputError('Cannot find specified change');
        }
        if (req.cycle !== ChangeCycle.Evaluation) {
            throw new UserInputError('Cannot review a change that is not in validation');
        }
        const review = await this.dao.changeReview.byRequestAndAssigneeId(db, changeId, userId);
        if (!review) {
            const user = await this.dao.user.byId(db, userId);
            throw new UserInputError(
                `User ${user.fullName} is not a reviewer of the specified change`
            );
        }
        return this.dao.changeReview.update(db, review.id, {
            decision: input.decision,
            comments: input.comments,
            userId,
        });
    }

    async approve(ctx: ApiContext, changeId: Id): Promise<Change> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.change.byId(db, changeId);
        await this.assertEditor(ctx, req);

        if (req.cycle !== ChangeCycle.Evaluation) {
            throw new UserInputError(`Can't approve a change from the ${req.cycle} cycle`);
        }

        if (req.state !== ApprovalDecision.Approved && req.state !== ApprovalDecision.Reserved) {
            throw new UserInputError('Specified change does not have required approvals');
        }

        // Everything looks OK. Let's proceed to changes

        const creations = await this.dao.changePartCreate.byRequestId(db, changeId);
        const changes = await this.dao.changePartFork.byRequestId(db, changeId);
        const revisions = await this.dao.changePartRevision.byRequestId(db, changeId);
        for (const creation of creations) {
            await this.partControl.create(ctx, {
                familyId: creation.family.id,
                designation: creation.designation,
                initialVersion: creation.version,
                changeId: req.id,
            });
        }
        for (const change of changes) {
            await this.partControl.fork(ctx, {
                partId: change.part.id,
                designation: change.designation,
                version: change.version,
                changeId: req.id,
            });
        }
        for (const revision of revisions) {
            await this.partControl.revise(ctx, {
                partId: revision.part.id,
                designation: revision.designation,
                changeId: req.id,
            });
        }

        // All changes done without error. We bump the cycle to ENGINEERING and return result.

        return this.dao.change.updateCycle(db, changeId, ChangeCycle.Engineering, userId);
    }

    async cancel(ctx: ApiContext, id: Id): Promise<Change> {
        assertUserPerm(ctx, 'change.update');
        const {
            db,
            auth: { userId },
        } = ctx;
        const req = await this.dao.change.byId(db, id);
        await this.assertEditor(ctx, req);
        if (req.cycle === ChangeCycle.Engineering || req.cycle === ChangeCycle.Cancelled) {
            throw new UserInputError(`Cannot cancel a change that is in the ${req.cycle} cycle`);
        }
        return this.dao.change.updateCycle(db, id, ChangeCycle.Cancelled, userId);
    }

    private async checkPartChanges(
        { db, config }: ApiContext,
        partForks: ChangePartForkInput[]
    ): Promise<void> {
        const parts = await this.dao.part.batchByIds(
            db,
            partForks.map((pc) => pc.partId)
        );
        for (let i = 0; i < parts.length; ++i) {
            const prn = config.naming.partRef;
            const comps = prn.extractComps(parts[i].ref);
            const newRef = prn.buildName({
                ...comps,
                partVersion: partForks[i].version,
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

    private async assertEditor({ db, auth: { userId } }: ApiContext, req: Change): Promise<void> {
        // FIXME: editor list
        if (userId !== req.createdBy.id) {
            const user = await this.dao.user.byId(db, userId);
            throw new UserInputError(`User ${user.fullName} cannot edit the specified change`);
        }
    }
}
