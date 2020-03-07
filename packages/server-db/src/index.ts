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
} from './populate-demo';

export type Db = CommonQueryMethodsType;
export type DbPool = DatabasePoolType;
export type SqlLiteral<T = any> = SqlSqlTokenType<T>;

export interface ServerConnConfig {
    user?: string;
    pass?: string;
    netloc?: string;
    port?: string | number;
}

export interface DbConnConfig extends ServerConnConfig {
    name?: string;
}

export interface DbPoolConfig extends DbConnConfig {
    slonikOptions?: ClientConfigurationType;
}

export interface DbPreparationConfig extends DbConnConfig {
    formatDb?: boolean;
}

export function connectionString({ user, pass, name, netloc, port }: DbConnConfig): string {
    if (pass && !user) {
        throw new Error('Password must be given with username');
    }
    const passComp = pass ? `:${pass}` : '';
    const userComp = user ? `${user}${passComp}@` : '';
    const portComp = port ? `:${port}` : '';
    const nameComp = name ? `/${name}` : '';
    return `postgresql://${userComp}${netloc ?? 'localhost'}${portComp}${nameComp}`;
}

export async function prepareDb({
    user,
    pass,
    netloc,
    port,
    name,
    formatDb,
}: DbPreparationConfig): Promise<void> {
    const pool = createPool(connectionString({ user, pass, netloc, port }), {
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

export function createDbPool({
    user,
    pass,
    name,
    netloc,
    port,
    slonikOptions,
}: DbPoolConfig): DbPool {
    return createPool(connectionString({ user, pass, name, netloc, port }), {
        interceptors: [...createInterceptors()],
        ...slonikOptions,
    });
}
