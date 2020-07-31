import { HasId, Id } from '@engspace/core';
import { Db, SqlLiteral } from '..';
import { ChangePartCreateDao } from './change-part-create';
import { ChangePartForkDao } from './change-part-fork';
import { ChangePartRevisionDao } from './change-part-revision';
import { ChangeRequestDao } from './change-request';
import { ChangeReviewDao } from './change-review';
import { DocumentDao } from './document';
import { DocumentRevisionDao } from './document-revision';
import { GlobalCounterDao } from './global-counter';
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
    ProjectMemberDao,
    PartApprovalDao,
    PartDao,
    PartFamilyDao,
    PartRevisionDao,
    PartValidationDao,
    ProjectDao,
    UserDao,
    GlobalCounterDao,
};

/**
 * Data Access Object
 *
 * An object that performs CRUD operations
 * and map database to a type of object
 */
export interface Dao<T extends HasId> {
    /**
     * Primary table this Dao acts on
     */
    readonly table: string;
    /**
     * Selects a mapped object
     *
     * @param db the database connection
     * @param id the id of the object to select
     */
    byId(db: Db, id: Id): Promise<T>;
    /**
     * Number of entries in the database
     *
     * @param db the database connection
     */
    rowCount(db: Db): Promise<number>;
    /**
     * Checks whether the provided ID exists in the database.
     *
     * @param db the database connection
     * @param id the id to look for
     */
    checkId(db: Db, id: Id): Promise<boolean>;
    /**
     * Selects a batch of mapped objects.
     *
     * Objects are returned in the same order of the provided ids
     *
     * @param db the database connection
     * @param ids the ids of objects to select
     */
    batchByIds(db: Db, ids: readonly Id[]): Promise<T[]>;
    /**
     * Delete an object in the database
     *
     * @param db the database connection
     * @param id the id of the object to delete
     */
    deleteById(db: Db, id: Id): Promise<T>;
    /**
     * Delete all entries in the table
     *
     * @param db the database connection
     */
    deleteAll(db: Db): Promise<number>;
}

export function isDao(obj: unknown): obj is Dao<any> {
    if (typeof obj !== 'object') return false;

    return (
        obj.hasOwnProperty('table') &&
        obj.hasOwnProperty('dependencies') &&
        obj.hasOwnProperty('schema')
    );
}

export interface EsDaoSet {
    globalCounter: GlobalCounterDao;
    user: UserDao;
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

export function buildEsDaoSet(custom: Partial<EsDaoSet> = {}): EsDaoSet {
    return {
        globalCounter: custom.globalCounter ?? new GlobalCounterDao(),
        user: custom.user ?? new UserDao(),
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
