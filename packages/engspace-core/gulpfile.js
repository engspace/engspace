const path = require('path');
const stream = require('stream');
const gulp = require('gulp');
const Vinyl = require('vinyl');
const through = require('through2');
const del = require('del');
const tjs = require('typescript-json-schema');
const localTsJson = require('./tsconfig.build.json');
const rootTsJson = require('../../tsconfig.build.json');

const schemaTypes = ['IUser', 'IProject'];

function getCommonBasePath(a, b) {
    const aSplit = a.split(/\\|\//); // Split on '/' or '\'.
    const bSplit = b.split(/\\|\//);
    let commonLength = 0;
    for (let i = 0; i < aSplit.length && i < bSplit.length; i += 1) {
        if (aSplit[i] !== bSplit[i]) break;

        commonLength += aSplit[i].length + 1;
    }

    return a.substr(0, commonLength);
}

function getCommonBasePathOfArray(paths) {
    if (paths.length === 0) return '';
    return paths.reduce(getCommonBasePath);
}

function typeStream() {
    const rs = new stream.Readable({
        objectMode: true,
        read: (_size) => {
            schemaTypes.forEach(type => rs.push(type));
            rs.push(null);
        },
    });
    return rs;
}

function schemaStream() {
    const files = ['./src/schema.ts'];
    const prog = tjs.getProgramFromFiles(
        files,
        {
            ...rootTsJson.compilerOptions,
            ...localTsJson.compilerOptions,
        },
    );
    const generator = tjs.buildGenerator(prog, { required: true });
    const base = getCommonBasePathOfArray(files.map(f => path.dirname(f)));

    return through.obj(
        (type, _enc, cb) => {
            const schema = generator.getSchemaForSymbol(type);
            cb(null, { type, base, schema });
        },
    );
}

function jsonStream() {
    return through.obj(
        ({ type, base, schema }, _enc, cb) => {
            cb(null, { type, base, json: JSON.stringify(schema, null, '  ') });
        },
    );
}

function vinylStream() {
    return through.obj(
        ({ type, base, json }, _enc, cb) => {
            cb(null, new Vinyl({
                cwd: process.cwd(),
                base,
                path: path.join(base, `${type}.json`),
                contents: Buffer.from(json),
            }));
        },
    );
}

function schema() {
    return typeStream()
        .pipe(schemaStream())
        .pipe(jsonStream())
        .pipe(vinylStream())
        .pipe(gulp.dest('src/schema'));
}

function cleanSchema() {
    return del([
        'src/schema/*.json',
    ]);
}

module.exports = {
    schema, cleanSchema,
};

// function debugStream({ title }) {
//     return through.obj((obj, _enc, cb) => {
//         if (typeof obj === 'object') {
//             console.log(title);
//             console.log(obj);
//         } else {
//             console.log(`${title}: ${obj}`);
//         }
//         cb(null, obj);
//     });
// }
