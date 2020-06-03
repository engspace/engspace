import { Id, User } from '@engspace/core';
import DataLoader from 'dataloader';
import { ControllerSet, ApiContext } from '../control';

export interface GqlLoaders {
    user: DataLoader<Id, User>;
}

export function makeLoaders(ctx: ApiContext, control: ControllerSet): GqlLoaders {
    return {
        user: new DataLoader((ids) => control.user.byIds(ctx, ids)),
    };
}
