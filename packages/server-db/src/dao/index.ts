import { HasId, Id } from '@engspace/core';
import { Db } from '..';

export { documentDao } from './document';
export { documentRevisionDao } from './document-revision';
export { loginDao } from './login';
export { memberDao } from './member';
export { partDao } from './part';
export { partBaseDao } from './part-base';
export { partFamilyDao } from './part-family';
export { partRevisionDao } from './part-revision';
export { projectDao } from './project';
export { specRevisionDao } from './spec-revision';
export { specificationDao } from './specification';
export { userDao } from './user';

/**
 * Data Access Object
 *
 * An object that connects to the database to access a type of object
 */
export interface Dao<T extends HasId> {
    byId(db: Db, id: Id): Promise<T>;
    batchByIds(db: Db, ids: readonly Id[]): Promise<T[]>;
    deleteById(db: Db, id: Id): Promise<T>;
}
