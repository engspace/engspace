import { Project, ProjectInput } from '@engspace/core';

export const projectInput = {
    chair: {
        name: 'Chair Incredible',
        description: 'An incredible chair to sit on.',
    },
    desk: {
        name: 'Desk Awesome',
        description: 'An awesome desk to work on.',
    },
};

export enum DemoProject {
    Chair = 'chair',
    Desk = 'desk',
}

export interface DemoProjectInputSet {
    [code: string]: ProjectInput;
}
export interface DemoProjectSet {
    [code: string]: Project;
}

export function prepareProjects(): DemoProjectInputSet {
    return Object.fromEntries(
        Object.entries(projectInput).map(([code, { name, description }]) => [
            code,
            {
                code,
                name,
                description,
            },
        ])
    );
}
