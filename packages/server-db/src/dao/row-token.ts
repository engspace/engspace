import { SqlTokenType, sql, IdentifierSqlTokenType } from 'slonik';

export interface FullColumnSpec {
    name: string;
    transform?: 'timestamp';
    tableAlias?: string;
    rowAlias?: string;
}

export type ColumnSpec = string | IdentifierSqlTokenType | FullColumnSpec;

function isNameColumnSpec(spec: ColumnSpec): spec is string {
    return typeof spec === 'string';
}

function isIdentifierColumnSpec(spec: ColumnSpec): spec is IdentifierSqlTokenType {
    return typeof spec !== 'string' && typeof spec['names'] !== 'undefined';
}

function isFullColumnSpec(spec: ColumnSpec): spec is FullColumnSpec {
    return typeof spec !== 'string' && typeof spec['name'] === 'string';
}

export function buildRowToken(specs: ColumnSpec[]): SqlTokenType {
    const fragments: SqlTokenType[] = [];
    for (const spec of specs) {
        if (isNameColumnSpec(spec)) {
            fragments.push(sql.identifier([spec]));
        } else if (isIdentifierColumnSpec(spec)) {
            fragments.push(spec);
        } else if (isFullColumnSpec(spec)) {
            const ident = sql.identifier(
                spec.tableAlias ? [spec.tableAlias, spec.name] : [spec.name]
            );
            const alias = sql.identifier([spec.rowAlias || spec.name]);

            if (spec.transform === 'timestamp') {
                fragments.push(sql`EXTRACT(EPOCH FROM ${ident}) AS ${alias}`);
            } else if (spec.tableAlias || spec.rowAlias) {
                fragments.push(sql`${ident} AS ${alias}`);
            } else {
                fragments.push(ident);
            }
        } else {
            /* istanbul ignore next */
            throw new Error('unexpected spec type');
        }
    }
    return sql.join(fragments, sql`, `);
}

export function buildTableAliasRowToken(tableAlias: string, specs: ColumnSpec[]): SqlTokenType {
    return buildRowToken(
        specs.map((s) => {
            if (isNameColumnSpec(s)) {
                return sql.identifier([tableAlias, s]);
            }
            if (isIdentifierColumnSpec(s)) {
                throw new Error(
                    'buildTableAliasRowToken should not be called with Identifier spec'
                );
            }
            if (isFullColumnSpec(s)) {
                return {
                    ...s,
                    tableAlias,
                };
            }
            /* istanbul ignore next */
            throw new Error('unexpected spec type');
        })
    );
}
