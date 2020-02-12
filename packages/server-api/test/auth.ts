import { AuthToken, User, UserInput } from '@engspace/core';
import { Db, userDao } from '@engspace/server-db';
import { rolePolicies } from '.';

export function auth(user: User): AuthToken {
    return {
        userId: user.id,
        userPerms: rolePolicies.user.permissions(user.roles as string[]),
    };
}

export async function createAuth(db: Db, userInput: UserInput): Promise<AuthToken> {
    const user = await userDao.create(db, userInput);
    return auth(user);
}
