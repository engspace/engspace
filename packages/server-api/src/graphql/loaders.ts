import { Id, User } from '@engspace/core';
import DataLoader from 'dataloader';
import { UserControl, ApiContext } from '../controllers';

export interface GqlLoaders {
    user: DataLoader<Id, User>;
}

export function makeLoaders(ctx: ApiContext): GqlLoaders {
    return {
        user: new DataLoader(ids => UserControl.byIds(ctx, ids)),
    };
}
