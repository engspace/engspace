import DataLoader from 'dataloader';
import { Id, User } from '@engspace/core';
import { ApiContext } from '../control';

export interface GqlLoaders {
    user: DataLoader<Id, User>;
}

export function makeLoaders(ctx: ApiContext): GqlLoaders {
    return {
        user: new DataLoader((ids) => ctx.runtime.control.user.byIds(ctx, ids)),
    };
}
