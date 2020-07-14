/**
 * Password based login method.
 * Provided as an option because applications may prefer
 * more advanced authentication methods
 * (Windows session, Google, FB...)
 */
import { sql } from 'slonik';
import { Id } from '@engspace/core';
import { RowId, toId } from './dao/base';
import { Db } from '.';

/**
 * The login action fetches the user id, it's name and it's roles.
 */
export interface LoginResult {
    id: Id;
    name: string;
    roles: string[];
}

const schema = sql`
    CREATE TABLE user_login (
        user_id integer PRIMARY KEY,
        password text NOT NULL,

        FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
    )
`;

export default {
    schema,

    async buildSchema(db: Db): Promise<void> {
        await db.query(schema);
    },

    async create(db: Db, userId: Id, password: string): Promise<void> {
        await db.query(sql`
            INSERT INTO user_login(user_id, password)
            VALUES(${userId}, crypt(${password}, gen_salt('bf')))
        `);
    },

    async login(db: Db, nameOrEmail: string, password: string): Promise<LoginResult | null> {
        interface Row {
            id: RowId;
            name: string;
            ok: boolean;
        }
        const result: Row = await db.maybeOne(sql`
            SELECT u.id, u.name, (ul.password = crypt(${password}, ul.password)) AS ok
            FROM "user" AS u
            LEFT OUTER JOIN user_login AS ul ON u.id = ul.user_id
            WHERE u.name = ${nameOrEmail} OR u.email = ${nameOrEmail}
        `);
        // null: wrong username or email
        // ok = false: wrong password
        if (result && result.ok) {
            return {
                id: toId(result.id),
                name: result.name,
                roles: (await db.anyFirst(sql`
                    SELECT role FROM user_role
                    WHERE user_id = ${result.id}
                `)) as string[],
            };
        } else {
            return null;
        }
    },

    async checkById(db: Db, userId: Id, password: string): Promise<boolean> {
        const ok = await db.maybeOneFirst(sql`
            SELECT (password = crypt(${password}, password)) as ok
            FROM user_login WHERE user_id = ${userId}
        `);
        return (ok || false) as boolean;
    },

    async patch(db: Db, userId: Id, password: string): Promise<void> {
        await db.query(sql`
            UPDATE user_login SET
                password = crypt(${password}, gen_salt('bf'))
            WHERE
                user_id = ${userId}
        `);
    },

    async deleteById(db: Db, userId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM user_login WHERE user_id = ${userId}
        `);
    },

    async deleteAll(db: Db): Promise<void> {
        await db.query(sql`
            DELETE FROM user_login
        `);
    },
};
