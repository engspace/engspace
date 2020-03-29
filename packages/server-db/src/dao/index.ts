import { HasId, Id } from '@engspace/core';
import { Db } from '..';
import { DocumentDao } from './document';
import { DocumentRevisionDao } from './document-revision';
import { LoginDao } from './login';
import { PartDao } from './part';
import { PartApprovalDao } from './part-approval';
import { PartBaseDao } from './part-base';
import { PartFamilyDao } from './part-family';
import { PartRevisionDao } from './part-revision';
import { PartValidationDao } from './part-validation';
import { ProjectDao } from './project';
import { ProjectMemberDao } from './project-member';
import { UserDao } from './user';

export { PartDaoInput } from './part';
export { PartApprovalDaoInput, PartApprovalUpdateDaoInput } from './part-approval';
export { PartBaseDaoInput } from './part-base';
export { PartRevisionDaoInput } from './part-revision';
export { PartValidationDaoInput } from './part-validation';
export {
    DocumentDao,
    DocumentRevisionDao,
    LoginDao,
    ProjectMemberDao,
    PartApprovalDao,
    PartBaseDao,
    PartDao,
    PartFamilyDao,
    PartRevisionDao,
    PartValidationDao,
    ProjectDao,
    UserDao,
};

/**
 * Data Access Object
 *
 * An object that connects to the database to access a type of object
 */
export interface Dao<T extends HasId> {
    readonly table: string;
    byId(db: Db, id: Id): Promise<T>;
    rowCount(db: Db): Promise<number>;
    checkId(db: Db, id: Id): Promise<boolean>;
    batchByIds(db: Db, ids: readonly Id[]): Promise<T[]>;
    deleteById(db: Db, id: Id): Promise<T>;
    deleteAll(db: Db): Promise<number>;
}

export interface DaoSet {
    user: UserDao;
    login: LoginDao;
    project: ProjectDao;
    projectMember: ProjectMemberDao;
    partFamily: PartFamilyDao;
    partBase: PartBaseDao;
    part: PartDao;
    partRevision: PartRevisionDao;
    partValidation: PartValidationDao;
    partApproval: PartApprovalDao;
    document: DocumentDao;
    documentRevision: DocumentRevisionDao;
}

export function buildDaoSet(custom: Partial<DaoSet> = {}): DaoSet {
    return {
        user: custom.user ?? new UserDao(),
        login: custom.login ?? new LoginDao(),
        project: custom.project ?? new ProjectDao(),
        projectMember: custom.projectMember ?? new ProjectMemberDao(),
        partFamily: custom.partFamily ?? new PartFamilyDao(),
        partBase: custom.partBase ?? new PartBaseDao(),
        part: custom.part ?? new PartDao(),
        partRevision: custom.partRevision ?? new PartRevisionDao(),
        partValidation: custom.partValidation ?? new PartValidationDao(),
        partApproval: custom.partApproval ?? new PartApprovalDao(),
        document: custom.document ?? new DocumentDao(),
        documentRevision: custom.documentRevision ?? new DocumentRevisionDao(),
    };
}
