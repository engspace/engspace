import { sql } from 'slonik';
import { Role } from '@engspace/core';
import { Db } from '..';
import { UserDao } from './user';

export interface LoginResult {
    id: number;
    name: string;
    roles: Role[];
}

export class LoginDao {
    static async login(db: Db, nameOrEmail: string, password: string): Promise<LoginResult | null> {
        interface Result {
            id: number;
            name: string;
            ok: boolean;
        }
        const result: Result = await db.one(sql`
            SELECT u.id, u.name, (ul.password = crypt(${password}, ul.password)) AS ok
            FROM "user" AS u
            LEFT OUTER JOIN user AS ul ON u.id = ul.user_id
            WHERE u.name = ${nameOrEmail} OR u.email = ${nameOrEmail}
        `);
        if (result.ok) {
            return {
                id: result.id,
                name: result.name,
                roles: await UserDao.rolesById(db, result.id),
            };
        } else {
            return null;
        }
    }

    static async checkById(db: Db, id: number, password: string): Promise<boolean> {
        const ok = await db.oneFirst(sql`
            SELECT (password = crypt(${password}, password)) as ok
            FROM user_login WHERE id = ${id}
        `);
        return (ok as unknown) as boolean;
    }

    static async create(db: Db, userId: number, password: string): Promise<void> {
        await db.query(sql`
            INSERT INTO user_login(user_id, password, updated_on)
            VALUES(${userId}, crypt(${password as string}, gen_salt('bf')), now())
        `);
    }
}
