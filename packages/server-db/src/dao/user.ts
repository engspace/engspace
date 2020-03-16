import { Id, User, UserInput } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { partialAssignmentList } from '../util';
import { DaoIdent } from './base';

export interface UserSearch {
    phrase?: string;
    role?: string;
    limit?: number;
    offset?: number;
}

const rowToken = sql`id, name, email, full_name`;

class UserDao extends DaoIdent<User> {
    async create(db: Db, { name, email, fullName }: UserInput): Promise<User> {
        return db.one(sql`
            INSERT INTO "user"(name, email, full_name)
            VALUES(${name}, ${email}, ${fullName})
            RETURNING ${rowToken}
        `);
    }

    async insertRoles(db: Db, id: Id, roles: string[]): Promise<string[]> {
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

    async byName(db: Db, name: string): Promise<User> {
        return db.maybeOne(sql`
            SELECT ${rowToken}
            FROM "user"
            WHERE name = ${name}
        `);
    }

    async byEmail(db: Db, email: string): Promise<User> {
        return db.maybeOne(sql`
            SELECT ${rowToken}
            FROM "user"
            WHERE email = ${email}
        `);
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

    async update(db: Db, id: Id, { name, email, fullName }: UserInput): Promise<User> {
        return db.maybeOne<User>(sql`
            UPDATE "user" SET name=${name}, email=${email}, full_name=${fullName}
            WHERE id=${id}
            RETURNING ${rowToken}
        `);
    }

    async updateRoles(db: Db, userId: Id, roles: string[]): Promise<string[]> {
        await db.query(sql`
            DELETE FROM user_role WHERE user_id = ${userId}
        `);

        if (roles.length) {
            return this.insertRoles(db, userId, roles);
        }
        return [];
    }
}

export const userDao = new UserDao({
    table: 'user',
    rowToken,
});
