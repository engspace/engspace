import { CommonQueryMethodsType } from 'slonik';
import { User } from '@engspace/core';
import { UserDao } from '@engspace/server-db';

export const userInput = [
    // email is [name]@engspace.demo
    // password is [name]
    {
        name: 'gerard',
        fullName: 'Gerard Admin',
        admin: true,
        manager: false,
    },
    {
        name: 'ambre',
        fullName: 'Ambre Manager',
        admin: false,
        manager: true,
    },
    {
        name: 'tania',
        fullName: 'Tania Program Leader',
        admin: false,
        manager: false,
    },
    {
        name: 'alphonse',
        fullName: 'Alphonse Program Leader',
        admin: false,
        manager: false,
    },
    {
        name: 'robin',
        fullName: 'Robin Designer',
        admin: false,
        manager: false,
    },
    {
        name: 'fatima',
        fullName: 'Fatima Designer',
        admin: false,
        manager: false,
    },
    {
        name: 'sophie',
        fullName: 'Sophie Designer',
        admin: false,
        manager: false,
    },
    {
        name: 'philippe',
        fullName: 'Philippe Designer',
        admin: false,
        manager: false,
    },
    {
        name: 'sylvie',
        fullName: 'Sylvie Engineer',
        admin: false,
        manager: false,
    },
    {
        name: 'pascal',
        fullName: 'Pascal Engineer',
        admin: false,
        manager: false,
    },
];

export function prepareUsersWithPswd(): User[] {
    return userInput.map(
        u =>
            new User({
                ...u,
                email: `${u.name}@engspace.demo`,
                password: u.name,
            })
    );
}

export function prepareUsers(): User[] {
    return userInput.map(
        u =>
            new User({
                ...u,
                email: `${u.name}@engspace.demo`,
            })
    );
}

export async function createUsers(db: CommonQueryMethodsType): Promise<User[]> {
    const users = prepareUsersWithPswd();
    return await Promise.all(
        users.map(u => {
            return UserDao.create(db, u);
        })
    );
}
