import { expect } from 'chai';
import {
    BadRefNamingFormatError,
    NamingCounterLimitError,
    PartRefNaming,
    PartRefFormatMismatchError,
    ChangeRequestNaming,
} from '../src/naming';
import { BadVersionFormatError } from '../src/version-format';

describe('Naming', function () {
    describe('#PartRefNaming', function () {
        describe('#ctor', function () {
            it('should throw if missing ${fam_code}', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_count:5}.${part_version:AA}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, 'fam_code');
            });
            it('should throw if missing ${fam_count}', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}.${part_version:AA}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, 'fam_count');
            });
            it('should throw if missing ${fam_count} width', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}${fam_count}${part_version:AA}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, /fam_count.+width/);
            });
            it('should throw if wrong ${fam_count} width', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}${fam_count:gerard}${part_version:AA}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, /fam_count.+width/);
            });
            it('should throw if negative ${fam_count} width', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}${fam_count:-4}${part_version:AA}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, /fam_count.+width/);
            });
            it('should throw if zero ${fam_count} width', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}${fam_count:0}${part_version:AA}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, /fam_count.+width/);
            });
            it('should throw if missing ${part_version}', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}${fam_count:5}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, 'part_version');
            });
            it('should throw if missing ${part_version} format', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}${fam_count:5}${part_version}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, /part_version.+format/);
            });
            it('should throw if ill-formed ${part_version} format', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code}${fam_count:5}${part_version:*?}');
                }
                expect(bad).to.throw(BadVersionFormatError, '*?');
            });
            it('should throw if unknown var', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_cool}${fam_count:5}${part_version:*?}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, 'fam_cool');
            });
            it('should throw if fam_code with arg', function () {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${fam_code:AA}${fam_count:5}${part_version:*?}');
                }
                expect(bad).to.throw(BadRefNamingFormatError, /fam_code.+arg/);
            });
        });

        describe('#extractComps', function () {
            it('should extract #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                expect(rn.extractComps('P.02345.AB')).to.deep.include({
                    familyCode: 'P',
                    familyCount: 2345,
                    partVersion: 'AB',
                });
                expect(rn.extractComps('ASM.02345.AB')).to.deep.include({
                    familyCode: 'ASM',
                    familyCount: 2345,
                    partVersion: 'AB',
                });
            });
            it('should extract #2', function () {
                const rn = new PartRefNaming('${part_version:AA}.${fam_code}.${fam_count:5}');
                expect(rn.extractComps('AB.P.02345')).to.deep.include({
                    familyCode: 'P',
                    familyCount: 2345,
                    partVersion: 'AB',
                });
                expect(rn.extractComps('AB.ASM.02345')).to.deep.include({
                    familyCode: 'ASM',
                    familyCount: 2345,
                    partVersion: 'AB',
                });
            });
            it('should extract #3', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                expect(rn.extractComps('02345.AB.P')).to.deep.include({
                    familyCode: 'P',
                    familyCount: 2345,
                    partVersion: 'AB',
                });
                expect(rn.extractComps('02345.AB.ASM')).to.deep.include({
                    familyCode: 'ASM',
                    familyCount: 2345,
                    partVersion: 'AB',
                });
            });

            it('should throw if no fam_code', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('.01234.AB');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if no fam_count #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('P..AB');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if no fam_count #2', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                function bad(): any {
                    return rn.extractComps('.P.AB');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if fam_count format mismatch #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('P.01V43.AB');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if fam_count format mismatch #2', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                function bad(): any {
                    return rn.extractComps('01V43.AB.P');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if no part_version #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('P.01234.');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if no part_version #2', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                function bad(): any {
                    return rn.extractComps('01234..P');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if part_version format mismatch #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('P.01234.02');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if part_version format mismatch #2', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                function bad(): any {
                    return rn.extractComps('01234.02.P');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if missing literal #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('P.01234AB');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if missing literal #2', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                function bad(): any {
                    return rn.extractComps('01234AB.P');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if unexpected literal #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('P.01234-.02');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if unexpected literal #2', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                function bad(): any {
                    return rn.extractComps('01234-.AB.P');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if wrong literal #1', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): any {
                    return rn.extractComps('P.01234-AB');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });

            it('should throw if wrong literal #2', function () {
                const rn = new PartRefNaming('${fam_count:5}.${part_version:AA}.${fam_code}');
                function bad(): any {
                    return rn.extractComps('01234-AB.P');
                }
                expect(bad).to.throw(PartRefFormatMismatchError);
            });
        });

        describe('#buildName', function () {
            it('should get a reference', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                expect(
                    rn.buildName({
                        familyCode: 'P',
                        familyCount: 2350,
                        partVersion: 'BC',
                    })
                ).to.equal('P.02350.BC');
            });
            it('should throw if familyCount reached its limit', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): string {
                    return rn.buildName({
                        familyCode: 'P',
                        familyCount: 100000,
                        partVersion: 'BC',
                    });
                }
                expect(bad).to.throw(NamingCounterLimitError, 'P');
            });
            it('should throw if partVersion mismatches', function () {
                const rn = new PartRefNaming('${fam_code}.${fam_count:5}.${part_version:AA}');
                function bad(): string {
                    return rn.buildName({
                        familyCode: 'P',
                        familyCount: 2350,
                        partVersion: '04',
                    });
                }
                expect(bad).to.throw(PartRefFormatMismatchError, '04');
            });
        });
    });

    describe('#ChangeRequestNaming', function () {
        describe('#ctor', function () {
            it('should parse input string', function () {
                function good() {
                    return new ChangeRequestNaming('CR-${counter:4}');
                }
                expect(good).not.to.throw;
            });
            it('should fail if missing ${counter}', function () {
                function bad() {
                    return new ChangeRequestNaming('CR-blabla');
                }
                expect(bad).to.throw;
            });
            it('should fail if missing ${counter:width}', function () {
                function bad() {
                    return new ChangeRequestNaming('CR-${counter}');
                }
                expect(bad).to.throw;
            });
            it('should fail if unexpected ${variable}', function () {
                function bad() {
                    return new ChangeRequestNaming('CR-${variable}');
                }
                expect(bad).to.throw;
            });
        });
        describe('#buildName', function () {
            it('should build a name', function () {
                const naming = new ChangeRequestNaming('CR-${counter:4}');
                expect(naming.buildName({ counter: 345 })).to.equal('CR-0345');
            });
            it('should build a name if counter is one below max', function () {
                const naming = new ChangeRequestNaming('CR-${counter:4}');
                expect(naming.buildName({ counter: 9999 })).to.equal('CR-9999');
            });
            it('should throw if counter has reached max', function () {
                const naming = new ChangeRequestNaming('CR-${counter:4}');
                function bad() {
                    return naming.buildName({ counter: 10000 });
                }
                expect(bad).to.throw(NamingCounterLimitError);
            });
        });
    });
});
