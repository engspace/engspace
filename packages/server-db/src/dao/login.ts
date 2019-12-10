import { Id, Role } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';
import { UserDao } from './user';

export interface LoginResult {
    id: Id;
    name: string;
    roles: Role[];
}

/**
 * Interface to the "user_login" table that is used for
 * local username+password authentication
 *
 * The password is seperated from the "user" table to
 * allow an Engspace application to have more advanced
 * authentication strategy
 */
export class LoginDao {
    static async login(db: Db, nameOrEmail: string, password: string): Promise<LoginResult | null> {
        interface Result {
            id: Id;
            name: string;
            ok: boolean;
        }
        const result: Result = await db.one(sql`
            SELECT u.id, u.name, (ul.password = crypt(${password}, ul.password)) AS ok
            FROM "user" AS u
            LEFT OUTER JOIN user_login AS ul ON u.id = ul.user_id
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

    static async checkById(db: Db, id: Id, password: string): Promise<boolean> {
        const ok = await db.oneFirst(sql`
            SELECT (password = crypt(${password}, password)) as ok
            FROM user_login WHERE id = ${id}
        `);
        return (ok as unknown) as boolean;
    }

    static async create(db: Db, userId: Id, password: string): Promise<void> {
        await db.query(sql`
            INSERT INTO user_login(user_id, password, updated_on)
            VALUES(${userId}, crypt(${password}, gen_salt('bf')), now())
        `);
    }
}
