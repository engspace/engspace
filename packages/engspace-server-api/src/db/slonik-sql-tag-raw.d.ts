
declare module 'slonik-sql-tag-raw' {
    import { SqlSqlTokenType, ValueExpressionType } from 'slonik';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function raw<T> (sql: string, values?: ReadonlyArray<ValueExpressionType>): SqlSqlTokenType<any>;
}
