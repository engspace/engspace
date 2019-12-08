import {
    ClientUserConfigurationType,
    CommonQueryMethodsType,
    createPool,
    DatabasePoolType,
    sql,
    SqlSqlTokenType,
} from 'slonik';
import { createInterceptors } from 'slonik-interceptor-preset';
import { raw } from 'slonik-sql-tag-raw';
import { initSchema } from './schema';

export { LoginDao, ProjectDao, UserDao } from './dao';
export { initSchema } from './schema';

export interface DbConfig {
    uri: string;
    name: string;
    options: ClientUserConfigurationType;
    formatDb: boolean;
}

export type Db = CommonQueryMethodsType;
export type DbPool = DatabasePoolType;
export type SqlLiteral<T = any> = SqlSqlTokenType<T>;

export async function createDbPool(dbConfig: DbConfig): Promise<DbPool> {
    const pool0 = createPool(dbConfig.uri, {
        maximumPoolSize: 1,
    });
    await pool0.connect(async db => {
        if (dbConfig.formatDb) {
            console.log(`deleting database "${dbConfig.name}"`);
            await db.query(sql`${raw(`DROP DATABASE IF EXISTS ${dbConfig.name}`)}`);
        }
        const hasDb = await db.oneFirst(sql`
            SELECT COUNT(datname) FROM pg_database
            WHERE datname = ${dbConfig.name}
        `);
        if (!hasDb) {
            console.log(`creating database "${dbConfig.name}"`);
            await db.query(sql`${raw(`CREATE DATABASE ${dbConfig.name}`)}`);
        }
    });
    await (pool0 as any).end(); //? typedef ?

    const connString = `${dbConfig.uri}/${dbConfig.name}`;
    const pool = createPool(connString, {
        interceptors: [...createInterceptors()],
        ...dbConfig.options,
    });

    await pool.transaction(async db => initSchema(db));

    return pool;
}
