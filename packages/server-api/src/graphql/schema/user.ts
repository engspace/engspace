import gql from 'graphql-tag';
import { Id, ProjectMember, User, UserInput, HasId } from '@engspace/core';
import { EsGqlContext } from '../context';

export default {
    typeDefs: gql`
        input UserInput {
            name: String!
            email: String!
            fullName: String
            roles: [String!]
        }
        type User {
            id: ID!
            name: String!
            email: String!
            fullName: String
            roles: [String!]!
            membership: [ProjectMember!]!
        }
        type UserSearch {
            count: Int!
            users: [User!]!
        }

        extend type Query {
            user(id: ID!): User
            userByName(name: String): User
            userByEmail(email: String): User
            userSearch(search: String, offset: Int = 0, limit: Int = 1000): UserSearch!
        }

        extend type Mutation {
            userCreate(input: UserInput!): User!
            userUpdate(id: ID!, input: UserInput!): User!
        }
    `,

    resolvers: {
        User: {
            async roles({ id, roles }: User, args: unknown, ctx: EsGqlContext): Promise<string[]> {
                if (roles) return roles;
                return ctx.runtime.control.user.rolesById(ctx, id);
            },
            membership({ id }: User, args: unknown, ctx: EsGqlContext): Promise<ProjectMember[]> {
                return ctx.runtime.control.project.membersByUserId(ctx, id);
            },
        },
        Query: {
            user(parent: unknown, { id }: HasId, ctx: EsGqlContext): Promise<User> {
                return ctx.loaders.user.load(id);
            },
            userByName(
                parent: unknown,
                { name }: { name: string },
                ctx: EsGqlContext
            ): Promise<User> {
                return ctx.runtime.control.user.byName(ctx, name);
            },
            userByEmail(
                parent: unknown,
                { email }: { email: string },
                ctx: EsGqlContext
            ): Promise<User> {
                return ctx.runtime.control.user.byEmail(ctx, email);
            },
            userSearch(
                parent: unknown,
                args: { search: string; offset: number; limit: number },
                ctx: EsGqlContext
            ): Promise<{ count: number; users: User[] }> {
                const { search, offset, limit } = args;
                return ctx.runtime.control.user.search(ctx, search, { offset, limit });
            },
        },
        Mutation: {
            userCreate(
                parent: unknown,
                { input }: { input: UserInput },
                ctx: EsGqlContext
            ): Promise<User> {
                return ctx.runtime.control.user.create(ctx, input);
            },
            userUpdate(
                parent: unknown,
                { id, input }: { id: Id; input: UserInput },
                ctx: EsGqlContext
            ): Promise<User> {
                return ctx.runtime.control.user.update(ctx, id, input);
            },
        },
    },
};
