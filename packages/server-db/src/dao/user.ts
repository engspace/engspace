import { Id, User, UserInput } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { DaoIdent } from './base';

export interface UserSearch {
    phrase?: string;
    role?: string;
    limit?: number;
    offset?: number;
}

const rowToken = sql`id, name, email, full_name`;

async function insertRoles(db: Db, id: Id, roles: string[]): Promise<string[]> {
    const rows = await db.manyFirst(sql`
            INSERT INTO user_role(
                user_id, role
            ) VALUES ${sql.join(
                roles.map(role => sql`(${id}, ${role})`),
                sql`, `
            )}
            RETURNING role
        `);
    return rows as string[];
}

export interface RoleOptions {
    withRoles: boolean;
}

export class UserDao extends DaoIdent<User> {
    constructor() {
        super({
            rowToken,
            table: 'user',
        });
    }

    async create(
        db: Db,
        { name, email, fullName, roles }: UserInput,
        { withRoles }: RoleOptions = { withRoles: false }
    ): Promise<User> {
        const user: User = await db.one(sql`
            INSERT INTO "user"(name, email, full_name)
            VALUES(${name}, ${email}, ${fullName})
            RETURNING ${rowToken}
        `);
        if (withRoles && roles && roles.length) {
            user.roles = await insertRoles(db, user.id, roles);
        }
        return user;
    }

    async byId(db: Db, id: Id, { withRoles }: RoleOptions = { withRoles: false }): Promise<User> {
        const user: User = await db.maybeOne(sql`
            SELECT ${rowToken}
            FROM "user"
            WHERE id = ${id}
        `);
        if (user && withRoles) {
            user.roles = await this.rolesById(db, id);
        }
        return user;
    }

    async byName(
        db: Db,
        name: string,
        { withRoles }: RoleOptions = { withRoles: false }
    ): Promise<User> {
        const user: User = await db.maybeOne(sql`
            SELECT ${rowToken}
            FROM "user"
            WHERE name = ${name}
        `);
        if (user && withRoles) {
            user.roles = await this.rolesById(db, user.id);
        }
        return user;
    }

    async byEmail(
        db: Db,
        email: string,
        { withRoles }: RoleOptions = { withRoles: false }
    ): Promise<User> {
        const user: User = await db.maybeOne(sql`
            SELECT ${rowToken}
            FROM "user"
            WHERE email = ${email}
        `);
        if (user && withRoles) {
            user.roles = await this.rolesById(db, user.id);
        }
        return user;
    }

    async search(db: Db, search: UserSearch): Promise<{ count: number; users: User[] }> {
        const boolExpressions = [sql`TRUE`];
        if (search.phrase) {
            const phrase = `%${search.phrase.replace(/\s/g, '%')}%`;
            boolExpressions.push(sql`(
                u.name ILIKE ${phrase} OR
                u.email ILIKE ${phrase} OR
                u.full_name ILIKE ${phrase})`);
        }
        let joinToken = sql``;
        if (search.role) {
            boolExpressions.push(sql`
                ur.role = ${search.role}
            `);
            joinToken = sql`LEFT OUTER JOIN user_role AS ur ON ur.user_id = u.id`;
        }
        const whereToken = sql.join(boolExpressions, sql` AND `);
        const limitToken = sql`${search.limit ? search.limit : 1000}`;
        const offset = search.offset ? search.offset : 0;
        const offsetToken = sql`${offset}`;
        const users: User[] = await db.any(sql`
            SELECT u.id, u.name, u.email, u.full_name
            FROM "user" AS u
            ${joinToken}
            WHERE ${whereToken}
            LIMIT ${limitToken}
            OFFSET ${offsetToken}
        `);
        let count = users.length + offset;
        if (search.limit && users.length === search.limit) {
            count = (await db.oneFirst(sql`
                SELECT COUNT(u.id) FROM "user" AS u
                LEFT OUTER JOIN user_role AS ur ON ur.user_id = u.id
                WHERE ${whereToken}
            `)) as number;
        }
        return { count, users };
    }

    async rolesById(db: Db, id: Id): Promise<string[]> {
        const roles = await db.anyFirst(sql`
            SELECT role FROM user_role
            WHERE user_id = ${id}
        `);
        return roles as string[];
    }

    async update(
        db: Db,
        id: Id,
        { name, email, fullName, roles }: UserInput,
        { withRoles }: RoleOptions = { withRoles: false }
    ): Promise<User> {
        const user: User = await db.maybeOne<User>(sql`
            UPDATE "user" SET name=${name}, email=${email}, full_name=${fullName}
            WHERE id=${id}
            RETURNING ${rowToken}
        `);
        if (user && withRoles) {
            user.roles = await this.updateRoles(db, id, roles);
        }
        return user;
    }

    async updateRoles(db: Db, userId: Id, roles: string[]): Promise<string[]> {
        await db.query(sql`
            DELETE FROM user_role WHERE user_id = ${userId}
        `);

        if (roles.length) {
            return insertRoles(db, userId, roles);
        }
        return [];
    }
}
