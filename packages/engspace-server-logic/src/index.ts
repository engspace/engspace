import { IUser } from '@engspace/core';
import { Db, UserDao } from '@engspace/server-db';

export interface Pagination {
    offset: number;
    limit: number;
}

export async function searchUsers(
    perms: string[],
    db: Db,
    phrase: string,
    pag?: Pagination
): Promise<{ count: number; users: IUser[] }> {
    if (!perms.includes('user.get')) return null;
    const { offset, limit } = pag;
    return await UserDao.search(db, {
        phrase,
        offset,
        limit,
    });
}
