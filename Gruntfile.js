var Path = require('path');

module.exports = function (grunt) {

  // Load the Grunt task definitions and configurations from the /conf/grunt
  // folder.
  require('load-grunt-config')(grunt, {
    init: true,
    configPath: Path.join(process.cwd(), 'conf', 'grunt'),
    loadGruntTasks: {
      pattern: 'grunt-*',
      config: require('./package.json'),
      scope: 'devDependencies'
    }
  });
  grunt.config('pkg', grunt.file.readJSON('package.json'));

  // project folder path
  grunt.config('cwd', process.cwd());

};

