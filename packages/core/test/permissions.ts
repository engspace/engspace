import { expect } from 'chai';
import { buildDefaultAppRolePolicies, buildRolePolicy, UnknownRoleError } from '../src';

describe('Permissions', function () {
    describe('#RolePolicy', function () {
        const policies = buildRolePolicy({
            default: {
                permissions: ['perm0.1', 'perm0.2'],
            },
            role1: {
                permissions: ['perm1.1', 'perm1.2', 'perm1.3'],
            },
            role2: {
                permissions: ['perm2.1', 'perm2.2', 'perm2.3'],
            },
            role3: {
                inherits: 'role1',
                permissions: ['perm3.1', 'perm3.2', 'perm3.3'],
            },
        });
        it('should return all roles', function () {
            const roles = policies.allRoles();
            expect(roles).to.have.members(['role1', 'role2', 'role3']);
        });

        it('should return default perms if no role', function () {
            const perms = policies.permissions([]);
            expect(perms).to.have.members(['perm0.1', 'perm0.2']);
        });

        it('should return simple perms and inherit default', function () {
            const perms = policies.permissions(['role1']);
            expect(perms).to.have.members(['perm0.1', 'perm0.2', 'perm1.1', 'perm1.2', 'perm1.3']);
        });

        it('should return compound perms', function () {
            const perms = policies.permissions(['role1', 'role2']);
            expect(perms).to.have.members([
                'perm0.1',
                'perm0.2',
                'perm1.1',
                'perm1.2',
                'perm1.3',
                'perm2.1',
                'perm2.2',
                'perm2.3',
            ]);
        });

        it('should return inherited perms', function () {
            const perms = policies.permissions(['role3']);
            expect(perms).to.have.members([
                'perm0.1',
                'perm0.2',
                'perm1.1',
                'perm1.2',
                'perm1.3',
                'perm3.1',
                'perm3.2',
                'perm3.3',
            ]);
        });

        it('should return compound and inherited perms', function () {
            const perms = policies.permissions(['role2', 'role3']);
            expect(perms).to.have.members([
                'perm0.1',
                'perm0.2',
                'perm1.1',
                'perm1.2',
                'perm1.3',
                'perm2.1',
                'perm2.2',
                'perm2.3',
                'perm3.1',
                'perm3.2',
                'perm3.3',
            ]);
        });

        it('should not return doubled inherited perms', function () {
            const perms = policies.permissions(['role1', 'role2', 'role3']);
            expect(perms).to.have.members([
                'perm0.1',
                'perm0.2',
                'perm1.1',
                'perm1.2',
                'perm1.3',
                'perm2.1',
                'perm2.2',
                'perm2.3',
                'perm3.1',
                'perm3.2',
                'perm3.3',
            ]);
        });

        it('should not return doubled perms if doubled roles', function () {
            const perms = policies.permissions(['role1', 'role1']);
            expect(perms).to.have.members(['perm0.1', 'perm0.2', 'perm1.1', 'perm1.2', 'perm1.3']);
        });

        it('should throw if unknown role', function () {
            function bad(): string[] {
                return policies.permissions(['unknown']);
            }
            expect(bad).to.throw(UnknownRoleError);
        });

        it('should throw if unknown role in list', function () {
            function bad(): string[] {
                return policies.permissions(['role1', 'unknown']);
            }
            expect(bad).to.throw(UnknownRoleError);
        });

        it ('behaves with undefined default', function() {
            const policy = buildRolePolicy({
                role1: {
                    permissions: ['perm1', 'perm2'],
                },
            });
            expect(policy.permissions(['role1'])).to.have.members(['perm1', 'perm2']);
        });
    });

    describe('Default User Roles', () => {
        const policies = buildDefaultAppRolePolicies();
        it('should give all roles', () => {
            const roles = policies.user.allRoles();
            expect(roles).to.include('user');
            expect(roles).to.include('manager');
            expect(roles).to.include('admin');
        });
    });

    describe('Default User Permissions', () => {
        const policies = buildDefaultAppRolePolicies();
        it('should fetch user permissions', () => {
            const perms = policies.user.permissions(['user']);
            expect(perms).to.include('project.read');
            expect(perms).to.not.include('project.create');
            expect(perms).to.not.include('user.create');
        });
        it('should fetch manager permissions', () => {
            const perms = policies.user.permissions(['manager']);
            expect(perms).to.include('project.read');
            expect(perms).to.include('project.create');
            expect(perms).to.not.include('user.create');
        });
        it('should fetch admin permissions', () => {
            const perms = policies.user.permissions(['admin']);
            expect(perms).to.include('project.read');
            expect(perms).to.include('project.create');
            expect(perms).to.include('user.create');
        });
    });

    describe('Default Project Roles', () => {
        const policies = buildDefaultAppRolePolicies();
        it('should give all roles', () => {
            const roles = policies.project.allRoles();
            expect(roles).to.include('designer');
            expect(roles).to.include('leader');
        });
    });
});
