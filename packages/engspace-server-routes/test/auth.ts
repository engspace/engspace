import chai from 'chai';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import chaiHttp from 'chai-http';

import { IUser } from '@engspace/core';

import { app } from '../src';

export interface UserSet {
    [name: string]: IUser;
}

export interface TokenSet {
    [name: string]: string;
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
            password: user.name,
        });
    return res.body.token;
};

export const userTokens = async (users: UserSet): Promise<TokenSet> => {
    const tokSet: TokenSet = {};
    for (const key in users) {
        tokSet[key] = await loginToken(users[key]);
    }
    return tokSet;
};
