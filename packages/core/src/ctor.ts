import { Id, Project, Role, User } from './schema';

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

export class CProject implements Project {
    id: Id;
    code: string;
    name: string;
    description: string;

    constructor(project: Partial<Project> = {}) {
        this.id = project.id ?? '';
        this.code = project.code ?? '';
        this.name = project.name ?? '';
        this.description = project.description ?? '';
    }
}
