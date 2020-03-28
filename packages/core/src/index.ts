export { AuthToken } from './misc';
export {
    AppRolePolicies,
    buildDefaultAppRolePolicies,
    buildRolePolicy,
    RoleDescriptor,
    RoleDescriptorSet,
    RolePolicy,
    UnknownRoleError,
} from './permissions';

/** A database Id type, always unique, even across types and tables */
export type Id = string;

/** A resource that has a unique id */
export interface HasId {
    id: Id;
}

/** A representation of date-time (number of millisecond since Unix epoch) */
export type DateTime = number;

/** An helper used to have references to other objects, with optional loading from the database. */
export type IdOr<T extends { id: Id }> = { id: Id } | T;

export enum CycleState {
    Edition = 'EDITION',
    Validation = 'VALIDATION',
    Release = 'RELEASE',
    Obsolete = 'OBSOLETE',
    Cancelled = 'CANCELLED',
}

export enum ApprovalState {
    Pending = 'PENDING',
    Rejected = 'REJECTED',
    Reserved = 'RESERVED',
    Approved = 'APPROVED',
}

export enum ValidationResult {
    Release = 'RELEASE',
    TryAgain = 'TRY_AGAIN',
    Cancel = 'CANCEL',
}

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

export interface Tracked {
    createdBy: IdOr<User>;
    createdAt: DateTime;
    updatedBy: IdOr<User>;
    updatedAt: DateTime;
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

export interface PartFamilyInput {
    code: string;
    name: string;
}

export interface PartFamily extends PartFamilyInput {
    id: Id;
    counter: number;
}

export interface PartCreateNewInput {
    familyId: Id;
    designation: string;
    initialVersion: string;
}

export interface PartForkInput {
    partId: Id;
    version?: string;
    designation?: string;
}

export interface PartRevisionInput {
    partId: Id;
    designation?: string;
}

export interface PartUpdateInput {
    designation: string;
}

export interface PartBase extends Tracked {
    id: Id;
    family: IdOr<PartFamily>;
    baseRef: string;
    designation: string;
}

export interface Part extends Tracked {
    id: Id;
    base: IdOr<PartBase>;
    ref: string;
    designation: string;
}

export interface PartRevision extends Tracked {
    id: Id;
    part: IdOr<Part>;
    revision: number;
    designation: string;
    cycleState: CycleState;
}

export interface PartApproval extends Tracked {
    id: Id;
    validation: IdOr<PartValidation>;
    assignee: IdOr<User>;
    state: ApprovalState;
    comments?: string;
}

export interface PartValidation extends Tracked {
    id: Id;
    partRev: IdOr<PartRevision>;
    state: ApprovalState;
    approvals?: PartApproval[];
    result?: ValidationResult;
    comments?: string;
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
    changeDescription: string;
    retainCheckout: boolean;
}

export interface DocumentRevision {
    id: Id;
    document: IdOr<Document>;
    revision: number;
    filename: string;
    filesize: number;
    createdBy: IdOr<User>;
    createdAt: DateTime;
    changeDescription?: string;
    uploaded: number;
    sha1?: string;
}

export interface DocumentSearch {
    count: number;
    documents: Document[];
}
