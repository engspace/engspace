import { sql } from 'slonik';

import { Project, ProjectInput, ProjectMember } from '@engspace/core';
import { Db } from '..';
import { UserDao } from './user';
import { idsFindMap } from '.';

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
    members: ProjectMember[],
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
    static async byId(db: Db, id: number): Promise<Project> {
        return db.one<DbProject>(sql`
            SELECT id, name, code, description
            FROM project
            WHERE id = ${id}
        `);
    }
    static async batchByIds(db: Db, ids: readonly number[]): Promise<Project[]> {
        const projs: Project[] = await db.any<DbProject>(sql`
            SELECT id, name, code, description
            FROM project
            WHERE id = ANY(${sql.array(ids as number[], 'int4')})
        `);
        return idsFindMap(ids, projs);
    }

    static async byCode(db: Db, code: string): Promise<Project> {
        const proj = await db.one<DbProject>(sql`
            SELECT id, name, code, description
            FROM project
            WHERE code = ${code}
        `);
        const members = await ProjectDao.membersById(db, proj.id);
        return {
            ...proj,
            members,
        };
    }

    static async membersById(db: Db, projectId: number): Promise<ProjectMember[]> {
        interface Row {
            id: number;
            name: string;
            email: string;
            fullName: string;
            leader: boolean;
            designer: boolean;
        }
        const rows: Row[] = await db.any(sql`
            SELECT
                u.id,
                u.name,
                u.email,
                u.full_name,
                pm.leader,
                pm.designer
            FROM project_member pm
            INNER JOIN "user" u ON u.id = pm.user_id
            WHERE pm.project_id = ${projectId}
            ORDER BY pm.ind
        `);
        return rows.map(r => ({
            user: {
                id: r.id,
                name: r.name,
                email: r.email,
                fullName: r.fullName,
            },
            leader: r.leader,
            designer: r.designer,
        }));
    }

    static async create(db: Db, proj: ProjectInput): Promise<Project> {
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
        const members = await ProjectDao.membersById(db, project.id);
        return {
            ...project,
            members,
        };
    }

    static async updateById(db: Db, project: Project): Promise<Project> {
        await upsertMembers(db, project.members, project.id, true);
        await db.query(sql`
            UPDATE project SET
                name = ${project.name},
                code = ${project.code},
                description = ${project.description}
            WHERE id = ${project.id as number}
        `);
        return ProjectDao.byId(db, project.id);
    }

    static async search(
        db: Db,
        search: ProjectSearch
    ): Promise<{ count: number; projects: Project[] }> {
        const boolExpressions = [sql`TRUE`];
        if (search.phrase) {
            const phrase = `%${search.phrase.replace(/s/g, '%')}%`;
            boolExpressions.push(sql`(
                p.name ILIKE ${phrase} OR
                p.code ILIKE ${phrase} OR
                p.description ILIKE ${phrase})`);
        }
        let joinToken = sql``;
        if (search.member) {
            const member = `%${search.member.replace(/s/g, '%')}%`;
            boolExpressions.push(sql`(
                u.name ILIKE ${member} OR
                u.email ILIKE ${member} OR
                u.full_name ILIKE ${member}
            )`);
            joinToken = sql`
                LEFT OUTER JOIN project_member AS pm ON pm.project_id = p.id
                LEFT OUTER JOIN "user" AS u ON u.id = pm.user_id
            `;
        }
        const whereToken = sql.join(boolExpressions, sql` AND `);
        const limitToken = sql`${search.limit ? search.limit : 1000}`;
        const offset = search.offset ? search.offset : 0;
        const offsetToken = sql`${offset}`;
        const projects: Project[] = await db.any(sql`
            SELECT p.id, p.name, p.code, p.description FROM project AS p
            ${joinToken}
            WHERE ${whereToken}
            LIMIT ${limitToken}
            OFFSET ${offsetToken}
        `);
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
        await db.query(sql`DELETE FROM project`);
    }

    static async deleteById(db: Db, id: number): Promise<void> {
        await db.query(sql`DELETE FROM project WHERE id = ${id}`);
    }
}
