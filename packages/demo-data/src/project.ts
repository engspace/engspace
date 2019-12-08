import { Project, ProjectInput } from '@engspace/core';
import { Db, UserDao, ProjectDao } from '@engspace/server-db';

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

export async function prepareProjects(db: Db): Promise<ProjectInput[]> {
    return Promise.all(
        projectInput.map(async p => {
            const newP = {
                name: p.name,
                code: p.code,
                description: p.description,
                members: await Promise.all(
                    p.members.map(async m => ({
                        leader: m.leader,
                        designer: m.designer,
                        user: await UserDao.byName(db, m.user),
                    }))
                ),
            };
            return newP;
        })
    );
}

export async function createProjects(db: Db): Promise<Project[]> {
    const projects = await prepareProjects(db);
    return Promise.all(projects.map(p => ProjectDao.create(db, p)));
}