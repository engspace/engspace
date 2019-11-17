import {
    ConnectionRoutineType,
    createPool,
    DatabasePoolType,
    TransactionFunctionType,
    ClientUserConfigurationType,
    SqlSqlTokenType,
} from 'slonik';
import { createInterceptors } from 'slonik-interceptor-preset';

let pool: DatabasePoolType | null = null;

interface DbConfig {
    uri: string;
    name: string;
    options: ClientUserConfigurationType;
}

export type SqlLiteral<T = any> = SqlSqlTokenType<T>;

export class Pool {
    static create(dbConfig: DbConfig): void {
        if (pool !== null) return;
        const connString = `${dbConfig.uri}/${dbConfig.name}`;
        pool = createPool(connString, {
            interceptors: [
                ...createInterceptors(),
            ],
            ...dbConfig.options,
        });
    }

    static async connect<T>(handler: ConnectionRoutineType<T>): Promise<T> {
        return (pool as DatabasePoolType).connect(handler);
    }

    static async transaction<T>(handler: TransactionFunctionType<T>): Promise<T> {
        return (pool as DatabasePoolType).transaction(handler);
    }
}

