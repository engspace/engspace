import chai from 'chai';
import { getRolePerms, Role } from '../src';

const { expect } = chai;

describe('Permissions', () => {
    it('should fetch user permissions', () => {
        const perms = getRolePerms(Role.User);
        expect(perms).to.include('project.read');
        expect(perms).to.not.include('project.create');
        expect(perms).to.not.include('user.create');
    });
    it('should fetch manager permissions', () => {
        const perms = getRolePerms(Role.Manager);
        expect(perms).to.include('project.read');
        expect(perms).to.include('project.create');
        expect(perms).to.not.include('user.create');
    });
    it('should fetch admin permissions', () => {
        const perms = getRolePerms(Role.Admin);
        expect(perms).to.include('project.read');
        expect(perms).to.include('project.create');
        expect(perms).to.include('user.create');
    });
});
