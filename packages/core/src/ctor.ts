import { Id, Role, User } from './schema';

export class CUser implements User {
    id: Id;
    name = '';
    email = '';
    fullName = '';
    roles: Array<Role> = [];

    constructor(user: Partial<User> = {}) {
        Object.assign(this, user);
    }
}
