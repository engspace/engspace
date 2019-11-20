import chai from 'chai';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import chaiHttp from 'chai-http';

import { IUser } from '@engspace/core';

import { app } from '../src';
import { userTemplates } from './user';

export interface UserSet {
    admin: IUser;
    manager: IUser;
    user: IUser;
}

export interface TokenSet {
    admin: string;
    manager: string;
    user: string;
}

export interface UsersAndTokens {
    users: UserSet;
    tokens: TokenSet;
}

export const loginToken = async (user: IUser): Promise<string> => {
    const res = await chai
        .request(app)
        .post('/api/login')
        .send({
            nameOrEmail: user.name,
            password: user.password,
        });
    return res.body.token;
};

export const userToken = async (): Promise<string> =>
    loginToken(userTemplates.user);
export const managerToken = async (): Promise<string> =>
    loginToken(userTemplates.manager);
export const adminToken = async (): Promise<string> =>
    loginToken(userTemplates.admin);

export const userTokens = async (): Promise<TokenSet> => {
    const toks = await Promise.all([userToken(), managerToken(), adminToken()]);
    return {
        user: toks[0],
        manager: toks[1],
        admin: toks[2],
    };
};
