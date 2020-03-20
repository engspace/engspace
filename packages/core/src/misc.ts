import { Id } from '.';

export interface AuthToken {
    userId: Id;
    userPerms: string[];
}
