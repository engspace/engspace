import { sql } from 'slonik';
import { User, Role, UserInput } from '@engspace/core';
import { Db } from '..';
import { partialAssignmentList } from '../util';
import { idsFindMap } from '.';

export interface UserSearch {
    phrase?: string;
    role?: Role;
    limit?: number;
    offset?: number;
}

export class UserDao {
    static async create(db: Db, user: UserInput): Promise<User> {
        const res: User = await db.one(sql`
            INSERT INTO "user"(name, email, full_name, updated_on)
            VALUES(${user.name}, ${user.email}, ${user.fullName}, now())
            RETURNING id, name, email, full_name
        `);
        await insertRoles(db, user.roles, res.id);
        return res;
    }

    static async byId(db: Db, id: number): Promise<User> {
        const user: User = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE id = ${id}
        `);
        return user;
    }

    static async byName(db: Db, name: string): Promise<User> {
        const user: User = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE name = ${name}
        `);
        return user;
    }

    static async batchByIds(db: Db, ids: readonly number[]): Promise<User[]> {
        const users: User[] = await db.any(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE id = ANY(${sql.array(ids as number[], 'int4')})
        `);
        return idsFindMap(ids, users);
    }

    static async search(db: Db, search: UserSearch): Promise<{ count: number; users: User[] }> {
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
        const users: User[] = await db.any(sql`
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

    static async patch(db: Db, id: number, user: Partial<User>): Promise<User> {
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
