export type Id = string;

export interface UserInput {
    name: string;
    email: string;
    fullName: string;
    roles?: string[];
}

export interface User extends UserInput {
    id: Id;
}

export interface UserEx extends User {
    membership?: ProjectMember[];
}

export interface ProjectInput {
    code: string;
    name: string;
    description: string;
}

export interface Project extends ProjectInput {
    id: Id;
}

export interface ProjectEx extends Project {
    members?: ProjectMember[];
}

export interface ProjectMemberInput {
    projectId: Id;
    userId: Id;
    roles?: string[];
}

export interface ProjectMember {
    id: Id;
    project: { id: Id } | Project;
    user: { id: Id } | User;
    roles?: string[];
}
