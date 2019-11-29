import { CommonQueryMethodsType, sql } from 'slonik';
import { IUser, Role } from '@engspace/core';

async function userRoles(
    db: CommonQueryMethodsType,
    id: number
): Promise<Role[]> {
    const roles = await db.anyFirst(sql`
        SELECT role FROM user_role
        WHERE user_id = ${id}
    `);
    return roles as Role[];
}

async function userPermissions(
    db: CommonQueryMethodsType,
    id: number
): Promise<string[]> {
    const perms = await db.anyFirst(sql`
        SELECT perm FROM role_permission AS rp
        LEFT OUTER JOIN user_role AS ur ON ur.role = rp.role
        LEFT OUTER JOIN "user" AS u ON u.id = ur.user_id
        WHERE u.id = ${id}
    `);
    return perms as string[];
}

async function insertRoles(
    db: CommonQueryMethodsType,
    roles: Role[],
    id: number
): Promise<void> {
    const roleArr = roles.map(r => [id, r]);
    await db.any(sql`
        INSERT INTO user_role(
            user_id, role
        )
        SELECT * FROM ${sql.unnest(roleArr, ['int4', 'text'])}
    `);
}

export class UserDao {
    static async adminRegistered(db: CommonQueryMethodsType): Promise<boolean> {
        const count = await db.oneFirst(sql`
            SELECT count(*) FROM "user" AS u
            LEFT OUTER JOIN user_role AS ur ON ur.user_id = u.id
            WHERE ur.role == ${Role.Admin}
        `);
        return count !== 0;
    }

    static async rolePermissions(
        db: CommonQueryMethodsType,
        role: Role
    ): Promise<string[]> {
        return (await db.manyFirst(sql`
            SELECT perm FROM role_permission
            WHERE role = ${role}
        `)) as string[];
    }

    static async rolesPermissions(
        db: CommonQueryMethodsType,
        roles: Role[]
    ): Promise<string[]> {
        if (!roles.length) {
            return [];
        }
        return (await db.manyFirst(sql`
            SELECT perm FROM role_permission
            WHERE role = ANY(${sql.array(roles, 'text')})
        `)) as string[];
    }

    static async findById(
        db: CommonQueryMethodsType,
        id: number
    ): Promise<IUser> {
        const user: IUser = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE id = ${id}
        `);
        user.permissions = await userPermissions(db, user.id);
        user.roles = await userRoles(db, user.id);
        return user;
    }

    static async findByName(
        db: CommonQueryMethodsType,
        name: string
    ): Promise<IUser> {
        const user: IUser = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE name = ${name}
        `);
        user.permissions = await userPermissions(db, user.id);
        user.roles = await userRoles(db, user.id);
        return user;
    }

    static async findByEmail(
        db: CommonQueryMethodsType,
        email: string
    ): Promise<IUser> {
        const user: IUser = await db.one(sql`
            SELECT id, name, email, full_name
            FROM "user"
            WHERE email = ${email}
        `);
        user.permissions = await userPermissions(db, user.id);
        user.roles = await userRoles(db, user.id);
        return user;
    }

    static async hasPasswordById(
        db: CommonQueryMethodsType,
        id: number
    ): Promise<boolean> {
        const password = await db.oneFirst(sql`
            SELECT password
            FROM "user"
            WHERE id = ${id}
        `);
        return password !== null;
    }

    static async create(
        db: CommonQueryMethodsType,
        user: IUser
    ): Promise<IUser> {
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

    static async deleteAll(db: CommonQueryMethodsType): Promise<void> {
        await db.query(sql`DELETE FROM "user"`);
    }

    static async deleteById(
        db: CommonQueryMethodsType,
        id: number
    ): Promise<void> {
        await db.query(sql`DELETE FROM "user" WHERE id = ${id}`);
    }
}
