import { Id, ProjectMember, ProjectMemberInput, ProjectRole } from '@engspace/core';
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
    static async create(
        db: Db,
        { projectId, userId, roles }: ProjectMemberInput
    ): Promise<ProjectMember> {
        const row = await db.one(sql`
            INSERT INTO project_member(
                project_id, user_id, updated_on
            ) VALUES (
                ${projectId}, ${userId}, now()
            )
            RETURNING id, project_id, user_id
        `);
        const res: ProjectMember = {
            id: row.id.toString() as Id,
            project: { id: row.projectId as Id },
            user: { id: row.userId as Id },
        };
        if (roles && roles.length) {
            res.roles = await insertRoles(db, res.id, roles);
        }
        return res;
    }

    /**
     * Get a member by its id
     */
    static async byId(db: Db, id: Id): Promise<ProjectMember> {
        interface Row {
            id: number;
            projectId: Id;
            userId: Id;
        }
        const row = await db.one<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE id = ${parseInt(id)}
        `);
        return {
            id: row.id.toString() as Id,
            project: { id: row.projectId as Id },
            user: { id: row.userId as Id },
        };
    }

    /**
     * Get all members for a project id
     */
    static async byProjectId(db: Db, projectId: Id): Promise<ProjectMember[]> {
        interface Row {
            id: number;
            projectId: Id;
            userId: Id;
        }
        const rows = await db.any<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE project_id = ${projectId}
        `);
        return rows.map(r => ({
            id: r.id.toString(),
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
            id: number;
            projectId: Id;
            userId: Id;
        }
        const rows = await db.any<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE user_id = ${userId}
        `);
        return rows.map(r => ({
            id: r.id.toString(),
            project: { id: r.projectId },
            user: { id: r.userId },
        }));
    }

    /**
     * Get a single project member by project and user id.
     * This is used to check if a user is a member of a project.
     *
     * @param db The databse connection
     * @param projectId the id of the project
     * @param userId the id of the user
     * @param fetchRoles whether the roles should be included in the result
     *
     * @returns null if no such user, or the project member
     */
    static async byProjectAndUserId(
        db: Db,
        projectId: Id,
        userId: Id,
        fetchRoles = false
    ): Promise<ProjectMember | null> {
        interface Row {
            id: number;
            projectId: Id;
            userId: Id;
        }
        const row = await db.maybeOne<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE project_id=${projectId} AND user_id=${userId}
        `);
        if (!row) return null;
        const res: ProjectMember = {
            id: row.id.toString(),
            project: { id: row.projectId },
            user: { id: row.userId },
        };
        if (fetchRoles) {
            res.roles = await this.rolesById(db, res.id);
        }
        return res;
    }

    /**
     * Get project roles for a single project member
     *
     * @param db The databse connection
     * @param id the id of the member
     */
    static async rolesById(db: Db, id: Id): Promise<ProjectRole[]> {
        const rows = await db.anyFirst(sql`
            SELECT role FROM project_member_role
            WHERE member_id = ${parseInt(id)}
        `);
        return rows as ProjectRole[];
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

    static async updateRolesById(db: Db, id: Id, roles: ProjectRole[]): Promise<ProjectMember> {
        await db.query(sql`
            DELETE FROM project_member_role
            WHERE member_id = ${parseInt(id)}
        `);

        const inserted = roles ? await insertRoles(db, id, roles) : [];
        const member = await MemberDao.byId(db, id);
        member.roles = inserted;
        return member;
    }

    /**
     * Delete a member from a project
     */
    static async deleteById(db: Db, id: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE id = ${parseInt(id)}
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

    /**
     * Delete a member from a project
     */
    static async deleteByProjectAndUserId(db: Db, projectId: Id, userId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id=${projectId} AND user_id=${userId}
        `);
    }
}

async function insertRoles(db: Db, id: Id, roles: ProjectRole[]): Promise<ProjectRole[]> {
    const inserted = await db.manyFirst<ProjectRole>(sql`
        INSERT INTO project_member_role(
            member_id, role
        ) VALUES ${sql.join(
            roles.map(role => sql`(${parseInt(id)}, ${role})`),
            sql`, `
        )}
        RETURNING role
    `);
    return inserted as ProjectRole[];
}
