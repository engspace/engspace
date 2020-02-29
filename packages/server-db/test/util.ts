import { expect } from 'chai';

import { identJsToSql } from '../src/util';

describe('Util', () => {
    it('should convert Js identifier to SQL identifer', () => {
        expect(identJsToSql('fullName')).to.equal('full_name');
        expect(identJsToSql('weirDField')).to.equal('weir_d_field');
    });
});
