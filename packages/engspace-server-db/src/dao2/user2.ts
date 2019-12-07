import { sql } from 'slonik';
import { User2, Role } from '@engspace/core';
import { Db } from '..';
import { partialAssignmentList } from '../util';

export interface UserSearch {
    phrase?: string;
    role?: Role;
    limit?: number;
    offset?: number;
}

export interface LoginResult {
    id: number;
    name: string;
    roles: Role[];
}

export class UserDao2 {
    static async checkLogin(
        db: Db,
        nameOrEmail: string,
        password: string
    ): Promise<LoginResult | null> {
        interface Result {
            id: number;
            name: string;
            ok: boolean;
        }
        const result: Result = await db.one(sql`
            SELECT id, name, (password = crypt(${password}, password)) AS ok
            FROM "user"
            WHERE name = ${nameOrEmail} OR email = ${nameOrEmail}
        `);
        if (result.ok) {
            return {
                id: result.id,
                name: result.name,
                roles: await UserDao2.rolesById(db, result.id),
            };
        } else {
            return null;
        }
    }

    static async checkPasswordById(db: Db, id: number, password: string): Promise<boolean> {
        const ok = await db.oneFirst(sql`
            SELECT (password = crypt(${password}, password)) as ok
            FROM "user" WHERE id = ${id}
        `);
        return (ok as unknown) as boolean;
    }

    static async byId(db: Db, id: number): Promise<User2> {
        const user: User2 = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE id = ${id}
        `);
        return user;
    }

    static async byName(db: Db, name: string): Promise<User2> {
        const user: User2 = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE name = ${name}
        `);
        return user;
    }

    static async search(db: Db, search: UserSearch): Promise<{ count: number; users: User2[] }> {
        const boolExpressions = [sql`TRUE`];
        if (search.phrase) {
            const phrase = `%${search.phrase.replace(/s/g, '%')}%`;
            boolExpressions.push(sql`(
                u.name ILIKE ${phrase} OR
                u.email ILIKE ${phrase} OR
                u.full_name ILIKE ${phrase})`);
        }
        if (search.role) {
            boolExpressions.push(sql`
                ur.role = ${search.role}
            `);
        }
        const whereToken = sql.join(boolExpressions, sql` AND `);
        const limitToken = sql`${search.limit ? search.limit : 1000}`;
        const offset = search.offset ? search.offset : 0;
        const offsetToken = sql`${offset}`;
        const users: User2[] = await db.any(sql`
            SELECT u.id, u.name, u.email, u.full_name
            FROM "user" AS u
            LEFT OUTER JOIN user_role AS ur ON ur.user_id = u.id
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

    static async rolesById(db: Db, id: number): Promise<Role[]> {
        const roles = await db.anyFirst(sql`
            SELECT role FROM user_role
            WHERE user_id = ${id}
        `);
        return roles as Role[];
    }

    static async patch(db: Db, id: number, user: Partial<User2>): Promise<User2> {
        const assignments = partialAssignmentList(user, ['name', 'email', 'fullName']);
        await db.query(sql`
            UPDATE "user" SET ${sql.join(assignments, sql`, `)}
            WHERE id = ${id}
        `);
        if (user.roles) {
            await db.query(sql`
                DELETE FROM user_role WHERE user_id = ${id}
            `);
            insertRoles(db, user.roles, id);
        }
        return this.byId(db, id);
    }

    static async deleteAll(db: Db): Promise<void> {
        await db.query(sql`DELETE FROM "user"`);
    }

    static async deleteById(db: Db, id: number): Promise<void> {
        await db.query(sql`DELETE FROM "user" WHERE id = ${id}`);
    }
}
async function insertRoles(db: Db, roles: Role[], id: number): Promise<void> {
    const roleArr = roles.map(r => [id, r]);
    await db.any(sql`
        INSERT INTO user_role(
            user_id, role
        )
        SELECT * FROM ${sql.unnest(roleArr, ['int4', 'text'])}
    `);
}
