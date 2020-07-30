import gql from 'graphql-tag';
import {
    Id,
    Project,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    User,
    HasId,
} from '@engspace/core';
import { GqlContext } from '../context';

export default {
    typeDefs: gql`
        input ProjectInput {
            name: String!
            code: String!
            description: String
        }
        type Project {
            id: ID!
            name: String!
            code: String!
            description: String
            members: [ProjectMember!]!
        }
        type ProjectSearch {
            count: Int!
            projects: [Project!]!
        }

        input ProjectMemberInput {
            projectId: ID!
            userId: ID!
            roles: [String!]
        }
        type ProjectMember {
            id: ID!
            project: Project!
            user: User!
            roles: [String!]!
        }

        extend type Query {
            project(id: ID!): Project
            projectByCode(code: String!): Project
            projectSearch(search: String, offset: Int = 0, limit: Int = 1000): ProjectSearch!
            projectMember(memberId: ID!): ProjectMember
            projectMemberByProjectAndUserId(projectId: ID!, userId: ID!): ProjectMember
        }

        extend type Mutation {
            projectCreate(input: ProjectInput!): Project!
            projectUpdate(id: ID!, input: ProjectInput!): Project!
            projectAddMember(input: ProjectMemberInput!): ProjectMember!
            projectUpdateMemberRoles(memberId: ID!, roles: [String!]): ProjectMember!
            projectDeleteMember(memberId: ID!): ProjectMember!
        }
    `,

    resolvers: {
        Project: {
            members({ id }: Project, args: unknown, ctx: GqlContext): Promise<ProjectMember[]> {
                return ctx.runtime.control.project.membersByProjectId(ctx, id);
            },
        },

        ProjectMember: {
            project({ project }: ProjectMember, args: unknown, ctx: GqlContext): Promise<Project> {
                return ctx.runtime.control.project.byId(ctx, project.id);
            },
            user({ user }: ProjectMember, args: unknown, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(user.id);
            },
            roles({ id }: ProjectMember, args: unknown, ctx: GqlContext): Promise<string[]> {
                return ctx.runtime.control.project.memberRoles(ctx, id);
            },
        },
        Query: {
            project(parent: unknown, { id }: HasId, ctx: GqlContext): Promise<Project> {
                return ctx.runtime.control.project.byId(ctx, id);
            },
            projectByCode(
                parent: unknown,
                { code }: { code: string },
                ctx: GqlContext
            ): Promise<Project> {
                return ctx.runtime.control.project.byCode(ctx, code);
            },
            projectSearch(
                parent: unknown,
                args: { search: string; offset: number; limit: number },
                ctx: GqlContext
            ): Promise<{ count: number; projects: Project[] }> {
                const { search, offset, limit } = args;
                return ctx.runtime.control.project.search(ctx, search, { offset, limit });
            },

            projectMember(
                parent: unknown,
                { memberId }: { memberId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember | null> {
                return ctx.runtime.control.project.memberById(ctx, memberId);
            },

            projectMemberByProjectAndUserId(
                parent: unknown,
                { projectId, userId }: { projectId: Id; userId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember | null> {
                return ctx.runtime.control.project.memberByProjectAndUserId(ctx, projectId, userId);
            },
        },
        Mutation: {
            projectCreate(
                parent: unknown,
                { input }: { input: ProjectInput },
                ctx: GqlContext
            ): Promise<Project> {
                return ctx.runtime.control.project.create(ctx, input);
            },
            projectUpdate(
                parent: unknown,
                { id, input }: { id: Id; input: ProjectInput },
                ctx: GqlContext
            ): Promise<Project> {
                return ctx.runtime.control.project.update(ctx, id, input);
            },
            projectAddMember(
                parent: unknown,
                { input }: { input: ProjectMemberInput },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return ctx.runtime.control.project.addMember(ctx, input);
            },
            projectUpdateMemberRoles(
                parent: unknown,
                { memberId, roles }: { memberId: Id; roles: string[] },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return ctx.runtime.control.project.updateMemberRoles(ctx, memberId, roles);
            },
            projectDeleteMember(
                parent: unknown,
                { memberId }: { memberId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return ctx.runtime.control.project.deleteMember(ctx, memberId);
            },
        },
    },
};
