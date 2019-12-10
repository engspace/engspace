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
        const row = await db.one<ProjectMember>(sql`
            INSERT INTO project_member(
                project_id, user_id, updated_on
            ) VALUES (
                ${member.project.id}, ${member.user.id}, now()
            )
            RETURNING project_id, user_id
        `);
        if (member.roles && member.roles.length) {
            row.roles = await insertRoles(db, member);
        }
        return row;
    }

    /**
     * Upsert members in the db.
     *
     * Members not existing already are inserted.
     * Members already existing have their timestamp updated.
     * All members' roles are deleted and re-inserted.
     *
     * Everything is done in 3 SQL queries.
     *
     * Caller may use the returned timestamp to delete obsolete members
     *
     * @param db database connection
     * @param members array of members to upsert in the database
     *
     * @returns the timestamp at which all members where updated/inserted.
     */
    static async upsert(db: Db, members: ProjectMember[]): Promise<string> {
        const now = new Date().toISOString();
        const mems = members.map(m => [m.project.id, m.user.id, now]);

        await db.query(sql`
            INSERT INTO project_member AS pm (
                project_id, user_id, updated_on
            )
            SELECT * FROM ${sql.unnest(mems, ['uuid', 'uuid', 'timestamp'])}
            ON CONFLICT(project_id, user_id) DO
                UPDATE SET
                    updated_on = EXCLUDED.updated_on
                WHERE pm.project_id = EXCLUDED.project_id AND pm.user_id = EXCLUDED.user_id
        `);
        await db.query(sql`
            DELETE FROM project_member_role AS pmr
            USING project_member AS pm
            WHERE pmr.project_id = pm.project_id
                AND pmr.user_id = pm.user_id
                AND pm.updated_on = ${now}
        `);
        const roles = members.map(m => [m.project.id, m.user.id, m.roles].flat(1));
        await db.query(sql`
            INSERT INTO project_member_role AS pm (
                project_id, user_id, role
            )
            SELECT * FROM ${sql.unnest(roles, ['uuid', 'uuid', 'text'])}
        `);
        return now;
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
    static async rolesByProjAndUserId(db: Db, projectId: Id, userId: Id): Promise<ProjectRole[]> {
        const rows = await db.anyFirst<ProjectRole>(sql`
            SELECT role from project_member_role
            WHERE project_id = ${projectId} AND user_id = ${userId}
        `);
        return rows as ProjectRole[];
    }

    /**
     * Delete a member from a project
     */
    static async deleteById(db: Db, projectId: Id, userId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id = ${projectId} AND user_id = ${userId}
        `);
    }
}

async function insertRoles(db: Db, member: ProjectMember): Promise<ProjectRole[]> {
    return db.many<ProjectRole>(sql`
        INSERT INTO project_member_role(
            project_id, user_id, role
        ) VALUES ${sql.join(
            member.roles.map(role => sql`(${member.project.id}, ${member.user.id}, ${role})`),
            sql`, `
        )}
        RETURNING role
    `);
}
