import { CommonQueryMethodsType, sql } from 'slonik';

import { IProject, IProjectMember } from '@engspace/core';

interface DbProject {
    id: number;
    name: string;
    code: string;
    description: string;
}

async function upsertMembers(
    db: CommonQueryMethodsType,
    members: IProjectMember[],
    projId: number,
    deleteAfter = false
): Promise<void> {
    const now = new Date();
    const isoNow = now.toISOString();
    const memb = members.map((m, ind) => [
        projId,
        m.user.id,
        ind,
        m.leader,
        m.designer,
        isoNow,
    ]);
    await db.query(sql`
        INSERT INTO project_member AS pm (
            project_id, user_id, ind, leader, designer, updated_on
        )
        SELECT * FROM ${sql.unnest(memb, [
            'int4',
            'int4',
            'int4',
            'bool',
            'bool',
            'timestamp',
        ])}
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
    static async findById(
        db: CommonQueryMethodsType,
        id: number
    ): Promise<IProject> {
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

    static async findByCode(
        db: CommonQueryMethodsType,
        code: string
    ): Promise<IProject> {
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

    static async findMembersByProjectId(
        db: CommonQueryMethodsType,
        projectId: number
    ): Promise<IProjectMember[]> {
        const res: any[] = await db.any(sql`
            SELECT
                u.id as user_id,
                u.name,
                u.email,
                u.full_name,
                u.admin,
                u.manager,
                m.leader,
                m.designer
            FROM project_member as m
            LEFT OUTER JOIN "user" as u ON u.id = m.user_id
            WHERE m.project_id = ${projectId}
            ORDER BY m.ind
        `);
        return res.map(r => ({
            user: {
                id: r.userId,
                name: r.name,
                email: r.email,
                fullName: r.fullName,
                admin: r.admin,
                manager: r.manager,
            },
            leader: r.leader,
            designer: r.designer,
        }));
    }

    static async create(
        db: CommonQueryMethodsType,
        proj: IProject
    ): Promise<IProject> {
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

    static async updateById(
        db: CommonQueryMethodsType,
        project: IProject
    ): Promise<IProject> {
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

    static async deleteAll(db: CommonQueryMethodsType): Promise<void> {
        await db.query(sql`DELETE FROM project_member`);
        await db.query(sql`DELETE FROM project`);
    }

    static async deleteById(
        db: CommonQueryMethodsType,
        id: number
    ): Promise<void> {
        await db.query(
            sql`DELETE FROM project_member WHERE project_id = ${id}`
        );
        await db.query(sql`DELETE FROM project WHERE id = ${id}`);
    }
}
