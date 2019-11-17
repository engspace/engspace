
import chai from 'chai';
import { Project, User } from '../src';

const { expect } = chai;

describe('User', () => {
    it('should allow default value', () => {
        const user = new User();
        expect(user).to.include({
            name: '',
            email: '',
            fullName: '',
            admin: false,
            manager: false,
        });
    });
    it('should allow partial value', () => {
        const user = new User({ name: 'username' });
        expect(user).to.include({
            name: 'username',
            email: '',
            fullName: '',
            admin: false,
            manager: false,
        });
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
    // it('should allow deep copy', () => {
    //     const members = [{
    //         user: new User({ name: 'designer' }),
    //         designer: true,
    //         leader: false,
    //     },
    //     {
    //         user: new User({ name: 'leader' }),
    //         designer: false,
    //         leader: true,
    //     }];
    //     const proj1 = new Project({
    //         name: 'projname',
    //         code: 'code',
    //         members,
    //     });
    //     const proj2 = new Project(proj1);
    //     proj1.name = 'new project';
    //     (proj1.members[0].user as IUser).name = 'new designer';
    //     (proj1.members[1].user as IUser).name = 'new leader';

    //     expect(proj1).to.deep.include({
    //         name: 'new project',
    //         code: 'code',
    //         members: [{
    //             user: {
    //                 name: 'new designer', email: '', fullName: '', admin: false, manager: false,
    //             },
    //             designer: true,
    //             leader: false,
    //         }, {
    //             user: {
    //                 name: 'new leader', email: '', fullName: '', admin: false, manager: false,
    //             },
    //             designer: false,
    //             leader: true,
    //         }],
    //     });
    //     expect(proj2).to.deep.include({
    //         name: 'projname',
    //         code: 'code',
    //         members: [{
    //             user: {
    //                 name: 'designer', email: '', fullName: '', admin: false, manager: false,
    //             },
    //             designer: true,
    //             leader: false,
    //         }, {
    //             user: {
    //                 name: 'leader', email: '', fullName: '', admin: false, manager: false,
    //             },
    //             designer: false,
    //             leader: true,
    //         }],
    //     });
    // });
});
