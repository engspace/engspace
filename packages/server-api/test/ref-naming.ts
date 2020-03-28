import { expect } from 'chai';
import { PartBaseRefNaming, PartRefNaming } from '../src/ref-naming';

describe('Ref naming', function() {
    describe('PartBaseRefNaming', function() {
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
    describe('PartRefNaming', function() {
        describe('Ctor', function() {
            it('should throw if version without format', function() {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${part_base_ref}${part_version}');
                }
                expect(bad).to.throw();
            });
            it('should throw if missing var', function() {
                function bad(): PartRefNaming {
                    return new PartRefNaming('${part_version:AA}');
                }
                expect(bad).to.throw();
            });
        });

        describe('getRef', function() {
            it('parses input string with vars', function() {
                const rn = new PartRefNaming('${part_base_ref}${part_version:AA}');
                expect(
                    rn.getRef(
                        {
                            baseRef: 'P001',
                        },
                        'AB'
                    )
                ).to.contain('P001AB');
            });
            it('parses input string with vars and literal', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                expect(
                    rn.getRef(
                        {
                            baseRef: 'P001',
                        },
                        'AB'
                    )
                ).to.contain('P001.AB');
            });
            it('should throw if getting ref with not matching format', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                function bad(): string {
                    return rn.getRef(
                        {
                            baseRef: 'P001',
                        },
                        '04'
                    );
                }
                expect(bad).to.throw();
            });
        });

        describe('getNext', async function() {
            it('should get next version with vars', function() {
                const rn = new PartRefNaming('${part_base_ref}${part_version:AA}');
                expect(
                    rn.getNext(
                        {
                            baseRef: 'P001',
                        },
                        'AB'
                    )
                ).to.contain('P001AC');
            });
            it('should get next version with vars and literals', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                expect(
                    rn.getNext(
                        {
                            baseRef: 'P001',
                        },
                        'AB'
                    )
                ).to.contain('P001.AC');
            });
        });

        describe('extractVersion', function() {
            it('should extract version of part number', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                expect(rn.extractVersion({ baseRef: 'P001' }, 'P001.AB')).to.eql('AB');
            });
            it('should extract version in middle of part number', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}yop');
                expect(rn.extractVersion({ baseRef: 'P001' }, 'P001.AByop')).to.eql('AB');
            });
            it('should throw if wrong part base', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                function bad(): string {
                    return rn.extractVersion({ baseRef: 'P01' }, 'P001.AB');
                }
                expect(bad).to.throw;
            });
            it('should throw if missing literal', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                function bad(): string {
                    return rn.extractVersion({ baseRef: 'P001' }, 'P001AB');
                }
                expect(bad).to.throw;
            });
            it('should throw if unexpected literal', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                function bad(): string {
                    return rn.extractVersion({ baseRef: 'P001' }, 'P001-AB');
                }
                expect(bad).to.throw;
            });
            it('should throw if unexpected literal after version', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                function bad(): string {
                    return rn.extractVersion({ baseRef: 'P001' }, 'P001.AB-');
                }
                expect(bad).to.throw;
            });
            it('should throw if version wrong format', function() {
                const rn = new PartRefNaming('${part_base_ref}.${part_version:AA}');
                function bad(): string {
                    return rn.extractVersion({ baseRef: 'P001' }, 'P001.02');
                }
                expect(bad).to.throw;
            });
        });
    });
});
