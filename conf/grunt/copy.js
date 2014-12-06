/**
 * List the available Grunt tasks in this repository.
 */
module.exports = {
  dist: {
    cwd: 'src',
    dest: 'dist/',
    expand: true,
    src: [ '**/*.js' ]
  },
  examples: {
    dest: 'examples/',
    expand: false,
    src: [ 'src/**/*.js', 'vendor/**/*.js' ]
  }
};
