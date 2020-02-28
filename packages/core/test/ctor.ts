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
        // it('should validate value', () => {
        //     const user = new User({ name: 'username' });
        //     expect(User.validate(user)).to.be.empty;
        // });
        // it('should type guard correct value', () => {
        //     const user = {
        //         name: 'username',
        //         email: 'username@test.com',
        //         fullName: 'User Name',
        //         roles: [],
        //     };
        //     let res = false;
        //     if (User.check(user)) {
        //         res = true;
        //     }
        //     expect(res).to.be.true;
        // });
        // it('should type guard incorrect value', () => {
        //     const user = {
        //         name: 'username',
        //         fullName: 'User Name',
        //         roles: [],
        //     };
        //     let res = false;
        //     if (User.check(user)) {
        //         res = true;
        //     }
        //     expect(res).to.be.false;
        // });
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
