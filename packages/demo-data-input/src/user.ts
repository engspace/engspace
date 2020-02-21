import { User, UserInput } from '@engspace/core';

export enum DemoUser {
    Gerard = 'gerard',
    Ambre = 'ambre',
    Tania = 'tania',
    Alphonse = 'alphonse',
    Robin = 'robin',
    Fatima = 'fatima',
    Sophie = 'sophie',
    Philippe = 'philippe',
    Sylvie = 'sylvie',
    Pascal = 'pascal',
}

export interface DemoUserInputSet {
    [name: string]: UserInput;
}

export interface DemoUserSet {
    [name: string]: User;
}

interface Input {
    fullName: string;
    roles: string[];
}

export const userInput: { [idx: string]: Input } = {
    // email is [name]@engspace.demo
    // password is [name]
    gerard: {
        fullName: 'Gerard Admin',
        roles: ['admin'],
    },
    ambre: {
        fullName: 'Ambre Manager',
        roles: ['manager'],
    },
    tania: {
        fullName: 'Tania Program Leader',
        roles: ['user'],
    },
    alphonse: {
        fullName: 'Alphonse Program Leader',
        roles: ['user'],
    },
    robin: {
        fullName: 'Robin Designer',
        roles: ['user'],
    },
    fatima: {
        fullName: 'Fatima Designer',
        roles: ['user'],
    },
    sophie: {
        fullName: 'Sophie Designer',
        roles: ['user'],
    },
    philippe: {
        fullName: 'Philippe Designer',
        roles: ['user'],
    },
    sylvie: {
        fullName: 'Sylvie Engineer',
        roles: ['user'],
    },
    pascal: {
        fullName: 'Pascal Engineer',
        roles: ['user'],
    },
};

export function prepareUsers(): DemoUserInputSet {
    return Object.fromEntries(
        Object.entries(userInput).map(([name, { fullName, roles }]) => [
            name,
            {
                name,
                email: `${name}@engspace.demo`,
                fullName,
                roles,
            },
        ])
    );
}
