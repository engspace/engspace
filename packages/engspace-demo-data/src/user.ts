import { CommonQueryMethodsType } from 'slonik';
import { User, Role } from '@engspace/core';
import { UserDao } from '@engspace/server-db';

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

export function prepareUsers(): User[] {
    return userInput.map(
        u =>
            new User({
                email: `${u.name}@engspace.demo`,
                ...u,
            })
    );
}

export function prepareUsersWithPswd(): User[] {
    return userInput.map(
        u =>
            new User({
                email: `${u.name}@engspace.demo`,
                password: u.name,
                ...u,
            })
    );
}

export async function createUsers(db: CommonQueryMethodsType): Promise<User[]> {
    const users = prepareUsersWithPswd();
    return await Promise.all(users.map(u => UserDao.create(db, u)));
}
