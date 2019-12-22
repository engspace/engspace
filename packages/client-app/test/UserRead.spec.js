import { Role } from '@engspace/core';
import { createLocalVue, mount } from '@vue/test-utils';
import chai from 'chai';
import Vuetify from 'vuetify';
import UserRead from '../src/components/UserRead';

const { expect } = chai;

const localVue = createLocalVue();
localVue.use(Vuetify);

function factory(options = {}) {
    return mount(UserRead, {
        localVue,
        ...options,
    });
}

describe('User', () => {
    let wrapper;
    beforeEach(async () => {
        wrapper = factory({
            propsData: {
                user: {
                    id: 'a-uuid',
                    name: 'auser',
                    fullName: 'A User',
                    email: 'a.user@engspace.test',
                    roles: [Role.Admin, Role.Manager],
                },
            },
        });
        await wrapper.vm.$nextTick();
    });
    it('should display full name in title', async () => {
        expect(wrapper.find('.v-card__title').text()).to.contain('A User');
    });
    it('should display role string in subtitle', async () => {
        expect(wrapper.find('.v-card__subtitle').text()).to.contain('a-uuid');
    });
    it('should display user name', async () => {
        const wa = wrapper.findAll('.v-card__text .container .row');
        expect(wa.length).to.equal(3);
        expect(
            wa
                .at(0)
                .find('.label')
                .text()
        ).to.contain('Login');
        expect(
            wa
                .at(0)
                .find('.value')
                .text()
        ).to.contain('auser');
    });
    it('should display email', async () => {
        const wa = wrapper.findAll('.v-card__text .container .row');
        expect(wa.length).to.equal(3);
        expect(
            wa
                .at(1)
                .find('.label')
                .text()
        ).to.contain('E-Mail');
        expect(
            wa
                .at(1)
                .find('.value')
                .text()
        ).to.contain('a.user@engspace.test');
    });
    it('should display roles', async () => {
        const wa = wrapper.findAll('.v-card__text .container .row');
        expect(wa.length).to.equal(3);
        expect(
            wa
                .at(2)
                .find('.label')
                .text()
        ).to.contain('Roles');
        expect(
            wa
                .at(2)
                .find('.value')
                .text()
        ).to.contain('Admin, Manager');
    });
});
