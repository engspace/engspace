import { expect } from 'chai';
import { CProject, CUser } from '../src';

describe('Constructors', function() {
    describe('User', () => {
        it('should allow default value', () => {
            const user = new CUser();
            expect(user).to.deep.include({
                name: '',
                email: '',
                fullName: '',
                roles: [],
            });
        });
        it('should allow partial value', () => {
            const user = new CUser({ name: 'username' });
            expect(user).to.deep.include({
                name: 'username',
                email: '',
                fullName: '',
                roles: [],
            });
        });
        it('should allow full value', () => {
            const user = new CUser({
                id: 'someuuid',
                name: 'username',
                email: 'test@engspace.test',
                fullName: 'Full Name',
                roles: ['role1', 'role2'],
            });
            expect(user).to.deep.include({
                id: 'someuuid',
                name: 'username',
                email: 'test@engspace.test',
                fullName: 'Full Name',
                roles: ['role1', 'role2'],
            });
        });
    });

    describe('Project', () => {
        it('should allow default value', () => {
            const proj = new CProject();
            expect(proj).to.deep.include({
                name: '',
                code: '',
                description: '',
            });
        });
        it('should allow partial value', () => {
            const proj = new CProject({ code: 'projectcode' });
            expect(proj).to.deep.include({
                name: '',
                code: 'projectcode',
                description: '',
            });
        });
        it('should allow full value', () => {
            const proj = new CProject({
                id: 'someuuid',
                name: 'projectname',
                code: 'projectcode',
                description: 'projectdescription',
            });
            expect(proj).to.deep.include({
                id: 'someuuid',
                name: 'projectname',
                code: 'projectcode',
                description: 'projectdescription',
            });
        });
    });
});
