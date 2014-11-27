/**
 * Section - A library for visualizing architectural assembly sections.
 * @type {Section|*|{}}
 * @param elementId Viewport DOM element ID
 * @param model Model definition
 * @param options Options
 */
var Section = function (elementId, model, options) {
  var instance = this;

  instance.viewport = document.getElementById(elementId);

  instance.handlers = {}; // event handlers
  instance.height = this.element.clientHeight;
  instance.model = model;
  instance.options = {
    assemblyHeight: 500,
    assemblyWidth: 500,
    background: 0xffffff,
    fps: 30,
    showOriginMarker: true
  };
  instance.width = this.element.clientWidth;

  // override default options
  if (options) {
    Object.keys(options).forEach(function(key) {
      instance.options[key] = options[key];
    });
  }

  // a default construction element
  this.defaultElement = {
    name: "element",
    constructionPlane: 90,                   // degrees around the X axis
    height: instance.options.assemblyHeight, // only relevant if the element is unitized, otherwise default to model dimension
    width: instance.options.assemblyWidth,   // only relevant if the element is unitized, otherwise default to model dimension
    thickness: 10, // when -1, then fill the layer with the parent thickness?
    color: 0xcccccc,
    opacity: 1.0,
    material: null,
    transparency: 1.0,
    type: "sheet", // sheet, unit, frame
    offset: [0, 0, 0, 0, 0, 0] // top, left, bottom, right, front, back offset between repetitions within the layer
  };

  /**
   * Renders the scene and updates the render at the specified maximum frame
   * rate. This approach was taken because the renderer was doing excessive
   * work on the GPU, making it appear that the requestAnimationFrame was not
   * working.
   */
  this.animate = function () {
    setTimeout(function() {
      requestAnimationFrame(instance.animate);
      instance.renderer.render(instance.scene, instance.camera);
      instance.controls.update();
    }, 1000 / instance.options.fps);
  };

  /**
   * Build the visualization by iteratively adding each assembly layer on top
   * of the next, starting at the construction plane and working in the
   * positive axis dimension.
   * @returns {THREE.Object3D}
   */
  this.build = function () {
    var group = new THREE.Object3D(), mesh, thickness = 0, totalThickness = 0;
    // add each assembly layer to the
    instance.model.forEach(function (layer) {
      // merge default values with layer values


      if (Array.isArray(layer)) {
        // get the thickest element in the list
        thickness = layer.reduce(function (last, current) {
          return (last < current.thickness) ? current.thickness : last;
        }, 0);
      } else {
        thickness = layer.thickness;
      }
      mesh = instance.buildLayer(layer);
      mesh.position.set(0, 0, totalThickness + (thickness / 2));
      group.add(mesh);
      totalThickness += thickness || 0;
    });
    // position the group at the center
    group.position.set(0, 0, 0);
    instance.scene.add(group);
  };

  /**
   * Build the layer mesh.
   * @param layer Layer definition
   * @returns {THREE.Object3D}
   */
  this.buildLayer = function (layer) {
    var members = [], mesh;
    // if the layer comprises a number of elements then build the layer as a
    // single object
    if (Array.isArray(layer)) {
      layer.forEach(function (subassembly) {
        members.add(instance.buildLayer(subassembly));
      });
      // subtract the parent assembly from the subassemblies
      // TODO
      // merge the assembles into a single object
      mesh = new THREE.Object3D();
      group.add(mesh);
    } else if (layer.type === 'sheet') {
      mesh = instance.createSheetMesh(layer);
    } else if (layer.type === 'unit') {
      mesh = instance.createUnitizedMesh(layer);
    } else if (layer.type === 'frame') {}
    return mesh;
  };

  /**
   * Create mesh for a sheet element.
   * @param item Model item
   * @returns {THREE.Mesh}
   */
  this.createSheetMesh = function (item) {
    var geom, material, texture;
    geom = new THREE.BoxGeometry(500, 500, item.thickness || 1);
    if (item.color) {
      material = new THREE.MeshLambertMaterial({
        color: item.color,
        transparent: true, // item.transparent || item.opacity < 1 ? true : false,
        opacity: item.opacity || 1.0
      });
    }
    if (item.material && item.material.texture) {
      texture = THREE.ImageUtils.loadTexture(item.material.texture);
      material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
    }
    return new THREE.Mesh(geom, material);
  };

  /**
   * Create mesh for a sheet element.
   * @param item Model item
   * @returns {THREE.Mesh}
   */
  this.createUnitizedMesh = function (item) {
    var geom, material, texture;

    // how many units fit into the volume?

    //var cube_geometry = new THREE.CubeGeometry( 3, 3, 3 );
    //var cube_mesh = new THREE.Mesh( cube_geometry );
    //cube_mesh.position.x = -7;
    //var cube_bsp = new ThreeBSP( cube_mesh );
    //
    //var sphere_geometry = new THREE.SphereGeometry( 1.8, 32, 32 );
    //var sphere_mesh = new THREE.Mesh( sphere_geometry );
    //sphere_mesh.position.x = -7;
    //var sphere_bsp = new ThreeBSP( sphere_mesh );
    //
    //var subtract_bsp = cube_bsp.subtract( sphere_bsp );
    //var result = subtract_bsp.toMesh( new THREE.MeshLambertMaterial({ shading: THREE.SmoothShading, map: THREE.ImageUtils.loadTexture('texture.png') }) );
    //result.geometry.computeVertexNormals();
    //scene.add(result);

    geom = new THREE.BoxGeometry(500, 500, item.thickness || 1);
    if (item.color) {
      material = new THREE.MeshLambertMaterial({
        color: item.color,
        transparent: true, // item.transparent || item.opacity < 1 ? true : false,
        opacity: item.opacity || 1.0
      });
    }
    if (item.material && item.material.texture) {
      texture = THREE.ImageUtils.loadTexture(item.material.texture);
      material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
    }
    return new THREE.Mesh(geom, material);
  };

  this.init = function () {
    // Create the scene and set the scene size.
    instance.scene = new THREE.Scene();

    // Create a renderer and add it to the DOM.
    instance.renderer = new THREE.WebGLRenderer({ antialias: true });
    instance.renderer.setSize(instance.width, instance.height);
    instance.viewport.appendChild(instance.renderer.domElement);

    // Set the background color of the scene.
    instance.renderer.setClearColor(instance.options.background, 1);

    // Resize the renderer when the browser window resizes
    window.addEventListener('resize', function () {
      instance.height = instance.viewport.clientHeight;
      instance.width = instance.viewport.clientWidth;
      instance.renderer.setSize(instance.width, instance.height);
      instance.camera.aspect = instance.width / instance.height;
      instance.camera.updateProjectionMatrix();
    });

    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    instance.camera = new THREE.PerspectiveCamera(30, instance.width / instance.height, 0.1, 10000);
    instance.camera.lookAt(0, 0, 0);
    instance.camera.position.set(1000, 1000, 200);
    instance.scene.add(instance.camera);

    // Create a light, set its position, and add it to the scene.
    var light1 = new THREE.PointLight(0xaaaaaa);
    light1.position.set(-200, 300, -200);
    instance.scene.add(light1);

    var light2 = new THREE.PointLight(0xffffff);
    light2.position.set(200, 300, 200);
    instance.scene.add(light2);

    // origin marker
    if (instance.options.showOriginMarker) {
      var axisHelper = new THREE.AxisHelper(500);
      instance.scene.add(axisHelper);
    }

    // Zoom to fit the object bounding box
    // instance.zoomObject(camera, group);

    // Add OrbitControls so that we can pan around with the mouse.
    instance.controls = new THREE.OrbitControls(instance.camera, instance.renderer.domElement);
  };

  /**
   * Merge A then B into a new object C.
   * @param A The default object.
   * @param B The overriding object values.
   * @returns {{}}
   */
  this.merge = function (A, B) {
    var C = {};
    Object.keys(A).forEach(function(key) {
      C[key] = A[key];
    });
    Object.keys(B).forEach(function(key) {
      C[key] = B[key];
    });
    return C;
  };

  /**
   * Set an event handler.
   * @param event Event name
   * @param handler Event handler
   */
  this.on = function (event, handler) {
    if (!instance.handlers.hasOwnProperty(event)) {
      instance.handlers[event] = [];
    }
    instance.handlers[event].push(handler);
  };

  /**
   * Stop animation.
   */
  this.stop = function () {};

  /**
   * Zoom the camera to fit the bounding box of the specified object within the
   * display.
   * @param obj Object3d
   */
  this.zoomObject = function (obj) {
    var correctForDepth = 1.3;
    var rotationSpeed = 0.01;
    var scale = 1;
    // create a bounding helper
    var helper = new THREE.BoundingBoxHelper(obj);
    helper.update();
    // get the bounding sphere
    var boundingSphere = helper.box.getBoundingSphere();
    // calculate the distance from the center of the sphere
    // and subtract the radius to get the real distance.
    var center = boundingSphere.center;
    var radius = boundingSphere.radius;
    var distance = center.distanceTo(instance.camera.position) - radius;
    var realHeight = Math.abs(helper.box.max.y - helper.box.min.y);
    var fov = 2 * Math.atan(realHeight * correctForDepth / (10 * distance)) * (180 / Math.PI);
    instance.camera.fov = fov;
    instance.camera.updateProjectionMatrix();
  };

  // setup
  this.init();

};
