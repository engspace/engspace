import { ProjectRole } from '@engspace/core';
import {
    createProjects,
    createUsers,
    DemoProjectSet,
    DemoUserSet,
    prepareProjects,
    prepareUsers,
} from '@engspace/demo-data';
import chai from 'chai';
import { pool } from '.';
import { MemberDao, ProjectDao, UserDao } from '../src';

const { expect } = chai;

describe('Members', () => {
    let users: DemoUserSet;
    let projects: DemoProjectSet;

    before('Create users and projects', async () => {
        [users, projects] = await pool.connect(async db =>
            Promise.all([createUsers(db, prepareUsers()), createProjects(db, prepareProjects())])
        );
    });

    after('Delete users and projects', async () => {
        await pool.connect(async db => {
            await ProjectDao.deleteAll(db);
            await UserDao.deleteAll(db);
        });
    });

    describe('Create', () => {
        it('should create a project member', async () => {
            const created = await pool.connect(db =>
                MemberDao.create(db, {
                    project: projects.chair,
                    user: users.tania,
                    roles: [ProjectRole.Leader],
                })
            );
            const expected = {
                project: { id: projects.chair.id },
                user: { id: users.tania.id },
                roles: [ProjectRole.Leader],
            };
            expect(created).to.eql(expected);
        });
    });
});
