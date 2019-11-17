import { CommonQueryMethodsType, sql } from 'slonik';
import { IUser } from '@engspace/core';

export class UserDao {
    static async adminRegistered(db: CommonQueryMethodsType): Promise<boolean> {
        const count = await db.oneFirst(sql`
            SELECT count(*) FROM "user" WHERE admin
        `);
        return count !== 0;
    }

    static async findById(db: CommonQueryMethodsType, id: number): Promise<IUser> {
        return db.one(sql`
            SELECT id, name, email, full_name, admin, manager
            FROM "user"
            WHERE id = ${id}
        `);
    }

    static async findByName(db: CommonQueryMethodsType, name: string): Promise<IUser> {
        return db.one(sql`
            SELECT id, name, email, full_name, admin, manager
            FROM "user"
            WHERE name = ${name}
        `);
    }

    static async findByEmail(db: CommonQueryMethodsType, email: string): Promise<IUser> {
        return db.one(sql`
            SELECT id, name, email, full_name, admin, manager
            FROM "user"
            WHERE email = ${email}
        `);
    }

    static async hasPasswordById(db: CommonQueryMethodsType, id: number): Promise<boolean> {
        const password = db.oneFirst(sql`
            SELECT password
            FROM "user"
            WHERE id = ${id}
        `);
        return password !== null;
    }

    static async create(db: CommonQueryMethodsType, user: IUser): Promise<IUser> {
        user.admin = user.admin || false;
        user.manager = user.manager || false;
        const {
            name, email, fullName, admin, manager, password,
        } = user;
        return await db.one(sql`
            INSERT INTO "user" (
                name, email, full_name, admin, manager, password, updated_on
            ) VALUES (
                ${name}, ${email}, ${fullName}, ${admin}, ${manager},
                crypt(${password as string}, gen_salt('bf')), now()
            ) RETURNING
                id, name, email, full_name, admin, manager
        `);
    }

    static async deleteAll(db: CommonQueryMethodsType): Promise<void> {
        await db.query(sql`DELETE FROM "user"`);
    }

    static async deleteById(db: CommonQueryMethodsType, id: number): Promise<void> {
        await db.query(sql`DELETE FROM "user" WHERE id = ${id}`);
    }
}
