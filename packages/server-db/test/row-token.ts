import { expect } from 'chai';
import { sql } from 'slonik';
import { buildRowToken, buildTableAliasRowToken } from '../src';

describe('Row token', function () {
    describe('#buildRowToken', function () {
        it('should build from a list of names', function () {
            const res = sql`${buildRowToken(['col1', 'col2'])}`;
            expect(res).to.containSubset({
                sql: '"col1", "col2"',
            });
        });

        it('should build from a list of identifiers', function () {
            const res = sql`${buildRowToken([
                sql.identifier(['t1', 'col1']),
                sql.identifier(['t2', 'col2']),
            ])}`;
            expect(res).to.containSubset({
                sql: '"t1"."col1", "t2"."col2"',
            });
        });

        it('should build from a list of full specs', function () {
            const res = sql`${buildRowToken([
                {
                    name: 'col1',
                    transform: 'timestamp',
                },
                {
                    name: 'col2',
                    tableAlias: 't2',
                    rowAlias: 'c2',
                },
            ])}`;
            expect(res).to.containSubset({
                sql: 'EXTRACT(EPOCH FROM "col1") AS "col1", "t2"."col2" AS "c2"',
            });
        });
    });

    describe('#buildTableAliasRowToken', function () {
        it('should build from a list of names', function () {
            const res = sql`${buildTableAliasRowToken('ta', ['col1', 'col2'])}`;
            expect(res).to.containSubset({
                sql: '"ta"."col1", "ta"."col2"',
            });
        });

        it('should throw if build from a list of identifiers', function () {
            function bad() {
                return sql`${buildTableAliasRowToken('ta', [
                    sql.identifier(['t1', 'col1']),
                    sql.identifier(['t2', 'col2']),
                ])}`;
            }
            expect(bad).to.throw();
        });

        it('should build from a list of full specs', function () {
            const res = sql`${buildTableAliasRowToken('ta', [
                {
                    name: 'col1',
                    transform: 'timestamp',
                },
                {
                    name: 'col2',
                    rowAlias: 'c2',
                },
            ])}`;
            expect(res).to.containSubset({
                sql: 'EXTRACT(EPOCH FROM "ta"."col1") AS "col1", "ta"."col2" AS "c2"',
            });
        });
    });
});
