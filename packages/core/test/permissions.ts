import { expect } from 'chai';
import { buildDefaultAppRolePolicies } from '../src';

const policies = buildDefaultAppRolePolicies();

describe('User Roles', () => {
    it('should give all roles', () => {
        const roles = policies.user.allRoles();
        expect(roles).to.include('user');
        expect(roles).to.include('manager');
        expect(roles).to.include('admin');
    });
});

describe('User Permissions', () => {
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

describe('Project Roles', () => {
    it('should give all roles', () => {
        const roles = policies.project.allRoles();
        expect(roles).to.include('designer');
        expect(roles).to.include('leader');
    });
});
