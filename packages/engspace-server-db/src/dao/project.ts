import { sql } from 'slonik';

import { IProject, IProjectMember } from '@engspace/core';
import { Db } from '..';
import { UserDao } from './user';

export interface ProjectSearch {
    phrase?: string;
    member?: string;
    limit?: number;
    offset?: number;
}

interface DbProject {
    id: number;
    name: string;
    code: string;
    description: string;
}

async function upsertMembers(
    db: Db,
    members: IProjectMember[],
    projId: number,
    deleteAfter = false
): Promise<void> {
    const now = new Date();
    const isoNow = now.toISOString();
    const memb = members.map((m, ind) => [projId, m.user.id, ind, m.leader, m.designer, isoNow]);
    await db.query(sql`
        INSERT INTO project_member AS pm (
            project_id, user_id, ind, leader, designer, updated_on
        )
        SELECT * FROM ${sql.unnest(memb, ['int4', 'int4', 'int4', 'bool', 'bool', 'timestamp'])}
        ON CONFLICT(project_id, user_id) DO
            UPDATE SET
                ind = EXCLUDED.ind,
                leader = EXCLUDED.leader,
                designer = EXCLUDED.designer,
                updated_on = EXCLUDED.updated_on
            WHERE pm.project_id = EXCLUDED.project_id AND pm.user_id = EXCLUDED.user_id
    `);
    if (deleteAfter) {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id = ${projId} AND updated_on <> ${isoNow}
        `);
    }
}

export class ProjectDao {
    static async findById(db: Db, id: number): Promise<IProject> {
        const proj = await db.one<DbProject>(sql`
            SELECT id, name, code, description
            FROM project
            WHERE id = ${id}
        `);
        const members = await ProjectDao.findMembersByProjectId(db, proj.id);
        return {
            ...proj,
            members,
        };
    }

    static async findByCode(db: Db, code: string): Promise<IProject> {
        const proj = await db.one<DbProject>(sql`
            SELECT id, name, code, description
            FROM project
            WHERE code = ${code}
        `);
        const members = await ProjectDao.findMembersByProjectId(db, proj.id);
        return {
            ...proj,
            members,
        };
    }

    static async findMembersByProjectId(db: Db, projectId: number): Promise<IProjectMember[]> {
        const res: any[] = await db.any(sql`
            SELECT
                user_id,
                leader,
                designer
            FROM project_member
            WHERE project_id = ${projectId}
            ORDER BY ind
        `);
        return Promise.all(
            res.map(async r => ({
                user: await UserDao.findById(db, r.userId),
                leader: r.leader,
                designer: r.designer,
            }))
        );
    }

    static async create(db: Db, proj: IProject): Promise<IProject> {
        const { name, code, description } = proj;
        const project: DbProject = await db.one(sql`
            INSERT INTO project (
                name, code, description, updated_on
            ) VALUES (
                ${name}, ${code}, ${description}, now()
            ) RETURNING
                id, name, code, description
        `);

        upsertMembers(db, proj.members, project.id, false);
        const members = await ProjectDao.findMembersByProjectId(db, project.id);
        return {
            ...project,
            members,
        };
    }

    static async updateById(db: Db, project: IProject): Promise<IProject> {
        await upsertMembers(db, project.members, project.id as number, true);
        await db.query(sql`
            UPDATE project SET
                name = ${project.name},
                code = ${project.code},
                description = ${project.description}
            WHERE id = ${project.id as number}
        `);
        return ProjectDao.findById(db, project.id as number);
    }

    static async search(
        db: Db,
        search: ProjectSearch
    ): Promise<{ count: number; projects: IProject[] }> {
        const boolExpressions = [sql`TRUE`];
        if (search.phrase) {
            const phrase = `%${search.phrase.replace(/s/g, '%')}%`;
            boolExpressions.push(sql`(
                p.name ILIKE ${phrase} OR
                p.code ILIKE ${phrase} OR
                p.description ILIKE ${phrase})`);
        }
        if (search.member) {
            boolExpressions.push(sql`
                u.name = ${search.member}
            `);
        }
        const whereToken = sql.join(boolExpressions, sql` AND `);
        const limitToken = sql`${search.limit ? search.limit : 1000}`;
        const offset = search.offset ? search.offset : 0;
        const offsetToken = sql`${offset}`;
        const projectsWoMembers: IProject[] = await db.any(sql`
            SELECT p.id, p.name, p.code, p.description FROM project AS p
            LEFT OUTER JOIN project_member AS pm ON pm.project_id = p.id
            LEFT OUTER JOIN "user" AS u ON u.id = pm.user_id
            WHERE ${whereToken}
            LIMIT ${limitToken}
            OFFSET ${offsetToken}
        `);
        const projects = await Promise.all(
            projectsWoMembers.map(async p => ({
                roles: await this.findMembersByProjectId(db, p.id),
                ...p,
            }))
        );
        let count = projects.length + offset;
        if (search.limit && projects.length === search.limit) {
            count = (await db.oneFirst(sql`
                SELECT COUNT(p.id) FROM project AS p
                LEFT OUTER JOIN project_member AS pm ON pm.project_id = p.id
                LEFT OUTER JOIN "user" AS u ON u.id = pm.user_id
                WHERE ${whereToken}
            `)) as number;
        }
        return { count, projects };
    }

    static async deleteAll(db: Db): Promise<void> {
        await db.query(sql`DELETE FROM project_member`);
        await db.query(sql`DELETE FROM project`);
    }

    static async deleteById(db: Db, id: number): Promise<void> {
        await db.query(sql`DELETE FROM project_member WHERE project_id = ${id}`);
        await db.query(sql`DELETE FROM project WHERE id = ${id}`);
    }
}
