/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const gulp = require('gulp');
const del = require('del');

function copySql() {
    return gulp.src('src/sql/*.sql').pipe(gulp.dest('dist/sql'));
}

function cleanSql() {
    return del(['src/schema/*.json']);
}

module.exports = {
    copySql,
    cleanSql,
};
