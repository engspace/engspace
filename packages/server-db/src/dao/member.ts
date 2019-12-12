import { Id, ProjectMember, ProjectRole } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

export class MemberDao {
    /**
     * Add a single member to the database.
     *
     * Roles are also inserted in the Db
     *
     * @param db database connection
     * @param member member to be added
     */
    static async create(db: Db, member: ProjectMember): Promise<ProjectMember> {
        const row = await db.one(sql`
            INSERT INTO project_member(
                project_id, user_id, updated_on
            ) VALUES (
                ${member.project.id}, ${member.user.id}, now()
            )
            RETURNING project_id, user_id
        `);
        const res: ProjectMember = {
            project: { id: row.projectId as Id },
            user: { id: row.userId as Id },
        };
        if (member.roles && member.roles.length) {
            res.roles = await insertRoles(db, member);
        }
        return res;
    }

    /**
     * Get all members for a project id
     */
    static async byProjectId(db: Db, projectId: Id): Promise<ProjectMember[]> {
        interface Row {
            projectId: Id;
            userId: Id;
        }
        const rows = await db.any<Row>(sql`
            SELECT project_id, user_id FROM project_member
            WHERE project_id = ${projectId}
        `);
        return rows.map(r => ({
            project: { id: r.projectId },
            user: { id: r.userId },
        }));
    }

    /**
     * Get all members for a user id.
     * This is used to fetch all projects a user is involved in.
     */
    static async byUserId(db: Db, userId: Id): Promise<ProjectMember[]> {
        interface Row {
            projectId: Id;
            userId: Id;
        }
        const rows = await db.any<Row>(sql`
            SELECT project_id, user_id FROM project_member
            WHERE user_id = ${userId}
        `);
        return rows.map(r => ({
            project: { id: r.projectId },
            user: { id: r.userId },
        }));
    }

    /**
     * Get project roles for a single project member
     *
     * @param db The databse connection
     * @param projectId the id of the project
     * @param userId the id of the user
     */
    static async rolesByProjectAndUserId(
        db: Db,
        { projectId, userId }: { projectId: Id; userId: Id }
    ): Promise<ProjectRole[] | null> {
        interface Row {
            projectId: Id;
            userId: Id;
            role: ProjectRole | null;
        }
        const rows = await db.any<Row>(sql`
            SELECT pm.user_id, pm.project_id, pmr.role FROM project_member AS pm
            LEFT OUTER JOIN project_member_role AS pmr
                ON pmr.project_id = pm.project_id
                AND pmr.user_id = pm.user_id
            WHERE pm.project_id = ${projectId} AND pm.user_id = ${userId}
        `);
        if (rows.length === 0) {
            return null;
        }
        const member: ProjectMember = {
            project: { id: rows[0].projectId },
            user: { id: rows[0].userId },
        };
        if (rows[0].role) {
            member.roles = rows.map(r => r.role);
        }
        return rows.filter(r => r.role !== null).map(r => r.role);
    }

    // /**
    //  * Upsert members in the db.
    //  *
    //  * Members not existing already are inserted.
    //  * Members already existing have their timestamp updated.
    //  * All members' roles are deleted and re-inserted.
    //  *
    //  * Everything is done in 3 SQL queries.
    //  *
    //  * Caller may use the returned timestamp to delete obsolete members
    //  *
    //  * @param db database connection
    //  * @param members array of members to upsert in the database
    //  *
    //  * @returns the timestamp at which all members where updated/inserted.
    //  */
    // static async upsert(db: Db, members: ProjectMember[]): Promise<string> {
    //     const now = new Date().toISOString();
    //     const mems = members.map(m => [m.project.id, m.user.id, now]);

    //     await db.query(sql`
    //         INSERT INTO project_member AS pm (
    //             project_id, user_id, updated_on
    //         )
    //         SELECT * FROM ${sql.unnest(mems, ['uuid', 'uuid', 'timestamp'])}
    //         ON CONFLICT(project_id, user_id) DO
    //             UPDATE SET
    //                 updated_on = EXCLUDED.updated_on
    //             WHERE pm.project_id = EXCLUDED.project_id AND pm.user_id = EXCLUDED.user_id
    //     `);
    //     await db.query(sql`
    //         DELETE FROM project_member_role AS pmr
    //         USING project_member AS pm
    //         WHERE pmr.project_id = pm.project_id
    //             AND pmr.user_id = pm.user_id
    //             AND pm.updated_on = ${now}
    //     `);
    //     const roles = members.map(m => [m.project.id, m.user.id, m.roles].flat(1));
    //     await db.query(sql`
    //         INSERT INTO project_member_role AS pm (
    //             project_id, user_id, role
    //         )
    //         SELECT * FROM ${sql.unnest(roles, ['uuid', 'uuid', 'text'])}
    //     `);
    //     return now;
    // }

    /**
     * Delete a member from a project
     */
    static async deleteById(
        db: Db,
        { projectId, userId }: { projectId: Id; userId: Id }
    ): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id = ${projectId} AND user_id = ${userId}
        `);
    }

    /**
     * Delete all members from a project
     */
    static async deleteByProjId(db: Db, projectId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id = ${projectId}
        `);
    }

    /**
     * Delete all project memberships from a user
     */
    static async deleteByUserId(db: Db, userId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE user_id = ${userId}
        `);
    }
}

async function insertRoles(db: Db, member: ProjectMember): Promise<ProjectRole[]> {
    const roles = await db.manyFirst<ProjectRole>(sql`
        INSERT INTO project_member_role(
            project_id, user_id, role
        ) VALUES ${sql.join(
            member.roles.map(role => sql`(${member.project.id}, ${member.user.id}, ${role})`),
            sql`, `
        )}
        RETURNING role
    `);
    return roles as ProjectRole[];
}
