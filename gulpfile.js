/**
 * Created by aleksandrnemirov on 04.08.18.
 */

const { basename } = require('path');

const gulp = require('gulp');
const gdebug = require('gulp-debug');
const gconcat = require('gulp-concat');
const bemSrc = require('gulp-bem-src');
const through2 = require('through2');

const html2bemjson = require('html2bemjson');
const bemjson2decl = require('@bem/sdk.bemjson-to-decl');
const Bundle = require('@bem/sdk.bundle');

const config = {
    levels: [
        'blocks'
    ],
    techMap: {
        css: ['css'] // Не обязательно, если совпадает
    }
};

gulp.task('build-css', () => {
    return gulp.src('*.html')
        // Stream<Vinyl>
        .pipe(through2.obj((file, _, cb) => {
            const decl = bemjson2decl.convert(
                html2bemjson.convert(file.contents.toString('utf-8')/*, 'naming?'*/)
            );
            // Skip if empty declaration
            if (!decl.length) {
                cb();
                return;
            }

            const bundle = new Bundle({
                name: basename(file.path, '.html'),
                path: '.',
                decl: decl
            });
            // console.log({ bundle, decl });

            cb(null, bundle);
        }))
        // Stream<Bundle>
        // TODO: Здесь можно мигрировать на gulp-bem-bundle-builder в будущем
        //       Пока собираем только css, поэтому код не дублируется и пока можно прямо так
        .pipe(through2.obj(async (bundle, _, cb) => {
            // Заряжаем проход по уровням
            try {
                cb(null, (await toArray(
                    bemSrc(config.levels, bundle.decl, 'css', config)
                        .pipe(gdebug({ title: `[${bundle.name}.css]:` }))
                        .pipe(gconcat(`./${bundle.name}.css`)))
                )[0]);
            } catch(e) {
                cb(e);
            }
        }))
        // Stream<Vinyl>
        .pipe(gdebug({ title: 'dest:' }))
        .pipe(gulp.dest('./build'));
});

// Stream to array
function toArray(stream) {
    const res = [];
    return new Promise((resolve, reject) => {
        stream
            .on('data', (chunk) => res.push(chunk))
            .on('error', (e) => reject(e))
            .on('end', () => resolve(res));
    });
}
