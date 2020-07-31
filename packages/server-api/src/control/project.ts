import { ProjectInput, Project, Id, ProjectMemberInput, ProjectMember } from '@engspace/core';
import { assertUserPerm, assertUserOrProjectPerm } from './helpers';
import { ApiContext, Pagination } from '.';

export class ProjectControl {
    create(ctx: ApiContext, project: ProjectInput): Promise<Project> {
        assertUserPerm(ctx, 'project.create');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.create(db, project);
    }

    byId(ctx: ApiContext, id: Id): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.byId(db, id);
    }

    byCode(ctx: ApiContext, code: string): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.byCode(db, code);
    }

    search(
        ctx: ApiContext,
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

    async update(ctx: ApiContext, id: Id, input: ProjectInput): Promise<Project> {
        await assertUserOrProjectPerm(ctx, id, 'project.update');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.project.updateById(db, id, input);
    }

    async addMember(ctx: ApiContext, input: ProjectMemberInput): Promise<ProjectMember> {
        await assertUserOrProjectPerm(ctx, input.projectId, 'member.create');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.create(db, input);
    }

    async memberById(ctx: ApiContext, memberId: Id): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.byId(db, memberId);
    }

    memberByProjectAndUserId(
        ctx: ApiContext,
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

    membersByProjectId(ctx: ApiContext, projId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.byProjectId(db, projId);
    }

    membersByUserId(ctx: ApiContext, userId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.byUserId(db, userId);
    }

    memberRoles(ctx: ApiContext, memberId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'member.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.projectMember.rolesById(db, memberId);
    }

    async updateMemberRoles(
        ctx: ApiContext,
        memberId: Id,
        roles: string[]
    ): Promise<ProjectMember> {
        const {
            db,
            runtime: { dao },
        } = ctx;
        const mem = await dao.projectMember.byId(db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.update');
        return dao.projectMember.updateRolesById(db, memberId, roles);
    }

    async deleteMember(ctx: ApiContext, memberId: Id): Promise<ProjectMember> {
        const {
            db,
            runtime: { dao },
        } = ctx;
        const mem = await dao.projectMember.byId(db, memberId);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.delete');
        return dao.projectMember.deleteById(db, memberId);
    }
}
