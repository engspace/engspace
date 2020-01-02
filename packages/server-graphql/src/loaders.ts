import { Id, Project, ProjectMember, User } from '@engspace/core';
import DataLoader from 'dataloader';
import { GqlContext } from '.';
import { MemberControl, ProjectControl, UserControl } from './controllers';

export interface GqlLoaders {
    user: DataLoader<Id, User>;
    roles: DataLoader<Id, string[]>;
    project: DataLoader<Id, Project>;
    membersByProj: DataLoader<Id, ProjectMember[]>;
    membersByUser: DataLoader<Id, ProjectMember[]>;
    memberRoles: DataLoader<Id, string[]>;
}

export function makeLoaders(ctx: GqlContext): GqlLoaders {
    return {
        user: new DataLoader(ids => UserControl.byIds(ctx, ids)),
        roles: new DataLoader(userIds =>
            Promise.all(userIds.map(id => UserControl.rolesById(ctx, id)))
        ),
        project: new DataLoader(ids => ProjectControl.byIds(ctx, ids)),

        membersByProj: new DataLoader(projIds =>
            Promise.all(projIds.map(id => MemberControl.byProjectId(ctx, id)))
        ),
        membersByUser: new DataLoader(userIds =>
            Promise.all(userIds.map(id => MemberControl.byUserId(ctx, id)))
        ),
        memberRoles: new DataLoader(ids =>
            Promise.all(ids.map(id => MemberControl.rolesById(ctx, id)))
        ),
    };
}
