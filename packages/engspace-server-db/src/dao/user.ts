import { CommonQueryMethodsType, sql } from 'slonik';
import { IUser, Role } from '@engspace/core';
import { partialAssignmentList } from '../util';

export interface UserSearch {
    phrase?: string;
    role?: Role;
    limit?: number;
    offset?: number;
}

export class UserDao {
    static async create(db: CommonQueryMethodsType, user: IUser): Promise<IUser> {
        const { name, email, fullName, password } = user;
        const { id } = await db.one(sql`
            INSERT INTO "user" (
                name, email, full_name, password, updated_on
            ) VALUES (
                ${name}, ${email}, ${fullName},
                crypt(${password as string}, gen_salt('bf')), now()
            ) RETURNING id
        `);
        insertRoles(db, user.roles, id);
        return this.findById(db, id);
    }

    static async adminRegistered(db: CommonQueryMethodsType): Promise<boolean> {
        const count = await db.oneFirst(sql`
            SELECT count(*) FROM "user" AS u
            LEFT OUTER JOIN user_role AS ur ON ur.user_id = u.id
            WHERE ur.role = ${Role.Admin}
        `);
        return count !== 0;
    }

    static async findById(db: CommonQueryMethodsType, id: number): Promise<IUser> {
        const user: IUser = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE id = ${id}
        `);
        user.roles = await userRoles(db, user.id);
        return user;
    }

    static async findByName(db: CommonQueryMethodsType, name: string): Promise<IUser> {
        const user: IUser = await db.maybeOne(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE name = ${name}
        `);
        user.roles = await userRoles(db, user.id);
        return user;
    }

    static async findByEmail(db: CommonQueryMethodsType, email: string): Promise<IUser> {
        const user: IUser = await db.maybeOne(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE email = ${email}
        `);
        user.roles = await userRoles(db, user.id);
        return user;
    }

    static async findByNameOrEmail(
        db: CommonQueryMethodsType,
        nameOrEmail: string
    ): Promise<IUser> {
        const user: IUser = await db.maybeOne(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE name = ${nameOrEmail} OR email = ${nameOrEmail}
        `);
        user.roles = await userRoles(db, user.id);
        return user;
    }

    static async hasPasswordById(db: CommonQueryMethodsType, id: number): Promise<boolean> {
        const password = await db.oneFirst(sql`
            SELECT password
            FROM "user"
            WHERE id = ${id}
        `);
        return password !== null;
    }

    static async checkPasswordById(
        db: CommonQueryMethodsType,
        id: number,
        password: string
    ): Promise<boolean> {
        const ok = await db.oneFirst(sql`
            SELECT (password = crypt(${password}, password)) as ok
            FROM "user" WHERE id = ${id}
        `);
        return (ok as unknown) as boolean;
    }

    static async search(
        db: CommonQueryMethodsType,
        search: UserSearch
    ): Promise<{ count: number; users: IUser[] }> {
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
        const usersWoRoles: IUser[] = await db.any(sql`
            SELECT u.id, u.name, u.email, u.full_name
            FROM "user" AS u
            LEFT OUTER JOIN user_role AS ur ON ur.user_id = u.id
            WHERE ${whereToken}
            LIMIT ${limitToken}
            OFFSET ${offsetToken}
        `);
        const users = await Promise.all(
            usersWoRoles.map(async u => ({
                roles: await userRoles(db, u.id),
                ...u,
            }))
        );
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

    static async patch(
        db: CommonQueryMethodsType,
        id: number,
        user: Partial<IUser>
    ): Promise<IUser> {
        if (user.id) throw new Error('Cannot patch user id!');
        const assignments = partialAssignmentList(user, ['name', 'email', 'fullName']);
        if (user.password) {
            assignments.push(
                sql`${sql.identifier(['password'])} = crypt(${user.password}, gen_salt('bf'))`
            );
        }
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
        return this.findById(db, id);
    }

    static async deleteAll(db: CommonQueryMethodsType): Promise<void> {
        await db.query(sql`DELETE FROM "user"`);
    }

    static async deleteById(db: CommonQueryMethodsType, id: number): Promise<void> {
        await db.query(sql`DELETE FROM "user" WHERE id = ${id}`);
    }
}

async function userRoles(db: CommonQueryMethodsType, id: number): Promise<Role[]> {
    const roles = await db.anyFirst(sql`
        SELECT role FROM user_role
        WHERE user_id = ${id}
    `);
    return roles as Role[];
}

async function insertRoles(db: CommonQueryMethodsType, roles: Role[], id: number): Promise<void> {
    const roleArr = roles.map(r => [id, r]);
    await db.any(sql`
        INSERT INTO user_role(
            user_id, role
        )
        SELECT * FROM ${sql.unnest(roleArr, ['int4', 'text'])}
    `);
}
