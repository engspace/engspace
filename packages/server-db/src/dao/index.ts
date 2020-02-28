import { HasId, Id } from '@engspace/core';
import { Db } from '..';

export { documentDao } from './document';
export { documentRevisionDao } from './document-revision';
export { loginDao } from './login';
export { memberDao } from './member';
export { partFamilyDao } from './part-family';
export { projectDao } from './project';
export { userDao } from './user';

/**
 * Data Access Object
 *
 * An object that connects to the database to access a type of object
 */
export interface Dao<T extends HasId> {
    byId(db: Db, id: Id): Promise<T>;
    checkId(db: Db, id: Id): Promise<boolean>;
    batchByIds(db: Db, ids: readonly Id[]): Promise<T[]>;
    deleteById(db: Db, id: Id): Promise<T>;
    deleteAll(db: Db): Promise<number>;
}
