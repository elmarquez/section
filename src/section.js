/**
 * Section - A library for visualizing architectural assembly sections.
 * @type {Section|*|{}}
 */

/**
 * Constructor
 * @param element
 * @param height
 * @param width
 */
var Section = function (element, height, width) {
  // instance
  var instance = this;

  this.height = height;
  this.width = width;

  // Create the scene and set the scene size.
  this.scene = new THREE.Scene();
  this.viewport = document.getElementById(element);

  // Create a renderer and add it to the DOM.
  this.renderer = new THREE.WebGLRenderer({ antialias: true });
  this.renderer.setSize(this.width, this.height);
  this.viewport.appendChild(this.renderer.domElement);

  // Create a camera, zoom it out from the model a bit, and add it to the scene.
  this.camera = new THREE.PerspectiveCamera(30, this.width / this.height, 0.1, 10000);
  this.camera.lookAt(0, 0, 0);
  this.camera.position.set(1000, 1000, 200);
  this.scene.add(this.camera);

  // Create an event listener that resizes the renderer with the browser window.
  window.addEventListener('resize', function () {
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  });

  // Set the background color of the scene.
  this.renderer.setClearColorHex(0xffffff, 1);

  // Create a light, set its position, and add it to the scene.
  var light1 = new THREE.PointLight(0xaaaaaa);
  light1.position.set(-200, 300, -200);
  this.scene.add(light1);

  var light2 = new THREE.PointLight(0xffffff);
  light2.position.set(200, 300, 200);
  this.scene.add(light2);

  // Create the model and add it to the scene
  var model = this.buildModel();
  model.position.set(0, 0, 0);
  this.scene.add(model);

  // Axis helper
  var axisHelper = new THREE.AxisHelper(500);
  this.scene.add(axisHelper);

  // Add OrbitControls so that we can pan around with the mouse.
  this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

  // Zoom to fit the object bounding box
  // this.zoomObject(camera, group);
};

/**
 * Renders the scene and updates the render as needed.
 * Read more about requestAnimationFrame at
 * http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
Section.prototype.animate = function () {
  requestAnimationFrame(this.animate);
  this.renderer.render(this.scene, this.camera);
  this.controls.update();
};

/**
 * Build the model.
 * @param model
 */
Section.prototype.build = function(model) {};

/**
 * Build the visualization.
 * @returns {THREE.Object3D}
 */
Section.prototype.buildModel = function () {
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
  var subassembly = [],
    group = new THREE.Object3D(),
    mesh,
    thickness = 0,
    totalThickness = 0;
  model.forEach(function (element) {
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
        mesh.add(createMesh(component));
      });
      // TODO boolean operations
      group.add(subassembly);
    } else {
      thickness = element.thickness;
      mesh = createMesh(element);
    }
    mesh.position.set(0, 0, totalThickness + (thickness / 2));
    group.add(mesh);
    totalThickness += thickness || 0;
  });
  return group;
};

/**
 * Collapse the model back to its default presentation state.
 */
Section.prototype.collapse = function () {
  window.alert('The collapse function has not been implemented yet');
};

/**
 * Create layer mesh.
 * @param item Model item
 * @returns {THREE.Mesh}
 */
Section.prototype.createMesh = function (item) {
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

Section.prototype.createOriginMarker = function () {
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
Section.prototype.explode = function (dist) {
  window.alert('The explode function has not been implemented yet');
};

/**
 * Zoom the camera to fit the bounding box of the specified object within the
 * display.
 * @param obj Object3d
 */
Section.prototype.zoomObject = function (obj) {
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
  var distance = center.distanceTo(this.camera.position) - radius;
  var realHeight = Math.abs(helper.box.max.y - helper.box.min.y);
  var fov = 2 * Math.atan(realHeight * correctForDepth / (10 * distance)) * (180 / Math.PI);
  this.camera.fov = fov;
  this.camera.updateProjectionMatrix();
};