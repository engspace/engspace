import { IUser } from '@engspace/core';
import { Db } from '@engspace/server-db';

export interface Pagination {
    offset: number;
    limit: number;
}

export async function getUsers(
    db: Db,
    perms: string[],
    phrase: string,
    pag: Pagination
): Promise<IUser[]> {
    return null;
}
