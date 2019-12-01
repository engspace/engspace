export enum Role {
    Admin = 'admin',
    Manager = 'manager',
    User = 'user',
}

export interface IUser {
    id?: number;
    name: string;
    email: string;
    fullName: string;
    roles: Role[];
    password?: string;
}

export interface IProjectMember {
    user: IUser | { id: number };
    leader: boolean;
    designer: boolean;
}

export interface IProject {
    id?: number;
    name: string;
    code: string;
    description: string;
    members: IProjectMember[];
}
