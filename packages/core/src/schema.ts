export type Id = string;
export type DateTime = number;

export type IdOr<T extends { id: Id }> = { id: Id } | T;

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
    project: IdOr<Project>;
    user: IdOr<User>;
    roles?: string[];
}

export interface DocumentInput {
    name: string;
    description: string;
    initialCheckout: boolean;
}

export interface Document {
    id: Id;
    name: string;
    description: string;
    createdBy: IdOr<User>;
    createdAt: DateTime;
    checkout: IdOr<User>;
    revisions?: DocumentRevision[];
    lastRevision?: DocumentRevision;
}

export interface DocumentRevisionInput {
    documentId: Id;
    filename: string;
    filesize: number;
    sha1: string;
    changeDescription: string;
    retainCheckout: boolean;
}

export interface DocumentRevision {
    id: Id;
    document: IdOr<Document>;
    revision: number;
    filename: string;
    filesize: number;
    sha1: string;
    changeDescription: string;
    author: IdOr<User>;
    createdAt: DateTime;
    uploaded: number;
    uploadChecked: boolean;
}

export interface DocumentSearch {
    count: number;
    documents: Document[];
}
