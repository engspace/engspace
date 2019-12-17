import { Role } from '@engspace/core';
import { createLocalVue, mount } from '@vue/test-utils';
import chai from 'chai';
import Vuetify from 'vuetify';
import UserComponent from '../src/components/UserComponent';

const { expect } = chai;

const localVue = createLocalVue();
localVue.use(Vuetify);

function factory(options = {}) {
    return mount(UserComponent, {
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
        expect(wrapper.find('.v-card__title').html()).to.contain('A User');
    });
    it('should display role string in subtitle', async () => {
        expect(wrapper.find('.v-card__subtitle').html()).to.contain('Admin, Manager');
    });
    it('should display user name', async () => {
        const wa = wrapper.findAll('.v-card__text .v-text-field__slot input');
        expect(wa.length).to.equal(2);
        expect(wa.at(0).element.value).to.equal('auser');
    });
    it('should display email', async () => {
        const wa = wrapper.findAll('.v-card__text .v-text-field__slot input');
        expect(wa.length).to.equal(2);
        expect(wa.at(1).element.value).to.equal('a.user@engspace.test');
    });
});
