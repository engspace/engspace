import { Id, User } from '@engspace/core';
import DataLoader from 'dataloader';
import { UserControl } from '../controllers';
import { GqlContext } from './context';

export interface GqlLoaders {
    user: DataLoader<Id, User>;
}

export function makeLoaders(ctx: GqlContext): GqlLoaders {
    return {
        user: new DataLoader(ids => UserControl.byIds(ctx, ids)),
    };
}
