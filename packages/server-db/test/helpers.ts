import {
    DemoPartFamilySet,
    DemoProjectSet,
    DemoUserSet,
    partFamiliesInput,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data-input';
import { sql } from 'slonik';
import { pool } from '.';
import { createDemoPartFamilies, createDemoProjects, createDemoUsers } from '../src';

export function transacDemoUsers(): Promise<DemoUserSet> {
    return pool.transaction(async db => createDemoUsers(db, prepareUsers()));
}

export function transacDemoProjects(): Promise<DemoProjectSet> {
    return pool.transaction(async db => createDemoProjects(db, prepareProjects()));
}

export function transacDemoPartFamilies(): Promise<DemoPartFamilySet> {
    return pool.transaction(async db => createDemoPartFamilies(db, partFamiliesInput));
}

export function cleanTable(tableName: string) {
    return async function(): Promise<void> {
        return pool.transaction(async db => {
            await db.query(sql`DELETE FROM ${sql.identifier([tableName])}`);
        });
    };
}

export function cleanTables(tableNames: string[]) {
    return async function(): Promise<void> {
        return pool.transaction(async db => {
            for (const tableName of tableNames) {
                await db.query(sql`DELETE FROM ${sql.identifier([tableName])}`);
            }
        });
    };
}
