import { sql } from 'slonik';
import { Id, ProjectMember, ProjectMemberInput } from '@engspace/core';
import { Db } from '..';
import { DaoBase, foreignKey, RowId, toId, DaoBaseConfig } from './base';

const table = 'project_member';

const dependencies = ['user', 'project'];

const schema = [
    sql`
        CREATE TABLE project_member (
            id serial PRIMARY KEY,
            project_id integer NOT NULL,
            user_id integer NOT NULL,

            UNIQUE(project_id, user_id),
            FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES "user"(id)
        )
    `,
    sql`
        CREATE TABLE project_member_role (
            member_id integer NOT NULL,
            role text NOT NULL,

            PRIMARY KEY(member_id, role),
            FOREIGN KEY(member_id) REFERENCES project_member(id)
                    ON DELETE CASCADE
        )
    `,
];
interface Row {
    id: RowId;
    projectId: RowId;
    userId: RowId;
}

function mapRow({ id, projectId, userId }: Row): ProjectMember {
    return {
        id: toId(id),
        project: foreignKey(projectId),
        user: foreignKey(userId),
    };
}

const rowToken = sql`id, project_id, user_id`;

export class ProjectMemberDao extends DaoBase<ProjectMember, Row> {
    constructor(config: Partial<DaoBaseConfig<ProjectMember, Row>> = {}) {
        super(table, {
            dependencies,
            schema,
            rowToken,
            mapRow,
            ...config,
        });
    }
    /**
     * Add a single member to the database.
     *
     * Roles are also inserted in the Db
     *
     * @param db database connection
     * @param member member to be added
     */
    async create(db: Db, { projectId, userId, roles }: ProjectMemberInput): Promise<ProjectMember> {
        const row: Row = await db.one(sql`
            INSERT INTO project_member(
                project_id, user_id
            ) VALUES (
                ${projectId}, ${userId}
            )
            RETURNING ${this.rowToken}
        `);
        const res = this.mapRow(row);
        if (roles && roles.length) {
            res.roles = await insertRoles(db, res.id, roles);
        }
        return res;
    }

    /**
     * Get all members for a project id
     */
    async byProjectId(db: Db, projectId: Id): Promise<ProjectMember[]> {
        const rows = await db.any<Row>(sql`
            SELECT ${this.rowToken} FROM project_member
            WHERE project_id = ${projectId}
        `);
        return rows.map((r) => this.mapRow(r));
    }

    /**
     * Get all members for a user id.
     * This is used to fetch all projects a user is involved in.
     */
    async byUserId(db: Db, userId: Id): Promise<ProjectMember[]> {
        const rows = await db.any<Row>(sql`
            SELECT ${this.rowToken} FROM project_member
            WHERE user_id = ${userId}
        `);
        return rows.map((r) => this.mapRow(r));
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
    async byProjectAndUserId(
        db: Db,
        projectId: Id,
        userId: Id,
        fetchRoles = false
    ): Promise<ProjectMember | null> {
        const row = await db.maybeOne<Row>(sql`
            SELECT ${this.rowToken} FROM project_member
            WHERE project_id=${projectId} AND user_id=${userId}
        `);
        if (!row) return null;
        const res = this.mapRow(row);
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
    async rolesById(db: Db, id: Id): Promise<string[]> {
        const rows = await db.anyFirst(sql`
            SELECT role FROM project_member_role
            WHERE member_id = ${id}
        `);
        return rows as string[];
    }

    async updateRolesById(db: Db, id: Id, roles: string[]): Promise<ProjectMember> {
        await db.query(sql`
            DELETE FROM project_member_role
            WHERE member_id = ${id}
        `);

        const inserted = roles ? await insertRoles(db, id, roles) : [];
        const member = await this.byId(db, id);
        member.roles = inserted;
        return member;
    }

    /**
     * Delete all members from a project
     */
    async deleteByProjId(db: Db, projectId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE project_id = ${projectId}
        `);
    }

    /**
     * Delete all project memberships from a user
     */
    async deleteByUserId(db: Db, userId: Id): Promise<void> {
        await db.query(sql`
            DELETE FROM project_member
            WHERE user_id = ${userId}
        `);
    }

    /**
     * Delete a member from a project
     */
    async deleteByProjectAndUserId(db: Db, projectId: Id, userId: Id): Promise<void> {
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
            roles.map((role) => sql`(${id}, ${role})`),
            sql`, `
        )}
        RETURNING role
    `);
    return inserted as string[];
}
