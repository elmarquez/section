/**
 * List the available Grunt tasks in this repository.
 */
module.exports = {
  src: {
    cwd: 'src',
    dest: 'dist/js',
    expand: true,
    src: [ '**/*' ]
  },
  fixtures: {
    cwd: 'test/fixtures/textures',
    dest: 'dist/textures',
    expand: true,
    src: [ '**/*' ]
  },
  html: {
    cwd: 'test/fixtures',
    dest: 'dist',
    expand: true,
    src: [ 'index.html', 'OrbitControls.js' ]
  },
  vendor: {
    cwd: 'vendor',
    dest: 'dist/vendor',
    expand: true,
    src: [ '**/*' ]
  }
};
