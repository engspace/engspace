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
    buildEsDaoSet,
    EsDaoSet,
    DocumentDao,
    DocumentRevisionDao,
    PartApprovalDao,
    PartApprovalDaoInput,
    PartApprovalUpdateDaoInput,
    PartDao,
    PartDaoInput,
    PartUpdateDaoInput,
    PartFamilyDao,
    PartRevisionDao,
    PartRevisionDaoInput,
    PartValidationDao,
    PartValidationDaoInput,
    ProjectDao,
    ProjectMemberDao,
    UserDao,
} from './dao';
export {
    RowId,
    foreignKey,
    HasRowId,
    toId,
    tracked,
    TrackedRow,
    timestamp,
    nullable,
    DaoBaseConfig,
    DaoBase,
} from './dao/base';
export { RoleOptions } from './dao/user';
export {
    buildRowToken,
    buildTableAliasRowToken,
    ColumnSpec,
    FullColumnSpec,
} from './dao/row-token';
export {
    syncSchema,
    executeSql,
    executeSqlFile,
    executeSqlFolder,
    executeSqlStmt,
    sqlOperation,
    SqlOperation,
    SqlOperationFunc,
    SqlOperationKind,
    SqlOperationParamsFunc,
    SqlOperationFile,
    SqlOperationFolder,
    SqlOperationStmt,
    SqlOperationParamsFile,
    SqlOperationParamsFolder,
    SqlOperationParamsStmt,
} from './migration';
export { default as esMigrationSet } from './migrations';
export { default as passwordLogin, LoginResult } from './password-login';
export {
    TestHelpers,
    asyncDictMap,
    dictMap,
    idType,
    Dict,
    esTableDeps,
    trackedBy,
    expTrackedTime,
} from './test-helpers';

export const currentSchemaLevel = 1;

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

/** Build a connection string for PostgreSQL */
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
    await pool.connect(async (db) => {
        /* istanbul ignore else */
        if (formatDb === true) {
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
