module.exports = function(grunt) {
    grunt.registerTask('build', 'Build a distributable version of the library in /dist', ['jshint','clean','copy']);
};
