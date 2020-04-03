import {
    ChangePartChange,
    ChangePartCreate,
    ChangePartRevision,
    ChangeRequest,
    Id,
    ChangeReview,
} from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { ApiContext } from '.';
import { assertUserPerm } from './helpers';

export class ChangeControl {
    constructor(private dao: DaoSet) {}

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
}
