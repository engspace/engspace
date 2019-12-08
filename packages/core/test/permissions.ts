import chai from 'chai';
import { getRolePerms, Role } from '../src';

const { expect } = chai;

describe('Permissions', () => {
    it('should fetch user permissions', () => {
        const perms = getRolePerms(Role.User);
        expect(perms).to.include('project.get');
        expect(perms).to.not.include('project.post');
        expect(perms).to.not.include('user.post');
    });
    it('should fetch manager permissions', () => {
        const perms = getRolePerms(Role.Manager);
        expect(perms).to.include('project.get');
        expect(perms).to.include('project.post');
        expect(perms).to.not.include('user.post');
    });
    it('should fetch admin permissions', () => {
        const perms = getRolePerms(Role.Admin);
        expect(perms).to.include('project.get');
        expect(perms).to.include('project.post');
        expect(perms).to.include('user.post');
    });
});
