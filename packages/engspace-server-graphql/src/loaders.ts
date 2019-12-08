import DataLoader from 'dataloader';
import { Role, User, Project } from '@engspace/core';
import { GqlContext } from '.';
import { UserControl, ProjectControl } from './controllers';

export interface GqlLoaders {
    user: DataLoader<number, User>;
    roles: DataLoader<number, Role[]>;
    project: DataLoader<number, Project>;
}

export function makeLoaders(ctx: GqlContext): GqlLoaders {
    return {
        user: new DataLoader(ids => UserControl.byIds(ctx, ids)),
        roles: new DataLoader((userIds: number[]) =>
            Promise.all(userIds.map(id => UserControl.roles(ctx, id)))
        ),
        project: new DataLoader(ids => ProjectControl.byIds(ctx, ids)),
    };
}
