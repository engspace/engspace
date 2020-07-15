import { sql } from 'slonik';
import { Id, Project, ProjectInput } from '@engspace/core';
import { Db } from '..';
import { partialAssignmentList } from '../util';
import { DaoBase, RowId, toId } from './base';

const table = 'project';

const dependencies = [];

const schema = [
    sql`
        CREATE TABLE project (
            id serial PRIMARY KEY,
            name text NOT NULL,
            code text NOT NULL UNIQUE,
            description text
        )
    `,
];

export interface ProjectSearch {
    phrase?: string;
    member?: string;
    limit?: number;
    offset?: number;
}

interface Row {
    id: RowId;
    name: string;
    code: string;
    description: string;
}

function mapRow({ id, name, code, description }: Row): Project {
    return {
        id: toId(id),
        name,
        code,
        description,
    };
}

const rowToken = sql`id, code, name, description`;

export class ProjectDao extends DaoBase<Project, Row> {
    constructor() {
        super({
            table,
            dependencies,
            schema,
            rowToken,
            mapRow,
        });
    }
    async create(db: Db, proj: ProjectInput): Promise<Project> {
        const { code, name, description } = proj;
        const row: Row = await db.one(sql`
            INSERT INTO project (
                code, name, description
            ) VALUES (
                ${code}, ${name}, ${description}
            ) RETURNING
                ${rowToken}
        `);
        return mapRow(row);
    }

    async byCode(db: Db, code: string): Promise<Project> {
        const row: Row = await db.maybeOne(sql`
            SELECT ${rowToken} FROM project
            WHERE code = ${code}
        `);
        return mapRow(row);
    }

    async search(db: Db, search: ProjectSearch): Promise<{ count: number; projects: Project[] }> {
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
            const member = `%${search.member.replace(/\s/g, '%')}%`;
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
        const rows: Row[] = await db.any(sql`
            SELECT p.id, p.name, p.code, p.description FROM project AS p
            ${joinToken}
            WHERE ${whereToken}
            LIMIT ${limitToken}
            OFFSET ${offsetToken}
        `);
        let count = rows.length + offset;
        if (search.limit && rows.length === search.limit) {
            count = (await db.oneFirst(sql`
                SELECT COUNT(p.id) FROM project AS p
                LEFT OUTER JOIN project_member AS pm ON pm.project_id = p.id
                LEFT OUTER JOIN "user" AS u ON u.id = pm.user_id
                WHERE ${whereToken}
            `)) as number;
        }
        return { count, projects: rows.map((r) => mapRow(r)) };
    }

    async patch(db: Db, id: Id, project: Partial<Project>): Promise<Project> {
        const assignments = partialAssignmentList(project, ['name', 'code', 'description']);
        const row: Row = await db.maybeOne(sql`
            UPDATE project SET ${sql.join(assignments, sql`, `)}
            WHERE id = ${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }

    async updateById(db: Db, id: Id, project: ProjectInput): Promise<Project> {
        const { code, name, description } = project;
        const row: Row = await db.maybeOne(sql`
            UPDATE project SET code=${code}, name=${name}, description=${description}
            WHERE id=${id}
            RETURNING ${rowToken}
        `);
        return mapRow(row);
    }
}
