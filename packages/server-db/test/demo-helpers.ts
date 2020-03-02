import {
    asyncKeyMap,
    DemoPartFamilyInputSet,
    DemoPartFamilySet,
    DemoUserSet,
    partFamiliesInput,
    prepareUsers,
} from '@engspace/demo-data-input';
import { pool } from '.';
import { partFamilyDao, userDao, Db } from '../src';
import { createUsers } from './user';

export async function createDemoUsers(): Promise<DemoUserSet> {
    return pool.transaction(async db => createUsers(db, prepareUsers()));
}

export async function deleteAllUsers(): Promise<void> {
    await pool.transaction(async db => userDao.deleteAll(db));
}

export async function createPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    return asyncKeyMap(input, async pf => partFamilyDao.create(db, pf));
}

export async function createDemoFamilies(): Promise<DemoPartFamilySet> {
    return pool.transaction(async db => createPartFamilies(db, partFamiliesInput));
}

export async function deleteAllFamilies(): Promise<void> {
    await pool.transaction(async db => partFamilyDao.deleteAll(db));
}
