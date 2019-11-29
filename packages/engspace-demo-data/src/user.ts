import { CommonQueryMethodsType } from 'slonik';
import { User, Role } from '@engspace/core';
import { UserDao, Pool } from '@engspace/server-db';

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
        roles: [],
    },
    {
        name: 'alphonse',
        fullName: 'Alphonse Program Leader',
        roles: [],
    },
    {
        name: 'robin',
        fullName: 'Robin Designer',
        roles: [],
    },
    {
        name: 'fatima',
        fullName: 'Fatima Designer',
        roles: [],
    },
    {
        name: 'sophie',
        fullName: 'Sophie Designer',
        roles: [],
    },
    {
        name: 'philippe',
        fullName: 'Philippe Designer',
        roles: [],
    },
    {
        name: 'sylvie',
        fullName: 'Sylvie Engineer',
        roles: [],
    },
    {
        name: 'pascal',
        fullName: 'Pascal Engineer',
        roles: [],
    },
];

export async function prepareUsers(
    db: CommonQueryMethodsType
): Promise<User[]> {
    return Promise.all(
        userInput.map(
            async u =>
                new User({
                    email: `${u.name}@engspace.demo`,
                    permissions: await UserDao.rolesPermissions(db, u.roles),
                    ...u,
                })
        )
    );
}

export async function prepareUsersWithPswd(
    db: CommonQueryMethodsType
): Promise<User[]> {
    return Promise.all(
        userInput.map(
            async u =>
                new User({
                    email: `${u.name}@engspace.demo`,
                    password: u.name,
                    permissions: await UserDao.rolesPermissions(db, u.roles),
                    ...u,
                })
        )
    );
}

export async function createUsers(db: CommonQueryMethodsType): Promise<User[]> {
    const users = await prepareUsersWithPswd(db);
    return await Promise.all(users.map(u => UserDao.create(db, u)));
}
