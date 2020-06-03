import { ProjectMemberInput } from '@engspace/core';
import { DemoProject, DemoProjectSet } from './project';
import { DemoUser, DemoUserSet } from './user';

export interface ProjectMemberDemoInput {
    project: DemoProject;
    user: DemoUser;
    roles: string[];
}

export const membersInput: ProjectMemberDemoInput[] = [
    // depending on project and user
    {
        project: DemoProject.Chair,
        user: DemoUser.Tania,
        roles: ['leader'],
    },
    {
        project: DemoProject.Chair,
        user: DemoUser.Fatima,
        roles: ['designer'],
    },
    {
        project: DemoProject.Chair,
        user: DemoUser.Philippe,
        roles: ['designer'],
    },
    {
        project: DemoProject.Chair,
        user: DemoUser.Pascal,
        roles: [],
    },
    {
        project: DemoProject.Desk,
        user: DemoUser.Alphonse,
        roles: ['leader', 'designer'],
    },
    {
        project: DemoProject.Desk,
        user: DemoUser.Robin,
        roles: ['designer'],
    },
    {
        project: DemoProject.Desk,
        user: DemoUser.Fatima,
        roles: ['designer'],
    },
    {
        project: DemoProject.Desk,
        user: DemoUser.Sophie,
        roles: ['designer'],
    },
    {
        project: DemoProject.Desk,
        user: DemoUser.Sylvie,
        roles: [],
    },
];

export async function prepareMembers(
    input: ProjectMemberDemoInput[],
    projects: Promise<DemoProjectSet>,
    users: Promise<DemoUserSet>
): Promise<ProjectMemberInput[]> {
    const [projs, usrs] = await Promise.all([projects, users]);
    return input.map((m) => ({
        projectId: projs[m.project].id,
        userId: usrs[m.user].id,
        roles: m.roles,
    }));
}
