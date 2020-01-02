import { sql, SqlTokenType, ValueExpressionType } from 'slonik';

// export function sleep(ms: number): Promise<void> {
//     return new Promise(resolve => {
//         setTimeout(resolve, ms);
//     });
// }

export function identJsToSql(ident: string): string {
    const frags = [];
    let frag = '';
    for (const c of ident) {
        if (c === c.toUpperCase()) {
            if (frag.length) {
                frags.push(frag);
                frag = '';
            }
            frag += c.toLowerCase();
        } else {
            frag += c;
        }
    }
    if (frag.length) frags.push(frag);
    return frags.join('_');
}

export function partialAssignmentList<T, K extends keyof T>(
    obj: Partial<T>,
    props: K[],
    prefix: string = null
): SqlTokenType[] {
    const identifier = (p: K): SqlTokenType => {
        const ident = identJsToSql(p as string);
        if (prefix) return sql.identifier([prefix, ident]);
        return sql.identifier([ident]);
    };
    const assignments = [];
    for (const p of props) {
        if (obj[p]) {
            assignments.push(sql`${identifier(p)} = ${(obj[p] as unknown) as ValueExpressionType}`);
        }
    }
    return assignments;
}
