import chai from 'chai';

import { identJsToSql } from '../src/util';

const { expect } = chai;

describe('Util', () => {
    it('should convert Js identifier to SQL identifer', () => {
        expect(identJsToSql('fullName')).to.equal('full_name');
    });
});
