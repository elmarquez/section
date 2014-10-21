/**
 * List the available Grunt tasks in this repository.
 */
module.exports = {
  all: {
    options: {
      filter: 'exclude',
      tasks: []
    }
  },
  main: {
    options: {
      filter: 'include',
      tasks: ['availabletasks', 'compile', 'test']
    }
  }
};
