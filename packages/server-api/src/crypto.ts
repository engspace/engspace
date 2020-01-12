import jwt, { SignOptions } from 'jsonwebtoken';

export async function signJwt(obj: any, jwtSecret: string, options: SignOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.sign(obj, jwtSecret, options, (err, encoded) => {
            if (err) reject(err);
            resolve(encoded);
        });
    });
}

export async function verifyJwt<T = any>(token: string, jwtSecret: string): Promise<T> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve((decoded as unknown) as T);
            }
        });
    });
}
