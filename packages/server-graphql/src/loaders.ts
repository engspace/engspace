import DataLoader from 'dataloader';
import { Role, User, Project, ProjectMember } from '@engspace/core';
import { GqlContext } from '.';
import { UserControl, ProjectControl } from './controllers';

export interface GqlLoaders {
    user: DataLoader<number, User>;
    roles: DataLoader<number, Role[]>;
    project: DataLoader<number, Project>;
    members: DataLoader<number, ProjectMember[]>;
}

export function makeLoaders(ctx: GqlContext): GqlLoaders {
    return {
        user: new DataLoader(ids => UserControl.byIds(ctx, ids)),
        roles: new DataLoader((userIds: number[]) =>
            Promise.all(userIds.map(id => UserControl.roles(ctx, id)))
        ),
        project: new DataLoader(ids => ProjectControl.byIds(ctx, ids)),
        members: new DataLoader(projIds =>
            Promise.all(projIds.map(id => ProjectControl.members(ctx, id)))
        ),
    };
}
