import { ProjectMember, ProjectRole } from '@engspace/core';
import { MemberDao } from '@engspace/server-db';
import { DemoProjectSet } from './project';
import { DemoUserSet } from './user';

export const membersInput = [
    // depending on project and user
    {
        project: 'chair',
        user: 'tania',
        roles: [ProjectRole.Leader],
    },
    {
        project: 'chair',
        user: 'fatima',
        roles: [ProjectRole.Designer],
    },
    {
        project: 'chair',
        user: 'philippe',
        roles: [ProjectRole.Designer],
    },
    {
        project: 'chair',
        user: 'pascal',
        roles: [],
    },
    {
        project: 'desk',
        user: 'alphonse',
        roles: [ProjectRole.Leader],
    },
    {
        project: 'desk',
        user: 'robin',
        roles: [ProjectRole.Designer],
    },
    {
        project: 'desk',
        user: 'sophie',
        roles: [ProjectRole.Designer],
    },
    {
        project: 'desk',
        user: 'sylvie',
        roles: [],
    },
];

export async function createMembers(
    db,
    projects: Promise<DemoProjectSet>,
    users: Promise<DemoUserSet>
): Promise<ProjectMember[]> {
    const [projs, usrs] = await Promise.all([projects, users]);
    return Promise.all(
        membersInput.map(async m =>
            MemberDao.create(db, {
                project: { id: projs[m.project].id },
                user: { id: usrs[m.user].id },
                roles: m.roles,
            })
        )
    );
}
