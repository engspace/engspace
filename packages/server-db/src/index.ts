import {
    ClientConfigurationType,
    createPool,
    DatabasePoolType,
    DatabaseTransactionConnectionType,
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
export {
    createDemoDocuments,
    createDemoLogins,
    createDemoMembers,
    createDemoPartFamilies,
    createDemoProjects,
    createDemoUsers,
} from './populate-demo';
export { initSchema } from './schema';

export type Db = DatabaseTransactionConnectionType;
export type DbPool = DatabasePoolType;
export type SqlLiteral<T = any> = SqlSqlTokenType<T>;

export interface ServerConnConfig {
    user?: string;
    pass?: string;
    host?: string;
    port?: string | number;
}

export interface DbConnConfig extends ServerConnConfig {
    name?: string;
}

export function connectionString(connConfig: DbConnConfig | ServerConnConfig): string {
    const { user, pass, host, port } = connConfig;
    if (pass && !user) {
        throw new Error('Password must be given with username');
    }
    const passComp = pass ? `:${pass}` : '';
    const userComp = user ? `${user}${passComp}@` : '';
    const portComp = port ? `:${port}` : '';
    const name = connConfig['name'];
    const nameComp = name ? `/${name}` : '';
    return `postgresql://${userComp}${host ?? 'localhost'}${portComp}${nameComp}`;
}

export interface DbPoolConfig {
    dbConnString: string;
    slonikOptions?: ClientConfigurationType;
}

export interface DbPreparationConfig {
    serverConnString: string;
    name: string;
    formatDb?: boolean;
}

export async function prepareDb({
    serverConnString,
    name,
    formatDb,
}: DbPreparationConfig): Promise<void> {
    const pool = createPool(serverConnString, {
        maximumPoolSize: 1,
    });
    await pool.connect(async db => {
        /* istanbul ignore else */
        if (formatDb) {
            console.log(`deleting database "${name}"`);
            await db.query(sql`${raw(`DROP DATABASE IF EXISTS ${name}`)}`);
        }
        const hasDb = await db.oneFirst(sql`
            SELECT COUNT(datname) FROM pg_database
            WHERE datname = ${name}
        `);
        /* istanbul ignore else */
        if (!hasDb) {
            console.log(`creating database "${name}"`);
            await db.query(sql`${raw(`CREATE DATABASE ${name}`)}`);
        }
    });
    await pool.end();
}

export function createDbPool({ dbConnString, slonikOptions }: DbPoolConfig): DbPool {
    return createPool(dbConnString, {
        interceptors: [...createInterceptors()],
        ...slonikOptions,
    });
}
