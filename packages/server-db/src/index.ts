import {
    ClientConfigurationType,
    CommonQueryMethodsType,
    createPool,
    DatabasePoolType,
    sql,
    SqlSqlTokenType,
} from 'slonik';
import { createInterceptors } from 'slonik-interceptor-preset';
import { raw } from 'slonik-sql-tag-raw';

export {
    documentDao,
    documentRevisionDao,
    loginDao,
    memberDao,
    partBaseDao,
    partFamilyDao,
    projectDao,
    userDao,
} from './dao';
export { initSchema } from './schema';
export {
    createDemoDocuments,
    createDemoLogins,
    createDemoMembers,
    createDemoPartFamilies,
    createDemoProjects,
    createDemoUsers,
    transacDemoPartFamilies,
    transacDemoProjects,
    transacDemoUsers,
} from './populate-demo';

export interface DbConfig {
    uri: string;
    name: string;
    options: ClientConfigurationType;
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
        /* istanbul ignore else */
        if (dbConfig.formatDb) {
            console.log(`deleting database "${dbConfig.name}"`);
            await db.query(sql`${raw(`DROP DATABASE IF EXISTS ${dbConfig.name}`)}`);
        }
        const hasDb = await db.oneFirst(sql`
            SELECT COUNT(datname) FROM pg_database
            WHERE datname = ${dbConfig.name}
        `);
        /* istanbul ignore else */
        if (!hasDb) {
            console.log(`creating database "${dbConfig.name}"`);
            await db.query(sql`${raw(`CREATE DATABASE ${dbConfig.name}`)}`);
        }
    });
    await pool0.end();

    const connString = `${dbConfig.uri}/${dbConfig.name}`;
    const pool = createPool(connString, {
        interceptors: [...createInterceptors()],
        ...dbConfig.options,
    });

    return pool;
}
