
import { CommonQueryMethodsType } from 'slonik';
import { Project } from '@engspace/core';
import { UserDao, ProjectDao } from '@engspace/server-api/dist/db/dao';

export const projectInput = [
    // must map user before using as project
    {
        name: 'Desk Awesome',
        code: 'office01',
        description: 'An awesome desk to work on.',
        members: [
            {
                user: 'tania',
                leader: true,
                designer: false,
            },
            {
                user: 'fatima',
                leader: false,
                designer: true,
            },
            {
                user: 'philippe',
                leader: false,
                designer: true,
            },
            {
                user: 'pascal',
                leader: false,
                designer: false,
            },
        ],
    },
    {
        name: 'Chair Incredible',
        code: 'office02',
        description: 'An incredible chair to sit on.',
        members: [
            {
                user: 'alphonse',
                leader: true,
                designer: false,
            },
            {
                user: 'robin',
                leader: false,
                designer: true,
            },
            {
                user: 'sophie',
                leader: false,
                designer: true,
            },
            {
                user: 'sylvie',
                leader: false,
                designer: false,
            },
        ],
    },
];

export async function prepareProjects(db: CommonQueryMethodsType): Promise<Project[]> {
    return Promise.all(projectInput.map(async (p) => {
        const newP = {
            name: p.name,
            code: p.code,
            description: p.description,
            members: await Promise.all(p.members.map(async m => ({
                leader: m.leader,
                designer: m.designer,
                user: await UserDao.findByName(db, m.user),
            }))),
        };
        return new Project(newP);
    }));
}

export async function createProjects(db: CommonQueryMethodsType): Promise<Project[]> {
    const projects = await prepareProjects(db);
    return await Promise.all(projects.map(p => ProjectDao.create(db, p)));
}
