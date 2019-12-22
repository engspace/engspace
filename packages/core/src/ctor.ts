import { Id, Role, User } from './schema';

export class CUser implements User {
    id: Id;
    name: string;
    email: string;
    fullName: string;
    roles: Array<Role>;

    constructor(user: Partial<User> = {}) {
        this.id = user.id ?? '';
        this.name = user.name ?? '';
        this.email = user.email ?? '';
        this.fullName = user.fullName ?? '';
        this.roles = user.roles ?? [];
    }
}
