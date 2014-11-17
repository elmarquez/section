module.exports = function(grunt) {
    grunt.registerTask('compile', 'Compile the library', ['jshint','clean','copy']);
};
