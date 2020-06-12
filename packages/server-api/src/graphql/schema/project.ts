import { IResolvers } from 'apollo-server-koa';
import gql from 'graphql-tag';
import { Id, Project, ProjectInput, ProjectMember, ProjectMemberInput, User } from '@engspace/core';
import { ControllerSet } from '../../control';
import { GqlContext } from '../context';

export const typeDefs = gql`
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
`;

export function buildResolvers(control: ControllerSet): IResolvers {
    return {
        Project: {
            members({ id }: Project, args, ctx: GqlContext): Promise<ProjectMember[]> {
                return control.project.membersByProjectId(ctx, id);
            },
        },

        ProjectMember: {
            project({ project }: ProjectMember, args, ctx: GqlContext): Promise<Project> {
                return control.project.byId(ctx, project.id);
            },
            user({ user }: ProjectMember, args, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(user.id);
            },
            roles({ id }: ProjectMember, args, ctx: GqlContext): Promise<string[]> {
                return control.project.memberRoles(ctx, id);
            },
        },
        Query: {
            project(parent, { id }, ctx: GqlContext): Promise<Project> {
                return control.project.byId(ctx, id);
            },
            projectByCode(parent, { code }, ctx: GqlContext): Promise<Project> {
                return control.project.byCode(ctx, code);
            },
            projectSearch(
                parent,
                args,
                ctx: GqlContext
            ): Promise<{ count: number; projects: Project[] }> {
                const { search, offset, limit } = args;
                return control.project.search(ctx, search, { offset, limit });
            },

            projectMember(
                parent,
                { memberId }: { memberId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember | null> {
                return control.project.memberById(ctx, memberId);
            },

            projectMemberByProjectAndUserId(
                parent,
                { projectId, userId }: { projectId: Id; userId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember | null> {
                return control.project.memberByProjectAndUserId(ctx, projectId, userId);
            },
        },
        Mutation: {
            projectCreate(
                parent,
                { input }: { input: ProjectInput },
                ctx: GqlContext
            ): Promise<Project> {
                return control.project.create(ctx, input);
            },
            projectUpdate(
                parent,
                { id, input }: { id: Id; input: ProjectInput },
                ctx: GqlContext
            ): Promise<Project> {
                return control.project.update(ctx, id, input);
            },
            projectAddMember(
                parent,
                { input }: { input: ProjectMemberInput },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return control.project.addMember(ctx, input);
            },
            projectUpdateMemberRoles(
                parent,
                { memberId, roles }: { memberId: Id; roles: string[] },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return control.project.updateMemberRoles(ctx, memberId, roles);
            },
            projectDeleteMember(
                parent,
                { memberId }: { memberId: Id },
                ctx: GqlContext
            ): Promise<ProjectMember> {
                return control.project.deleteMember(ctx, memberId);
            },
        },
    };
}
