/** A database Id type, always unique, even across types and tables */
export type Id = string;

/** A representation of date-time (number of millisecond since Unix epoch) */
export type DateTime = number;

/** An helper used to have references to other objects, with optional loading from the database. */
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

export interface File {
    id: Id;
    name: string;
    description: string;
}

export interface FileRevision {
    id: Id;
    revision: number;
    filename: string;
    filesize: number;
    createdBy: IdOr<User>;
    createdAt: DateTime;
    changeDescription?: string;
    uploaded: number;
    sha1?: string;
}

export interface DocumentInput {
    name: string;
    description: string;
    initialCheckout: boolean;
}

export interface Document extends File {
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
    changeDescription: string;
    retainCheckout: boolean;
}

export interface DocumentRevision extends FileRevision {
    document: IdOr<Document>;
}

export interface DocumentSearch {
    count: number;
    documents: Document[];
}

export interface PartFamily {
    id: Id;
    name: string;
    code: string;
    counter: number;
}

export interface PartBase {
    id: Id;
    family: IdOr<PartFamily>;
    reference: string;
    designation: string;

    parts?: Part[];
}

export interface Part {
    id: Id;
    base: IdOr<PartBase>;
    reference: string;
    designation: string;
    createdBy: IdOr<User>;
    createdAt: DateTime;

    revisions?: PartRevision[];
}

export interface PartRevision {
    id: Id;
    part: IdOr<Part>;
    revision: number;
    createdBy: IdOr<User>;
    createdAt: DateTime;
}
