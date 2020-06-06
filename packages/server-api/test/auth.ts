import { AuthToken, HasId, User, UserInput } from '@engspace/core';
import { Db } from '@engspace/server-db';
import { signJwt } from '../src/crypto';
import { authJwtSecret } from '../src/internal';
import { dao, rolePolicies } from '.';

export function auth(user: User): AuthToken {
    return {
        userId: user.id,
        userPerms: rolePolicies.user.permissions(user.roles as string[]),
    };
}

export function permsAuth(user: HasId, userPerms: string[]): AuthToken {
    return {
        userId: user.id,
        userPerms,
    };
}

export async function createAuth(db: Db, userInput: UserInput): Promise<AuthToken> {
    const user = await dao.user.create(db, userInput);
    return auth(user);
}

export async function bearerToken(auth: AuthToken): Promise<string> {
    return signJwt(auth, authJwtSecret, { expiresIn: '12H' });
}
