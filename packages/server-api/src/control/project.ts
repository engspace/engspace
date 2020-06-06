import { ProjectInput, Project, Id, ProjectMemberInput, ProjectMember } from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { assertUserPerm, assertUserOrProjectPerm } from './helpers';
import { ApiContext, Pagination } from '.';

export class ProjectControl {
    constructor(private dao: DaoSet) {}

    create(ctx: ApiContext, project: ProjectInput): Promise<Project> {
        assertUserPerm(ctx, 'project.create');
        return this.dao.project.create(ctx.db, project);
    }

    byId(ctx: ApiContext, id: Id): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return this.dao.project.byId(ctx.db, id);
    }

    byCode(ctx: ApiContext, code: string): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return this.dao.project.byCode(ctx.db, code);
    }

    search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; projects: Project[] }> {
        assertUserPerm(ctx, 'project.read');
        const { offset, limit } = pag;
        return this.dao.project.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    async update(ctx: ApiContext, id: Id, input: ProjectInput): Promise<Project> {
        await assertUserOrProjectPerm(ctx, id, 'project.update');
        return this.dao.project.updateById(ctx.db, id, input);
    }

    async addMember(ctx: ApiContext, input: ProjectMemberInput): Promise<ProjectMember> {
        await assertUserOrProjectPerm(ctx, input.projectId, 'member.create');
        return this.dao.projectMember.create(ctx.db, input);
    }

    async memberById(ctx: ApiContext, memberId: Id): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return this.dao.projectMember.byId(ctx.db, memberId);
    }

    memberByProjectAndUserId(
        ctx: ApiContext,
        projectId: Id,
        userId: Id
    ): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return this.dao.projectMember.byProjectAndUserId(ctx.db, projectId, userId);
    }

    membersByProjectId(ctx: ApiContext, projId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return this.dao.projectMember.byProjectId(ctx.db, projId);
    }

    membersByUserId(ctx: ApiContext, userId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return this.dao.projectMember.byUserId(ctx.db, userId);
    }

    memberRoles(ctx: ApiContext, memberId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'member.read');
        return this.dao.projectMember.rolesById(ctx.db, memberId);
    }

    async updateMemberRoles(
        ctx: ApiContext,
        memberId: Id,
        roles: string[]
    ): Promise<ProjectMember> {
        const mem = await this.dao.projectMember.byId(ctx.db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.update');
        return this.dao.projectMember.updateRolesById(ctx.db, memberId, roles);
    }

    async deleteMember(ctx: ApiContext, memberId: Id): Promise<ProjectMember> {
        const mem = await this.dao.projectMember.byId(ctx.db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.delete');
        return this.dao.projectMember.deleteById(ctx.db, memberId);
    }
}
