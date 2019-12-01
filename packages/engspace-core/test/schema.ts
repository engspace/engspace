import chai from 'chai';
import { Project, User } from '../src';

const { expect } = chai;

describe('User', () => {
    it('should allow default value', () => {
        const user = new User();
        expect(user).to.deep.include({
            name: '',
            email: '',
            fullName: '',
            roles: [],
        });
    });
    it('should allow partial value', () => {
        const user = new User({ name: 'username' });
        expect(user).to.deep.include({
            name: 'username',
            email: '',
            fullName: '',
            roles: [],
        });
    });
    it('should validate value', () => {
        const user = new User({ name: 'username' });
        expect(User.validate(user)).to.be.empty;
    });
    it('should type guard correct value', () => {
        const user = {
            name: 'username',
            email: 'username@test.com',
            fullName: 'User Name',
            roles: [],
        };
        let res = false;
        if (User.check(user)) {
            res = true;
        }
        expect(res).to.be.true;
    });
    it('should type guard incorrect value', () => {
        const user = {
            name: 'username',
            fullName: 'User Name',
            roles: [],
        };
        let res = false;
        if (User.check(user)) {
            res = true;
        }
        expect(res).to.be.false;
    });
});

describe('Project', () => {
    it('should allow default value', () => {
        const proj = new Project();
        expect(proj).to.deep.include({
            name: '',
            code: '',
            description: '',
            members: [],
        });
    });
    it('should allow partial value', () => {
        const proj = new Project({ code: 'projectcode' });
        expect(proj).to.deep.include({
            name: '',
            code: 'projectcode',
            description: '',
            members: [],
        });
    });
});
