import { HasId, Id } from '@engspace/core';
import { Db } from '..';

export { documentDao } from './document';
export { documentRevisionDao } from './document-revision';
export { loginDao } from './login';
export { memberDao } from './member';
export { partDao, PartDaoInput } from './part';
export { partApprovalDao, PartApprovalDaoInput, PartApprovalUpdateDaoInput } from './part-approval';
export { partBaseDao } from './part-base';
export { partFamilyDao } from './part-family';
export { partRevisionDao, PartRevisionDaoInput } from './part-revision';
export { partValidationDao, PartValidationDaoInput } from './part-validation';
export { projectDao } from './project';
export { userDao } from './user';

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
