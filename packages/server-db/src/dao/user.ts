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

async function insertRoles(db: Db, id: Id, roles: string[]): Promise<string[]> {
    return (await db.manyFirst(sql`
        INSERT INTO user_role(
            user_id, role
        ) VALUES ${sql.join(
            roles.map(role => sql`(${id}, ${role})`),
            sql`, `
        )}
        RETURNING role
    `)) as string[];
}

async function updateRoles(db: Db, id: Id, roles: string[]): Promise<string[]> {
    await db.query(sql`
        DELETE FROM user_role WHERE user_id = ${id}
    `);
    return insertRoles(db, id, roles);
}

class UserDao extends DaoIdent<User> {
    async create(db: Db, user: UserInput): Promise<User> {
        const row: User = await db.one(sql`
            INSERT INTO "user"(name, email, full_name)
            VALUES(${user.name}, ${user.email}, ${user.fullName})
            RETURNING ${rowToken}
        `);
        if (user.roles && user.roles.length) {
            row.roles = await insertRoles(db, row.id, user.roles);
        }
        return row;
    }

    async byName(db: Db, name: string): Promise<User> {
        const user: User = await db.one(sql`
            SELECT ${rowToken}
            FROM "user"
            WHERE name = ${name}
        `);
        return user;
    }

    async byEmail(db: Db, email: string): Promise<User> {
        const user: User = await db.one(sql`
            SELECT ${rowToken}
            FROM "user"
            WHERE email = ${email}
        `);
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

    async update(db: Db, id: Id, user: UserInput): Promise<User> {
        const { name, email, fullName, roles } = user;
        const row = await db.one<User>(sql`
            UPDATE "user" SET name=${name}, email=${email}, full_name=${fullName}
            WHERE id=${id}
            RETURNING ${rowToken}
        `);
        if (roles) {
            row.roles = await updateRoles(db, id, roles);
        }
        return row;
    }

    async patch(db: Db, id: Id, user: Partial<UserInput>): Promise<User> {
        const assignments = partialAssignmentList(user, ['name', 'email', 'fullName']);
        if (!assignments.length && !user.roles) {
            throw new Error('no valid field to patch');
        }
        let row: User;
        if (assignments.length) {
            row = await db.one(sql`
                UPDATE "user" SET ${sql.join(assignments, sql`, `)}
                WHERE id = ${id}
                RETURNING ${rowToken}
            `);
        } else {
            row = await this.byId(db, id);
        }
        if (user.roles) {
            await db.query(sql`
                DELETE FROM user_role WHERE user_id = ${id}
            `);
            row.roles = await insertRoles(db, row.id, user.roles);
        }
        return row;
    }
}

export const userDao = new UserDao({
    table: 'user',
    rowToken,
});
