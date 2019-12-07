import { User, UserInput, Role } from '@engspace/core';
import { Db, LoginDao, UserDao } from '@engspace/server-db';

export interface UserInputWithPswd extends UserInput {
    password: string;
}

export const userInput = [
    // email is [name]@engspace.demo
    // password is [name]
    {
        name: 'gerard',
        fullName: 'Gerard Admin',
        roles: [Role.Admin],
    },
    {
        name: 'ambre',
        fullName: 'Ambre Manager',
        roles: [Role.Manager],
    },
    {
        name: 'tania',
        fullName: 'Tania Program Leader',
        roles: [Role.User],
    },
    {
        name: 'alphonse',
        fullName: 'Alphonse Program Leader',
        roles: [Role.User],
    },
    {
        name: 'robin',
        fullName: 'Robin Designer',
        roles: [Role.User],
    },
    {
        name: 'fatima',
        fullName: 'Fatima Designer',
        roles: [Role.User],
    },
    {
        name: 'sophie',
        fullName: 'Sophie Designer',
        roles: [Role.User],
    },
    {
        name: 'philippe',
        fullName: 'Philippe Designer',
        roles: [Role.User],
    },
    {
        name: 'sylvie',
        fullName: 'Sylvie Engineer',
        roles: [Role.User],
    },
    {
        name: 'pascal',
        fullName: 'Pascal Engineer',
        roles: [Role.User],
    },
];

export function prepareUsers(): UserInput[] {
    return userInput.map(u => ({
        email: `${u.name}@engspace.demo`,
        ...u,
    }));
}

export function prepareUsersWithPswd(): UserInputWithPswd[] {
    return userInput.map(u => ({
        email: `${u.name}@engspace.demo`,
        password: u.name,
        ...u,
    }));
}

export async function createUsers(db: Db): Promise<User[]> {
    const users = prepareUsersWithPswd();
    return Promise.all(
        users.map(async u => {
            const user = await UserDao.create(db, u);
            await LoginDao.create(db, user.id, u.password);
            return user;
        })
    );
}
