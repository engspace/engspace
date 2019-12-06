import { IUser, IProject } from '@engspace/core';
import { Db, UserDao, ProjectDao } from '@engspace/server-db';

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
    return UserDao.search(db, {
        phrase,
        offset,
        limit,
    });
}

export async function searchProjects(
    perms: string[],
    db: Db,
    phrase: string,
    pag?: Pagination
): Promise<{ count: number; projects: IProject[] }> {
    if (!perms.includes('project.get')) return null;
    const { offset, limit } = pag;
    return ProjectDao.search(db, {
        phrase,
        offset,
        limit,
    });
}
