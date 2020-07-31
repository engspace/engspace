import { ProjectInput, Project, Id, ProjectMemberInput, ProjectMember } from '@engspace/core';
import { assertUserPerm, assertUserOrProjectPerm } from './helpers';
import { EsContext, Pagination } from '.';

export class ProjectControl {
    create(ctx: EsContext, project: ProjectInput): Promise<Project> {
        assertUserPerm(ctx, 'project.create');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.create(db, project);
    }

    byId(ctx: EsContext, id: Id): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.byId(db, id);
    }

    byCode(ctx: EsContext, code: string): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.byCode(db, code);
    }

    search(
        ctx: EsContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; projects: Project[] }> {
        assertUserPerm(ctx, 'project.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        const { offset, limit } = pag;
        return dao.project.search(db, {
            phrase: search,
            offset,
            limit,
        });
    }

    async update(ctx: EsContext, id: Id, input: ProjectInput): Promise<Project> {
        await assertUserOrProjectPerm(ctx, id, 'project.update');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.updateById(db, id, input);
    }

    async addMember(ctx: EsContext, input: ProjectMemberInput): Promise<ProjectMember> {
        await assertUserOrProjectPerm(ctx, input.projectId, 'member.create');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.create(db, input);
    }

    async memberById(ctx: EsContext, memberId: Id): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.byId(db, memberId);
    }

    memberByProjectAndUserId(
        ctx: EsContext,
        projectId: Id,
        userId: Id
    ): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.byProjectAndUserId(db, projectId, userId);
    }

    membersByProjectId(ctx: EsContext, projId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.byProjectId(db, projId);
    }

    membersByUserId(ctx: EsContext, userId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.byUserId(db, userId);
    }

    memberRoles(ctx: EsContext, memberId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.rolesById(db, memberId);
    }

    async updateMemberRoles(ctx: EsContext, memberId: Id, roles: string[]): Promise<ProjectMember> {
        const {
            db,
            runtime: { dao },
        } = ctx;
        const mem = await dao.projectMember.byId(db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.update');
        return dao.projectMember.updateRolesById(db, memberId, roles);
    }

    async deleteMember(ctx: EsContext, memberId: Id): Promise<ProjectMember> {
        const {
            db,
            runtime: { dao },
        } = ctx;
        const mem = await dao.projectMember.byId(db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.delete');
        return dao.projectMember.deleteById(db, memberId);
    }
}
