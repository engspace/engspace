import {
    Id,
    Project,
    ProjectMember,
    ProjectRole,
    Role,
    User,
    UserInput,
    ProjectInput,
    ProjectMemberInput,
} from '@engspace/core';
import { GqlContext } from '.';
import { ProjectControl, UserControl, MemberControl } from './controllers';

export const resolvers = {
    Query: {
        user(parent, { id }, ctx: GqlContext): Promise<User> {
            return ctx.loaders.user.load(id);
        },
        userByName(parent, { name }, ctx: GqlContext): Promise<User> {
            return UserControl.byName(ctx, name);
        },
        userByEmail(parent, { email }, ctx: GqlContext): Promise<User> {
            return UserControl.byEmail(ctx, email);
        },
        userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: User[] }> {
            const { search, offset, limit } = args;
            return UserControl.search(ctx, search, { offset, limit });
        },
        project(parent, { id }, ctx: GqlContext): Promise<Project> {
            return ctx.loaders.project.load(id);
        },
        projectByCode(parent, { code }, ctx: GqlContext): Promise<Project> {
            return ProjectControl.byCode(ctx, code);
        },
        projectSearch(
            parent,
            args,
            ctx: GqlContext
        ): Promise<{ count: number; projects: Project[] }> {
            const { search, offset, limit } = args;
            return ProjectControl.search(ctx, search, { offset, limit });
        },
    },
    Mutation: {
        async createUser(parent, { user }: { user: UserInput }, ctx: GqlContext): Promise<User> {
            return UserControl.create(ctx, user);
        },
        async updateUser(
            parent,
            { id, user }: { id: Id; user: UserInput },
            ctx: GqlContext
        ): Promise<User> {
            return UserControl.update(ctx, id, user);
        },

        async createProject(
            parent,
            { project }: { project: ProjectInput },
            ctx: GqlContext
        ): Promise<Project> {
            return ProjectControl.create(ctx, project);
        },
        async updateProject(
            parent,
            { id, project }: { id: Id; project: ProjectInput },
            ctx: GqlContext
        ): Promise<Project> {
            return ProjectControl.update(ctx, id, project);
        },

        async createProjectMember(
            parent,
            { projectMember }: { projectMember: ProjectMemberInput },
            ctx: GqlContext
        ): Promise<ProjectMember> {
            return MemberControl.create(ctx, projectMember);
        },
        async updateProjectMemberRoles(
            parent,
            { id, roles }: { id: Id; roles: string[] },
            ctx: GqlContext
        ): Promise<ProjectMember> {
            return MemberControl.updateRolesById(ctx, id, roles);
        },
        async deleteProjectMember(parent, { id }: { id: Id }, ctx: GqlContext): Promise<boolean> {
            console.log('within resolver');
            await MemberControl.deleteById(ctx, id);
            return true;
        },
    },

    User: {
        async roles({ id, roles }: User, args, ctx: GqlContext): Promise<Role[]> {
            if (roles) return roles;
            return ctx.loaders.roles.load(id);
        },
        membership({ id }: User, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return ctx.loaders.membersByUser.load(id);
        },
    },

    Project: {
        members({ id }: Project, args, ctx: GqlContext): Promise<ProjectMember[]> {
            return ctx.loaders.membersByProj.load(id);
        },
    },

    ProjectMember: {
        project({ project }: ProjectMember, args, ctx: GqlContext): Promise<Project> {
            if (project['code']) {
                return Promise.resolve(project as Project);
            } else {
                return ctx.loaders.project.load(project.id);
            }
        },
        user({ user }: ProjectMember, args, ctx: GqlContext): Promise<User> {
            if (user['name']) {
                return Promise.resolve(user as User);
            } else {
                return ctx.loaders.user.load(user.id);
            }
        },
        roles({ id }: ProjectMember, args, ctx: GqlContext): Promise<ProjectRole[]> {
            return ctx.loaders.memberRoles.load(id);
        },
    },
};
