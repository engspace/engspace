import { ApiContext, Pagination } from '.';
import { ProjectInput, Project, Id, ProjectMemberInput, ProjectMember } from '@engspace/core';
import { assertUserPerm, assertUserOrProjectPerm } from './helpers';
import { projectDao, memberDao } from '@engspace/server-db';

export class ProjectControl {
    create(ctx: ApiContext, project: ProjectInput): Promise<Project> {
        assertUserPerm(ctx, 'project.create');
        return projectDao.create(ctx.db, project);
    }

    byId(ctx: ApiContext, id: Id): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return projectDao.byId(ctx.db, id);
    }

    byCode(ctx: ApiContext, code: string): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return projectDao.byCode(ctx.db, code);
    }

    search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; projects: Project[] }> {
        assertUserPerm(ctx, 'project.read');
        const { offset, limit } = pag;
        return projectDao.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    async update(ctx: ApiContext, id: Id, project: ProjectInput): Promise<Project> {
        await assertUserOrProjectPerm(ctx, id, 'project.update');
        return projectDao.updateById(ctx.db, id, project);
    }

    async addMember(ctx: ApiContext, input: ProjectMemberInput): Promise<ProjectMember> {
        await assertUserOrProjectPerm(ctx, input.projectId, 'member.create');
        return memberDao.create(ctx.db, input);
    }

    async memberById(ctx: ApiContext, memberId: Id): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byId(ctx.db, memberId);
    }

    memberByProjectAndUserId(
        ctx: ApiContext,
        projectId: Id,
        userId: Id
    ): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byProjectAndUserId(ctx.db, projectId, userId);
    }

    membersByProjectId(ctx: ApiContext, projId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byProjectId(ctx.db, projId);
    }

    membersByUserId(ctx: ApiContext, userId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byUserId(ctx.db, userId);
    }

    memberRoles(ctx: ApiContext, memberId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.rolesById(ctx.db, memberId);
    }

    async updateMemberRoles(
        ctx: ApiContext,
        memberId: Id,
        roles: string[]
    ): Promise<ProjectMember> {
        const mem = await memberDao.byId(ctx.db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.update');
        return memberDao.updateRolesById(ctx.db, memberId, roles);
    }

    async deleteMember(ctx: ApiContext, memberId: Id): Promise<ProjectMember> {
        const mem = await memberDao.byId(ctx.db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.delete');
        return memberDao.deleteById(ctx.db, memberId);
    }
}
