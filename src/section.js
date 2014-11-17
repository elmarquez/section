/**
 * Section - A library for visualizing architectural assembly sections.
 * @type {Section|*|{}}
 */
var Section = function (element, height, width, model) {
  var instance = this;

  this.element = element;
  this.fps = 30;
  this.height = height;
  this.model = model;
  this.width = width;

  /**
   * Renders the scene and updates the render as needed.
   * Read more about requestAnimationFrame at
   * http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
   */
  this.animate = function () {
    setTimeout(function() {
      requestAnimationFrame(instance.animate);
      instance.renderer.render(instance.scene, instance.camera);
      instance.controls.update();
    }, 1000 / instance.fps);
  };

  /**
   * Build the visualization.
   * @returns {THREE.Object3D}
   */
  this.build = function () {
    var defaultElement = {
      name: "element",
      height: 500,
      width: 500,
      thickness: 10,
      color: 0xcccccc,
      opacity: 1.0,
      material: null,
      transparency: 1.0,
      type: "sheet",
      offset: [0, 0, 0, 0, 0, 0] // top, left, bottom, right, front, back
    };
    var group = new THREE.Object3D(),
        mesh,
        thickness = 0,
        totalThickness = 0;
    instance.model.forEach(function (element) {
      // TODO set default values for element
      if (Array.isArray(element)) {
        // get the thickest element in the list
        thickness = element.reduce(function (last, current) {
          return (last < current.thickness) ? current.thickness : last;
        }, 0);
        // create a group to hold the sub-assembly
        mesh = new THREE.Object3D();
        // add elements to sub-assembly
        element.forEach(function (component) {
          mesh.add(instance.createMesh(component));
        });
        // TODO boolean operations
        group.add(mesh);
      } else {
        thickness = element.thickness;
        mesh = instance.createMesh(element);
      }
      mesh.position.set(0, 0, totalThickness + (thickness / 2));
      group.add(mesh);
      totalThickness += thickness || 0;
    });
    // position the group at the center
    group.position.set(0, 0, 0);
    instance.scene.add(group);
  };

  /**
   * Collapse the model back to its default presentation state.
   */
  this.collapse = function () {
    window.alert('The collapse function has not been implemented yet');
  };

  /**
   * Create layer mesh.
   * @param item Model item
   * @returns {THREE.Mesh}
   */
  this.createMesh = function (item) {
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

  this.createOriginMarker = function () {
    var marker = THREE.Object3D();
    var origin = new THREE.Vector3(0, 0, 0);
    [
      {dir: new THREE.Vector3(1, 0, 0), color: 0xff0000},
      {dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00},
      {dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff}
    ].forEach(function (axis) {
          marker.add(new THREE.ArrowHelper(axis.dir, origin, 1, axis.color));
        });
    return marker;
  };

  /**
   * Explode the model so that the layers can be more easily seen.
   * @param dist Distance between layers, measured center to center
   */
  this.explode = function (dist) {
    window.alert('The explode function has not been implemented yet');
  };

  this.init = function () {
    // Create the scene and set the scene size.
    instance.scene = new THREE.Scene();
    instance.viewport = document.getElementById(instance.element);

    // Create a renderer and add it to the DOM.
    instance.renderer = new THREE.WebGLRenderer({ antialias: true });
    instance.renderer.setSize(instance.width, instance.height);
    instance.viewport.appendChild(instance.renderer.domElement);

    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    instance.camera = new THREE.PerspectiveCamera(30, instance.width / instance.height, 0.1, 10000);
    instance.camera.lookAt(0, 0, 0);
    instance.camera.position.set(1000, 1000, 200);
    instance.scene.add(instance.camera);

    // Create an event listener that resizes the renderer with the browser window.
    window.addEventListener('resize', function () {
      instance.renderer.setSize(instance.width, instance.height);
      instance.camera.aspect = instance.width / instance.height;
      instance.camera.updateProjectionMatrix();
    });

    // Set the background color of the scene.
    instance.renderer.setClearColor(0xffffff, 1);

    // Create a light, set its position, and add it to the scene.
    var light1 = new THREE.PointLight(0xaaaaaa);
    light1.position.set(-200, 300, -200);
    instance.scene.add(light1);

    var light2 = new THREE.PointLight(0xffffff);
    light2.position.set(200, 300, 200);
    instance.scene.add(light2);

    // Axis helper
    var axisHelper = new THREE.AxisHelper(500);
    instance.scene.add(axisHelper);

    // Add OrbitControls so that we can pan around with the mouse.
    instance.controls = new THREE.OrbitControls(instance.camera, instance.renderer.domElement);

    // Zoom to fit the object bounding box
    // instance.zoomObject(camera, group);
  };

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
