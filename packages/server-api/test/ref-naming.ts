import { expect } from 'chai';
import { PartBaseRefNaming } from '../src/ref-naming';

describe('Ref naming', function() {
    describe('PartBase', function() {
        it('parses input string with vars', function() {
            const rn = new PartBaseRefNaming('${fam_code}${fam_count:5}');
            expect(
                rn.getBaseRef({
                    id: '',
                    code: 'FAM',
                    name: '',
                    counter: 452,
                })
            ).to.equal('FAM00452');
        });
        it('parses input string with vars and literals', function() {
            const rn = new PartBaseRefNaming('${fam_code}.${fam_count:5}');
            expect(
                rn.getBaseRef({
                    id: '',
                    code: 'FAM',
                    name: '',
                    counter: 452,
                })
            ).to.equal('FAM.00452');
        });
        it('throws in case of missing arg', function() {
            function bad(): PartBaseRefNaming {
                return new PartBaseRefNaming('${fam_count}');
            }
            expect(bad).to.throw('argument');
        });
        it('throws in case of ill-formed arg', function() {
            function bad(): PartBaseRefNaming {
                return new PartBaseRefNaming('${fam_count:not_a_number}');
            }
            expect(bad).to.throw('not_a_number');
        });
        it('throws if width is negative', function() {
            function bad(): PartBaseRefNaming {
                return new PartBaseRefNaming('${fam_count:-4}');
            }
            expect(bad).to.throw('positive');
        });
        it('throws in case of unnecessary arg', function() {
            function bad(): PartBaseRefNaming {
                return new PartBaseRefNaming('${fam_code:5}');
            }
            expect(bad).to.throw('argument');
        });
        it('throws in case of unallowed var', function() {
            function bad(): PartBaseRefNaming {
                return new PartBaseRefNaming('${not_a_var}');
            }
            expect(bad).to.throw('not_a_var');
        });
        it('throws if reached the maximum number of refs', function() {
            const rn = new PartBaseRefNaming('${fam_code}${fam_count:5}');
            function bad(): string {
                return rn.getBaseRef({
                    id: '',
                    code: 'FAM',
                    name: 'this_family',
                    counter: 100000,
                });
            }
            expect(bad).to.throw('"this_family" has reached the maximum number of references.');
        });
    });
});
