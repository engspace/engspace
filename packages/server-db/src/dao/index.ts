import { HasId, Id } from '@engspace/core';
import { Db } from '..';
import { ChangePartForkDao } from './change-part-fork';
import { ChangePartCreateDao } from './change-part-create';
import { ChangePartRevisionDao } from './change-part-revision';
import { ChangeRequestDao } from './change-request';
import { ChangeReviewDao } from './change-review';
import { DocumentDao } from './document';
import { DocumentRevisionDao } from './document-revision';
import { LoginDao } from './login';
import { PartDao } from './part';
import { PartApprovalDao } from './part-approval';
import { PartFamilyDao } from './part-family';
import { PartRevisionDao } from './part-revision';
import { PartValidationDao } from './part-validation';
import { ProjectDao } from './project';
import { ProjectMemberDao } from './project-member';
import { UserDao } from './user';

export { ChangePartForkDaoInput } from './change-part-fork';
export { ChangePartCreateDaoInput } from './change-part-create';
export { ChangePartRevisionDaoInput } from './change-part-revision';
export { ChangeReviewDaoInput } from './change-review';
export { PartDaoInput, PartUpdateDaoInput } from './part';
export { PartApprovalDaoInput, PartApprovalUpdateDaoInput } from './part-approval';
export { PartRevisionDaoInput } from './part-revision';
export { PartValidationDaoInput } from './part-validation';
export {
    DocumentDao,
    DocumentRevisionDao,
    LoginDao,
    ProjectMemberDao,
    PartApprovalDao,
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
    part: PartDao;
    partRevision: PartRevisionDao;
    partValidation: PartValidationDao;
    partApproval: PartApprovalDao;
    changeRequest: ChangeRequestDao;
    changePartCreate: ChangePartCreateDao;
    changePartFork: ChangePartForkDao;
    changePartRevision: ChangePartRevisionDao;
    changeReview: ChangeReviewDao;
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
        part: custom.part ?? new PartDao(),
        partRevision: custom.partRevision ?? new PartRevisionDao(),
        partValidation: custom.partValidation ?? new PartValidationDao(),
        partApproval: custom.partApproval ?? new PartApprovalDao(),
        changeRequest: custom.changeRequest ?? new ChangeRequestDao(),
        changePartCreate: custom.changePartCreate ?? new ChangePartCreateDao(),
        changePartFork: custom.changePartFork ?? new ChangePartForkDao(),
        changePartRevision: custom.changePartRevision ?? new ChangePartRevisionDao(),
        changeReview: custom.changeReview ?? new ChangeReviewDao(),
        document: custom.document ?? new DocumentDao(),
        documentRevision: custom.documentRevision ?? new DocumentRevisionDao(),
    };
}
