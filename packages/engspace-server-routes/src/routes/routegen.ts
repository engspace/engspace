/* eslint-disable no-unused-vars */
import express, {
    NextFunction,
    Request,
    RequestHandler,
    Response,
    Router,
} from 'express';
import HttpStatus from 'http-status-codes';
import { ValidationChain, validationResult } from 'express-validator';
import { auth } from './auth';

interface RouteHandler {
    (req: Request, res: Response): Promise<any> | void;
}

interface RouteInit {
    method: string;
    path: string;
    auth: string;
    validation?: ValidationChain[];
    handler: RouteHandler;
}
interface RouteSet {
    [index: string]: Route;
}

export function buildRouter(routeSet: RouteSet): Router {
    const router = express.Router();
    Object.entries(routeSet)
        .map(e => e[1])
        .forEach(route => route.addToRouter(router));
    return router;
}

function validationGuard(): RequestHandler {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(HttpStatus.BAD_REQUEST).json({ errors: errors.array() });
        } else {
            next();
        }
    };
}

function handle(handler: RouteHandler): RequestHandler {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (req: Request, res: Response, _: NextFunction): void => {
        try {
            Promise.resolve(handler(req, res))
                .then(() => {})
                .catch(err => {
                    console.error(err);
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
                });
        } catch (err) {
            console.error(err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        }
    };
}

export class Route {
    readonly method: string;
    readonly path: string;
    readonly auth: string;
    readonly validation: ValidationChain[];
    readonly handler: RouteHandler;

    constructor(init: RouteInit) {
        this.method = init.method;
        this.path = init.path;
        this.auth = init.auth;
        this.validation = init.validation || [];
        this.handler = init.handler;
    }

    get middlewareChain(): RequestHandler[] {
        let chain: RequestHandler[] = [];

        if (this.auth) {
            switch (this.auth) {
                case 'USER':
                    chain = chain.concat(auth.user);
                    break;
                case 'ADMIN':
                    chain = chain.concat(auth.admin);
                    break;
                case 'MANAGER':
                    chain = chain.concat(auth.manager);
                    break;
                case 'NONE':
                    break;
                default:
                    throw new Error(
                        `unknown authorization level: ${this.auth}`
                    );
            }
        }

        if (this.validation) {
            chain = chain.concat(this.validation, validationGuard());
        }

        return chain.concat(handle(this.handler));
    }

    addToRouter(router: Router): void {
        const chain = this.middlewareChain;
        switch (this.method) {
            case 'GET':
                router.get(this.path, chain);
                break;
            case 'POST':
                router.post(this.path, chain);
                break;
            case 'PATCH':
                router.patch(this.path, chain);
                break;
            case 'PUT':
                router.put(this.path, chain);
                break;
            case 'DELETE':
                router.delete(this.path, chain);
                break;
            default:
                throw new Error(`Unexpected route method: ${this.method}`);
        }
    }
}
