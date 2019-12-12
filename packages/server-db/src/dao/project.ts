import { Id, Project, ProjectInput } from '@engspace/core';
import { sql } from 'slonik';
import { idsFindMap } from '.';
import { Db } from '..';
import { partialAssignmentList } from '../util';

export interface ProjectSearch {
    phrase?: string;
    member?: string;
    limit?: number;
    offset?: number;
}

export class ProjectDao {
    static async create(db: Db, proj: ProjectInput): Promise<Project> {
        const { code, name, description } = proj;
        return db.one(sql`
            INSERT INTO project (
                code, name, description, updated_on
            ) VALUES (
                ${code}, ${name}, ${description}, now()
            ) RETURNING
                id, code, name, description
        `);
    }

    static async byId(db: Db, id: Id): Promise<Project> {
        return db.one(sql`
            SELECT id, code, name, description
            FROM project
            WHERE id = ${id}
        `);
    }
    static async batchByIds(db: Db, ids: readonly Id[]): Promise<Project[]> {
        const projs: Project[] = await db.any(sql`
            SELECT id, code, name, description
            FROM project
            WHERE id = ANY(${sql.array(ids as Id[], sql`uuid[]`)})
        `);
        return idsFindMap(ids, projs);
    }

    static async byCode(db: Db, code: string): Promise<Project> {
        return db.one(sql`
            SELECT id, code, name, description
            FROM project
            WHERE code = ${code}
        `);
    }

    static async patch(db: Db, id: Id, project: Partial<Project>): Promise<Project> {
        const assignments = partialAssignmentList(project, ['name', 'code', 'description']);
        return db.one(sql`
            UPDATE project SET ${sql.join(assignments, sql`, `)}
            WHERE id = ${id}
            RETURNING id, code, name, description
        `);
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

    static async deleteById(db: Db, id: Id): Promise<void> {
        await db.query(sql`DELETE FROM project WHERE id = ${id}`);
    }
}
