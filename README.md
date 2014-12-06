Threejs-Section
===============

Section makes it easy to generate 3D visualizations of typical building wall,
floor and roof assemblies.

Define your building assembly in a JSON object or file using the format
described below. Section will generate and render the 3D model for you
automatically, and provide you with various ways of interacting with the model.

threejs-section requires an HTML5 compatible browser and the following third
party libraries:

  * threejs
  * threejs-csg

Stable releases are tagged following the Semantic Versioning standard. All
other commits should be treated as non-stable.

[![Build Status](https://travis-ci.org/elmarquez/section.svg?branch=master)](https://travis-ci.org/elmarquez/section)


Making a Model
--------------

Notes forthcoming.


Using Section with Angular.js
-----------------------------

Notes forthcoming.


Examples
--------

A number of examples are available inside the /examples folder. To run these
examples you will first need to download and install all development
dependencies, as describing below in the Development section. Once you have
installed the dependencies, start the development web server in the examples
folder as follows:

    grunt connect::examples::keepalive

Open a browser and navigate to http://localhost:8888


Development
-----------

To build the library or run the examples, you will need to install the
following build dependencies:

  * nodejs - http://www.nodejs.org
  * grunt - http://www.gruntjs.com
  * bower - http://www.bower.io

Install Nodejs first, then install Grunt and Bower globally as follows:

    npm install -g grunt grunt-cli
    npm install -g bower

Once you've installed the build dependencies, download and install all
library dependencies as follows:

    npm install
    bower install

Type `grunt` inside the project folder to see the list of build commands.


License
-------

Please see the LICENSE file for copyright and license information.


To Do
-----

The following features are planned:

  * Frame layout
  * Mouse over assembly layer or element initiates animated fade out of other elements
  * Provide event hooks into Section to select elements from external code
  * Angular.js example showing integration with a table listing of the assembly elements
  * Demo page
  * Various layout algorithms for unitized materials
  * Add lighting with shadows
  * Center view orbit on model center
  * Annotations
  * View aids: rulers, grids
