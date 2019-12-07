import { Role } from '.';

export enum ProjectRole2 {
    Leader = 'leader',
    Designer = 'designer',
}

export interface User2 {
    id: number;
    name: string;
    email: string;
    fullName: string;
    roles?: Role[];
}

export interface Project2 {
    id: number;
    name: string;
    code: string;
    description: string;
    members?: ProjectMember2[];
}

export interface ProjectMember2 {
    user: { id: number } | User2;
    leader: boolean;
    designer: boolean;
}
