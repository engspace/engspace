import { User2, Project2, ProjectMember2, Role } from '@engspace/core';
import { Db, UserDao2, ProjectDao2 } from '@engspace/server-db';

export interface Pagination {
    offset: number;
    limit: number;
}

export async function searchUsers(
    perms: string[],
    db: Db,
    phrase: string,
    pag?: Pagination
): Promise<{ count: number; users: User2[] }> {
    if (!perms.includes('user.get')) return null;
    const { offset, limit } = pag;
    return UserDao2.search(db, {
        phrase,
        offset,
        limit,
    });
}

export async function userRoles(perms: string[], db: Db, userId: number): Promise<Role[]> {
    if (!perms.includes('user.get')) return null;
    return UserDao2.rolesById(db, userId);
}

export async function searchProjects(
    perms: string[],
    db: Db,
    phrase: string,
    pag?: Pagination
): Promise<{ count: number; projects: Project2[] }> {
    if (!perms.includes('project.get')) return null;
    const { offset, limit } = pag;
    return ProjectDao2.search(db, {
        phrase,
        offset,
        limit,
    });
}

export async function projectMembers(
    perms: string[],
    db: Db,
    projId: number
): Promise<ProjectMember2[]> {
    if (!perms.includes('project.get')) return null;
    return ProjectDao2.membersById(db, projId);
}
