export type Id = string;

export enum Role {
    User = 'user',
    Manager = 'manager',
    Admin = 'admin',
}

export enum ProjectRole {
    Leader = 'leader',
    Designer = 'designer',
}

export interface UserInput {
    name: string;
    email: string;
    fullName: string;
    roles?: Role[];
}

export interface User extends UserInput {
    id: Id;
}

export interface ProjectInput {
    code: string;
    name: string;
    description: string;
}

export interface Project extends ProjectInput {
    id: Id;
}

export interface ProjectMember {
    project: { id: Id } | Project;
    user: { id: Id } | User;
    roles?: ProjectRole[];
}
