import { Id, Role, User, UserInput } from '@engspace/core';
import { sql } from 'slonik';
import { idsFindMap } from '.';
import { Db } from '..';
import { partialAssignmentList } from '../util';

export interface UserSearch {
    phrase?: string;
    role?: Role;
    limit?: number;
    offset?: number;
}

export class UserDao {
    static async create(db: Db, user: UserInput): Promise<User> {
        const row: User = await db.one(sql`
            INSERT INTO "user"(name, email, full_name, updated_on)
            VALUES(${user.name}, ${user.email}, ${user.fullName}, now())
            RETURNING id, name, email, full_name
        `);
        if (user.roles && user.roles.length) {
            row.roles = await insertRoles(db, row.id, user.roles);
        }
        return row;
    }

    static async byId(db: Db, id: Id): Promise<User> {
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

    static async byEmail(db: Db, email: string): Promise<User> {
        const user: User = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE email = ${email}
        `);
        return user;
    }

    static async batchByIds(db: Db, ids: readonly Id[]): Promise<User[]> {
        const users: User[] = await db.any(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE id = ANY(${sql.array(ids as Id[], sql`uuid[]`)})
        `);
        return idsFindMap(ids, users);
    }

    static async search(db: Db, search: UserSearch): Promise<{ count: number; users: User[] }> {
        const boolExpressions = [sql`TRUE`];
        if (search.phrase) {
            const phrase = `%${search.phrase.replace(/\s/g, '%')}%`;
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

    static async rolesById(db: Db, id: Id): Promise<Role[]> {
        const roles = await db.anyFirst(sql`
            SELECT role FROM user_role
            WHERE user_id = ${id}
        `);
        return roles as Role[];
    }

    static async patch(db: Db, id: Id, user: Partial<User>): Promise<User> {
        const assignments = partialAssignmentList(user, ['name', 'email', 'fullName']);
        if (!assignments.length && !user.roles) {
            throw new Error('no valid field to patch');
        }
        let row: User;
        if (assignments.length) {
            row = await db.one(sql`
                UPDATE "user" SET ${sql.join(assignments, sql`, `)}
                WHERE id = ${id}
                RETURNING id, name, email, full_name
            `);
        } else {
            row = await UserDao.byId(db, id);
        }
        if (user.roles) {
            await db.query(sql`
                DELETE FROM user_role WHERE user_id = ${id}
            `);
            row.roles = await insertRoles(db, row.id, user.roles);
        }
        return row;
    }

    static async deleteAll(db: Db): Promise<void> {
        await db.query(sql`DELETE FROM "user"`);
    }

    static async deleteById(db: Db, id: Id): Promise<void> {
        await db.query(sql`DELETE FROM "user" WHERE id = ${id}`);
    }
}
async function insertRoles(db: Db, id: Id, roles: Role[]): Promise<Role[]> {
    return (await db.manyFirst(sql`
        INSERT INTO user_role(
            user_id, role
        ) VALUES ${sql.join(
            roles.map(role => sql`(${id}, ${role})`),
            sql`, `
        )}
        RETURNING role
    `)) as Role[];
}
