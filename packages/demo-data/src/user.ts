import { Role, User, UserInput } from '@engspace/core';
import { Db, UserDao } from '@engspace/server-db';

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
    roles: Role[];
}

export const userInput: { [idx: string]: Input } = {
    // email is [name]@engspace.demo
    // password is [name]
    gerard: {
        fullName: 'Gerard Admin',
        roles: [Role.Admin],
    },
    ambre: {
        fullName: 'Ambre Manager',
        roles: [Role.Manager],
    },
    tania: {
        fullName: 'Tania Program Leader',
        roles: [Role.User],
    },
    alphonse: {
        fullName: 'Alphonse Program Leader',
        roles: [Role.User],
    },
    robin: {
        fullName: 'Robin Designer',
        roles: [Role.User],
    },
    fatima: {
        fullName: 'Fatima Designer',
        roles: [Role.User],
    },
    sophie: {
        fullName: 'Sophie Designer',
        roles: [Role.User],
    },
    philippe: {
        fullName: 'Philippe Designer',
        roles: [Role.User],
    },
    sylvie: {
        fullName: 'Sylvie Engineer',
        roles: [Role.User],
    },
    pascal: {
        fullName: 'Pascal Engineer',
        roles: [Role.User],
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

export async function createUsers(db: Db, users: DemoUserInputSet): Promise<DemoUserSet> {
    const keyVals = await Promise.all(
        Object.entries(users).map(async ([name, input]) => [name, await UserDao.create(db, input)])
    );
    return Object.fromEntries(keyVals);
}
