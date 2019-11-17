export interface IUser {
    id?: number;
    name: string;
    email: string;
    fullName: string;
    admin: boolean;
    manager: boolean;
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
