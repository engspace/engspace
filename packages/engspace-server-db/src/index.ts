import {
    ConnectionRoutineType,
    createPool,
    DatabasePoolType,
    TransactionFunctionType,
    ClientUserConfigurationType,
    SqlSqlTokenType,
    sql,
} from 'slonik';
import { createInterceptors } from 'slonik-interceptor-preset';
import { raw } from 'slonik-sql-tag-raw';
import { initSchema } from './schema';

export { ProjectDao, UserDao } from './dao';
export { initSchema } from './schema';

let pool: DatabasePoolType | null = null;

export interface DbConfig {
    uri: string;
    name: string;
    options: ClientUserConfigurationType;
    formatDb: boolean;
}

export type SqlLiteral<T = any> = SqlSqlTokenType<T>;

async function create(dbConfig: DbConfig): Promise<DatabasePoolType> {
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

export class Pool {
    static init(dbConfig: DbConfig): Promise<void> {
        return create(dbConfig).then(p => {
            pool = p;
        });
    }

    static async connect<T>(handler: ConnectionRoutineType<T>): Promise<T> {
        return (pool as DatabasePoolType).connect(handler);
    }

    static async transaction<T>(handler: TransactionFunctionType<T>): Promise<T> {
        return (pool as DatabasePoolType).transaction(handler);
    }
}
