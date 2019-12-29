import { Id, Project, ProjectMember, ProjectRole, Role, User } from '@engspace/core';
import DataLoader from 'dataloader';
import { GqlContext } from '.';
import { MemberControl, ProjectControl, UserControl } from './controllers';

export interface GqlLoaders {
    user: DataLoader<Id, User>;
    roles: DataLoader<Id, Role[]>;
    project: DataLoader<Id, Project>;
    membersByProj: DataLoader<Id, ProjectMember[]>;
    membersByUser: DataLoader<Id, ProjectMember[]>;
    memberRoles: DataLoader<Id, ProjectRole[]>;
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
