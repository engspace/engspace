import { Kind, NamingBase, VarToken } from './base';
import { NamingCounterLimitError } from '.';

export interface ChangeRequestComps {
    counter: number;
}

interface CounterToken {
    kind: Kind.Var;
    ident: 'counter';
    width: number;
}

type ChangeRequestToken = CounterToken;

export class ChangeRequestNaming extends NamingBase<ChangeRequestComps, ChangeRequestToken> {
    constructor(input: string) {
        super(
            input,
            {
                mapTok(tok: VarToken): ChangeRequestToken {
                    switch (tok.ident) {
                        case 'counter':
                            return {
                                kind: Kind.Var,
                                ident: 'counter',
                                width: parseInt(tok.arg),
                            };
                    }
                },
            },
            ['counter'],
            ['counter']
        );
    }

    protected compSeg(tok: ChangeRequestToken, comps: ChangeRequestComps): string {
        switch (tok.ident) {
            case 'counter': {
                const cs = comps.counter.toString();
                if (cs.length > tok.width) {
                    throw new NamingCounterLimitError(
                        `Change Request "${comps.counter}" has reached the maximum number of names. ` +
                            'Consider upgrading your reference system.'
                    );
                }
                return cs.padStart(tok.width, '0');
            }
        }
    }
}
