var gulp = require('gulp');
var frontMatter = require('gulp-front-matter');
var markdown = require('gulp-markdown');
var rename = require('gulp-rename');
var highlightCodeBlock = require('./utils/highlight-code-block');
var extendLayout = require('./utils/extend-layout');
var hb = require('gulp-hb');
var hbLayouts = require('handlebars-layouts');
var htmlInMd = require('./utils/html-in-md');
var transfob = require('transfob');
var path = require('path');
var addFileProperties = require('./utils/add-file-properties');

var lessonsSrc = 'content/*.md';
var pagesSrc = 'content/*.html';
var layoutsSrc = 'layouts/*.hbs';
var partialsSrc = [ 'modules/*/**/*.hbs' ];

var lessons;
var lessonList = [
  'cache-jquery-objects',
  'state-variables',
  'un-repeat-with-functions',
  'replace-jquery-this',
  'simplify-selectors',
  'hash-maps',
  // 'return-early',
];

gulp.task( 'lessons', function() {
  lessons = [];

  return gulp.src( lessonsSrc )
    .pipe( getFront() )
    .pipe( transfob( function( file, enc, next ) {
      // only lessons
      if ( file.data.page.layout != 'lesson' ) {
        next( null, file );
        return;
      }

      var slug = path.basename( file.path, '.md' );
      var index = lessonList.indexOf( slug );
      file.data.page.slug = slug;
      lessons[ index ] = file.data.page;
      next( null, file );
    }) );
});

module.exports = function( site ) {

  gulp.task( 'content-pages', [ 'lessons' ], function() {
    return gulp.src('content/*.html')
      .pipe( getFront() )
      .pipe( addFileProperties() )
      .pipe( extendLayout() )
      .pipe( getHandlebars( site ) )
      .pipe( highlightCodeBlock() )
      .pipe( gulp.dest('build') );
  });

  gulp.task( 'content-lessons', function() {
    return gulp.src('content/*.md')
      .pipe( getFront() )
      .pipe( addFileProperties() )
      // highlight blocks in markdown
      .pipe( highlightCodeBlock() )
      .pipe( markdown() )
      .pipe( htmlInMd() )
      .pipe( extendLayout() )
      // highlight blocks inserted after handlebars
      .pipe( getHandlebars( site ) )
      .pipe( highlightCodeBlock() )
      .pipe( rename({ extname: '.html' }) )
      .pipe( gulp.dest('build') );
  });

  gulp.task( 'content', [
    'content-pages',
    'content-lessons',
  ]);

  site.watch( pagesSrc, [ 'content-pages' ] );
  site.watch( lessonsSrc, [ 'content-lessons' ] );
  site.watch( layoutsSrc, [ 'content' ] );
  site.watch( partialsSrc, [ 'content' ] );
};

function getFront() {
  return frontMatter({
    property: 'data.page',
    remove: true
  });
}

function getHandlebars( site ) {
  return hb()
    .partials( layoutsSrc )
    .partials( partialsSrc, {
      parsePartialName: function( options, file ) {
        return path.basename( file.path, '.hbs' );
      }
    } )
    .helpers( hbLayouts )
    .data( site.data )
    .data( { lessons: lessons } );
}
