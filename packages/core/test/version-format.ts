import { expect } from 'chai';
import {
    BadVersionFormatError,
    MismatchVersionFormatError,
    VersionFormat,
} from '../src/version-format';

describe('VersionFormat', function() {
    it('should format version with numbers', function() {
        const vf = new VersionFormat('001');
        expect(vf.matches('123')).to.be.true;
        expect(vf.matches('ABC')).to.be.false;
        expect(vf.matches('abd')).to.be.false;
        expect(vf.getNext('013')).to.equal('014');
        expect(vf.getNext('299')).to.equal('300');
    });
    it('should format version with upper letters', function() {
        const vf = new VersionFormat('AA');
        expect(vf.matches('BG')).to.be.true;
        expect(vf.matches('58')).to.be.false;
        expect(vf.matches('bg')).to.be.false;
        expect(vf.getNext('AB')).to.equal('AC');
        expect(vf.getNext('CZ')).to.equal('DA');
    });
    it('should format version with lower letters', function() {
        const vf = new VersionFormat('aa');
        expect(vf.matches('bg')).to.be.true;
        expect(vf.matches('BG')).to.be.false;
        expect(vf.matches('58')).to.be.false;
        expect(vf.getNext('ab')).to.equal('ac');
        expect(vf.getNext('cz')).to.equal('da');
    });
    it('should format version with hybrid format', function() {
        const vf = new VersionFormat('AA01');
        expect(vf.matches('AZ03')).to.be.true;
        expect(vf.matches('BG')).to.be.false;
        expect(vf.matches('58')).to.be.false;
        expect(vf.matches('EAEA')).to.be.false;
        expect(vf.getNext('AZ03')).to.equal('AZ04');
        expect(vf.getNext('AZ09')).to.equal('AZ10');
        expect(vf.getNext('AZ99')).to.equal('BA00');
    });
    it('should throw if building with empty spec', function() {
        function bad(): VersionFormat {
            return new VersionFormat('');
        }
        expect(bad).to.throw(BadVersionFormatError);
    });
    it('should throw if building with bad spec', function() {
        function bad(): VersionFormat {
            return new VersionFormat('not_a_spec');
        }
        expect(bad).to.throw(BadVersionFormatError);
    });
    it('should throw if getting next from not matching spec', function() {
        const vf = new VersionFormat('AA');
        function bad(): string {
            return vf.getNext('01');
        }
        expect(bad).to.throw(MismatchVersionFormatError);
    });
    it('should throw if getting next from bad spec', function() {
        const vf = new VersionFormat('AA');
        function bad(): string {
            return vf.getNext('__');
        }
        expect(bad).to.throw(MismatchVersionFormatError);
    });
});
