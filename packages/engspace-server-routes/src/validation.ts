import { NextFunction, Request, RequestHandler, Response } from 'express';
import { EngspaceClass } from '@engspace/core';

const validationSymbol = Symbol('@engspace/server-routes/validation');

export function engspaceBodyValidator<T extends object>(clas: EngspaceClass<T>): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const errs = clas.validate(req.body);
        if (errs.length !== 0) {
            if (!req[validationSymbol]) {
                req[validationSymbol] = errs;
            } else {
                req[validationSymbol].concat(errs);
            }
        }
        next();
    };
}

export function engspaceValidationResult(req: Request): string[] {
    if (req[validationSymbol]) {
        return req[validationSymbol];
    } else {
        return [];
    }
}
