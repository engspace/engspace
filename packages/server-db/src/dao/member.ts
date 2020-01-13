import { Id, ProjectMember, ProjectMemberInput } from '@engspace/core';
import { sql } from 'slonik';
import { Db } from '..';

export namespace MemberDao {
    interface Row {
        id: number;
        projectId: Id;
        userId: Id;
    }

    function mapRow(row: Row): ProjectMember {
        return {
            id: row.id.toString(),
            project: { id: row.projectId },
            user: { id: row.userId },
        };
    }

    /**
     * Add a single member to the database.
     *
     * Roles are also inserted in the Db
     *
     * @param db database connection
     * @param member member to be added
     */
    export async function create(
        db: Db,
        { projectId, userId, roles }: ProjectMemberInput
    ): Promise<ProjectMember> {
        const row: Row = await db.one(sql`
            INSERT INTO project_member(
                project_id, user_id
            ) VALUES (
                ${projectId}, ${userId}
            )
            RETURNING id, project_id, user_id
        `);
        const res = mapRow(row);
        if (roles && roles.length) {
            res.roles = await insertRoles(db, res.id, roles);
        }
        return res;
    }

    /**
     * Get a member by its id
     */
    export async function byId(db: Db, id: Id): Promise<ProjectMember> {
        const row = await db.one<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE id = ${parseInt(id)}
        `);
        return mapRow(row);
    }

    /**
     * Get all members for a project id
     */
    export async function byProjectId(db: Db, projectId: Id): Promise<ProjectMember[]> {
        const rows = await db.any<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE project_id = ${projectId}
        `);
        return rows.map(r => mapRow(r));
    }

    /**
     * Get all members for a user id.
     * This is used to fetch all projects a user is involved in.
     */
    export async function byUserId(db: Db, userId: Id): Promise<ProjectMember[]> {
        const rows = await db.any<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE user_id = ${userId}
        `);
        return rows.map(r => mapRow(r));
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
    export async function byProjectAndUserId(
        db: Db,
        projectId: Id,
        userId: Id,
        fetchRoles = false
    ): Promise<ProjectMember | null> {
        const row = await db.maybeOne<Row>(sql`
            SELECT id, project_id, user_id FROM project_member
            WHERE project_id=${projectId} AND user_id=${userId}
        `);
        if (!row) return null;
        const res = mapRow(row);
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
    export async function rolesById(db: Db, id: Id): Promise<string[]> {
        const rows = await db.anyFirst(sql`
            SELECT role FROM project_member_role
            WHERE member_id = ${parseInt(id)}
        `);
        return rows as string[];
    }

    export async function updateRolesById(db: Db, id: Id, roles: string[]): Promise<ProjectMember> {
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
    export async function deleteById(db: Db, id: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE id = ${parseInt(id)}
        `);
    }

    /**
     * Delete all members from a project
     */
    export async function deleteByProjId(db: Db, projectId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id = ${projectId}
        `);
    }

    /**
     * Delete all project memberships from a user
     */
    export async function deleteByUserId(db: Db, userId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE user_id = ${userId}
        `);
    }

    /**
     * Delete a member from a project
     */
    export async function deleteByProjectAndUserId(
        db: Db,
        projectId: Id,
        userId: Id
    ): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id=${projectId} AND user_id=${userId}
        `);
    }
}

async function insertRoles(db: Db, id: Id, roles: string[]): Promise<string[]> {
    const inserted = await db.manyFirst(sql`
        INSERT INTO project_member_role(
            member_id, role
        ) VALUES ${sql.join(
            roles.map(role => sql`(${parseInt(id)}, ${role})`),
            sql`, `
        )}
        RETURNING role
    `);
    return inserted as string[];
}
