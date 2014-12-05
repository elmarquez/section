/**
 * Section - A library for visualizing architectural assembly sections.
 * @type {Section|*|{}}
 * @param elementId Viewport DOM element ID
 * @param model Model definition
 * @param options Options
 */
var Section = function (elementId, model, options) {
    var instance = this;

    // TODO on init, make sure that nothing is selected

    instance.handlers = {}; // event handlers
    instance.model = model;
    instance.mouse = {x: 0, y: 0};
    instance.options = {
        background: 0xffffff,
        debug: false, // send debugging messages to console
        defaultElement: {
            name: "element",
            constructionPlane: 90, // degrees around the X axis
            height: 500, // only relevant if the element is unitized, otherwise default to model dimension
            width: 500, // only relevant if the element is unitized, otherwise default to model dimension
            thickness: 10,
            maxLayerThickness: 1000,
            color: 0xcccccc,
            opacity: 1.0,
            material: null,
            transparency: 1.0,
            type: "sheet", // sheet, unit, frame, infill, void
            offset: {top: 0, left: 0, bottom: 0, right: 0, front: 0, back: 0}
        },
        enableSelection: false,
        fps: 30,
        minThickness: 5, // this is required because selection does not work properly when the layer is < 5mm
        selectedMaterialColor: 0xffff00,
        selectedMaterialOpacity: 0.2,
        showAssemblyBoundingBox: true,
        showLayerBoundingBox: true,
        showOriginMarker: true
    };
    instance.raycaster = new THREE.Raycaster();
    instance.scene = null;
    instance.selected = null;
    instance.unselectedOpacity = 0.2;
    instance.viewport = document.getElementById(elementId);

    instance.viewportHeight = instance.viewport.clientHeight;
    instance.viewportWidth = instance.viewport.clientWidth;

    // override default options
    if (options) {
        Object.keys(options).forEach(function (key) {
            instance.options[key] = options[key];
        });
    }

    /**
     * Renders the scene and updates the render at the specified maximum frame
     * rate. This approach was taken because the renderer was doing excessive
     * work on the GPU, making it appear that the requestAnimationFrame was not
     * working.
     */
    this.animate = function () {
        setTimeout(function () {
            requestAnimationFrame(instance.animate);
            instance.select();
            instance.renderer.render(instance.scene, instance.camera);
            instance.controls.update();
        }, 1000 / instance.options.fps);
    };

    /**
     * Recursively apply default values to model.
     * @param model Model
     * @param defaults Model element default values
     */
    this.applyModelDefaults = function (model, defaults) {
        if (Array.isArray(model)) {
            model.forEach(function (element) {
                instance.applyModelDefaults(element, defaults);
            });
        } else {
            Object.keys(defaults).forEach(function (key) {
                if (!model.hasOwnProperty(key)) model[key] = defaults[key];
            });
        }
    };

    /**
     * Build the visualization by iteratively adding each layer adjacent the
     * next, starting at the construction plane and working outward along the
     * positive Z axis.
     * @returns {THREE.Object3D}
     */
    this.build = function () {
        var group = new THREE.Object3D(), mesh, thickness = 0, z = -0.0;
        // apply default values to model elements
        // FIXME maybe we shouldn't do this for thickness value!
        instance.applyModelDefaults(instance.model.layers, instance.options.defaultElement);
        // add each assembly layer to the scene
        instance.model.layers.forEach(function (layer) {
            // the thickness of a layer is determined by the thickest element
            // within the layer
            if (Array.isArray(layer)) {
                thickness = layer.reduce(function (last, current) {
                    return (current.thickness > last) ? current.thickness : last;
                }, 0);
            } else {
                thickness = layer.thickness;
            }
            // layer thickness must be greater than or equal to the minimum
            thickness = (thickness < instance.options.minThickness) ? instance.options.minThickness : thickness;
            // build the layer
            mesh = instance.buildLayer(layer);
            z += thickness / 2.0;
            mesh.position.set(0, 0, z);
            z += thickness / 2.0;
            group.add(mesh);
            // display the layer bounding box
            if (instance.options.showLayerBoundingBox) {
                var bbox = new THREE.BoundingBoxHelper(mesh, 0xff0000);
                bbox.update();
                instance.scene.add(bbox);
            }
        });
        // position the group at the center
        group.position.set(0, 0, 0);
        // TODO orient the assembly as defined in the model options
        instance.scene.add(group);
        // show the maximum bounding volume in debugging mode
        if (instance.options.showAssemblyBoundingBox) {
            instance.scene.add(new THREE.Mesh(group, new THREE.MeshBasicMaterial({color: 0xfdc00d, wireframe: true})));
        }
    };

    /**
     * Build the layer representation.
     * @param layer Layer definition
     * @returns {THREE.Object3D}
     */
    this.buildLayer = function (layer) {
        var boundingBsp, boundingGeometry, boundingMesh, first, i, item,
            material, mesh, subassemblies = [];
        // define the maximum bounding volume for the assembly
        boundingGeometry = new THREE.BoxGeometry(
            instance.options.defaultElement.height,
            instance.options.defaultElement.width,
            instance.options.defaultElement.maxLayerThickness);
        boundingMesh = new THREE.Mesh(boundingGeometry);
        boundingBsp = new ThreeBSP(boundingMesh);
        // generate the layer model
        if (Array.isArray(layer)) {
            layer.forEach(function (subassembly) {
                mesh = instance.buildLayer(subassembly);
                // FIXME When we do the mesh intersect operation, there is an
                // odd displacement of the mesh toward the positive quadrant.
                // The position, intersect, position operations reset the mesh
                // to its intended location ... until such time as I can figure
                // out what I'm doing wrong.
                mesh.position.set(
                    -(mesh.userData.width / 2) + mesh.userData.offsetX,
                    -(mesh.userData.height / 2) + mesh.userData.offsetY,
                    0);
                mesh = instance.intersect(mesh, boundingBsp);
                mesh.position.set(0, 0, 0);
                subassemblies.push(mesh);
            });
            // group subassemblies into a layer object
            if (subassemblies.length > 1) {
                mesh = new THREE.Object3D();
                first = subassemblies[0];
                mesh.add(first);
                for (i = 1; i < subassemblies.length; i++) {
                    item = subassemblies[i];
                    item = instance.subtract(item, first);
                    mesh.add(item);
                }
            } else {
                mesh = subassemblies[0];
            }
        } else if (layer.type === 'unit') {
            mesh = instance.createUnitizedMesh(layer);
        } else if (layer.type === 'frame') {
            mesh = instance.createUnitMesh(
                layer.name,
                instance.options.defaultElement.width,
                instance.options.defaultElement.height,
                layer.thickness - layer.offset.front - layer.offset.back,
                layer.material
            );
        } else if (layer.type === 'void') {
            material = new THREE.MeshLambertMaterial({ color: 0x9999ff, transparent: true, opacity: 0.1 });
            mesh = instance.createUnitMesh(
                layer.name,
                instance.options.defaultElement.width,
                instance.options.defaultElement.height,
                layer.thickness - layer.offset.front - layer.offset.back,
                material
            );
        } else if (layer.type === 'infill' || layer.type === 'sheet') {
            // sheet material
            mesh = instance.createUnitMesh(
                layer.name,
                instance.options.defaultElement.width,
                instance.options.defaultElement.height,
                layer.thickness - layer.offset.front - layer.offset.back,
                layer.material
            );
        }
        mesh.userData.name = layer.name || 'layer name';
        return mesh;
    };

    /**
     * Create mesh for a sheet element.
     * @param obj Model object
     * @returns {THREE.Mesh}
     */
    this.createUnitizedMesh = function (obj) {
        var cols, geometry = new THREE.Geometry(), i, j, material, mesh, rows, unit;
        // TODO there should be a configuration option for layout algorithm
        // lay the units out in an x, y grid
        rows = Math.ceil(instance.options.defaultElement.height / obj.height);
        cols = Math.ceil(instance.options.defaultElement.width / obj.width);
        if (instance.options.debug) console.log('cols %s rows %s', cols, rows);
        for (i = 0; i < rows; i++) {
            for (j = 0; j < cols; j++) {
                unit = new THREE.BoxGeometry(
                    obj.width - obj.offset.left - obj.offset.right,
                    obj.height - obj.offset.top - obj.offset.bottom,
                    obj.thickness - obj.offset.front - obj.offset.back
                );
                var v = new THREE.Vector3(j * obj.width, i * obj.height, 0);
                var m = new THREE.Matrix4();
                m.setPosition(v);
                geometry.merge(unit, m);
            }
        }
        material = instance.getMaterial(obj.material);
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        // merge the geometry into a single mesh object
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData.name = obj.name;
        mesh.userData.offsetX = obj.width / 2;
        mesh.userData.offsetY = obj.height / 2;
        mesh.userData.height = rows * obj.height;
        mesh.userData.width = cols * obj.width;
        return mesh;
    };

    /**
     * Create unit mesh mesh.
     * @param name Model object name
     * @param width Width
     * @param height Height
     * @param thickness Thickness
     * @param material Material
     * @returns {THREE.Mesh}
     */
    this.createUnitMesh = function (name, width, height, thickness, material) {
        var geom, mat, mesh;
        geom = new THREE.BoxGeometry(width, height, thickness);
        mat = (material instanceof THREE.Material) ? material : instance.getMaterial(material);
        mesh = new THREE.Mesh(geom, mat);
        mesh.userData.name = name;
        mesh.userData.offsetX = width / 2;
        mesh.userData.offsetY = height / 2;
        mesh.userData.height = height;
        mesh.userData.width = width;
        return mesh;
    };

    /**
     * Deselect layers.
     * @param obj
     */
    this.deselect = function (obj) {
        if (obj.type === 'Mesh') {
            var tween = new TWEEN.Tween(obj.opacity).to(instance.options.unselectedOpacity, 1000);
        } else if (obj.type === 'Object3D') {
        }
    };

    /**
     * Get material.
     * @param material
     * @returns {*}
     */
    this.getMaterial = function (material) {
        var texture;
        if (material && material.texture) {
            try {
                texture = THREE.ImageUtils.loadTexture(material.texture);
                return new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
            } catch (e) {
                console.log("ERROR: Could not load material %s", material.texture);
            }
        }
        return new THREE.MeshLambertMaterial({
            color: material.color,
            transparent: true,
            opacity: material.opacity || 1.0
        });
    };

    this.init = function () {
        // Create the scene and set the scene size.
        instance.scene = new THREE.Scene();

        // Create a renderer and add it to the DOM.
        instance.renderer = new THREE.WebGLRenderer({antialias: true});
        instance.renderer.setSize(instance.viewportWidth, instance.viewportHeight);
        instance.viewport.appendChild(instance.renderer.domElement);

        // Set the background color of the scene.
        instance.renderer.setClearColor(instance.options.background, 1);

        // Resize the renderer when the browser window resizes
        window.addEventListener('resize', function () {
            instance.viewportHeight = instance.viewport.clientHeight;
            instance.viewportWidth = instance.viewport.clientWidth;
            instance.renderer.setSize(instance.viewportWidth, instance.viewportHeight);
            instance.camera.aspect = instance.viewportWidth / instance.viewportHeight;
            instance.camera.updateProjectionMatrix();
        });

        // Create a camera, zoom it out from the model a bit, and add it to the scene.
        instance.camera = new THREE.PerspectiveCamera(30,
            instance.viewportWidth / instance.viewportHeight,
            0.1,
            10000);
        instance.camera.position.set(
            instance.options.defaultElement.width * 2,
            instance.options.defaultElement.height,
            instance.options.defaultElement.width * 2);
        instance.camera.lookAt(0, instance.options.defaultElement.height, 0);
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

        // listen for mouse actions
        document.addEventListener('mousemove', instance.onMouseMove, false);

        // Zoom to fit the object bounding box
        // instance.zoomObject(camera, group);

        // Add OrbitControls so that we can pan around with the mouse.
        instance.controls = new THREE.OrbitControls(instance.camera, instance.renderer.domElement);
    };

    /**
     * Return the intersection of the object and the BSP.
     * @param obj
     * @param bsp
     * @returns {*}
     */
    this.intersect = function (obj, bsp) {
        var intersectionBsp, mesh, objBsp, result;
        if (obj instanceof THREE.Mesh) {
            objBsp = new ThreeBSP(obj);
            intersectionBsp = bsp.intersect(objBsp);
            //result = intersectionBsp.toMesh(obj.material);
            result = new THREE.Mesh(intersectionBsp.toGeometry(), obj.material);
            result.geometry.computeFaceNormals();
            result.geometry.computeVertexNormals();
        } else {
            result = new THREE.Object3D();
            if (!obj) {
                console.dir(obj);
            } else {
                obj.children.forEach(function (child) {
                    if (child) {
                        mesh = instance.intersect(child, bsp);
                        result.add(mesh);
                    }
                });
            }
        }
        result.position.set(
            obj.position.getComponent(0),
            obj.position.getComponent(1),
            obj.position.getComponent(2)
        );
        var p1 = JSON.stringify(obj.position);
        var p2 = JSON.stringify(result.position);
        console.log('%s : %s', p1, p2);
        return result;
    };

    /**
     * Merge A then B into a new object C.
     * @param A The default object.
     * @param B The overriding object values.
     * @returns {{}}
     */
    this.merge = function (A, B) {
        var C = {};
        Object.keys(A).forEach(function (key) {
            C[key] = A[key];
        });
        Object.keys(B).forEach(function (key) {
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
     * Handle mouse move event.
     * @param event
     */
    this.onMouseMove = function (event) {
        event.preventDefault();
        instance.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        instance.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    /**
     * If the mouse pointer is over an object then set the opacity of all other
     * objects to a fraction of their current state.
     */
    this.select = function () {
        if (instance.options.enableSelection) {
            var vector = new THREE.Vector3(instance.mouse.x, instance.mouse.y, 1).unproject(instance.camera);
            var position = instance.camera.position;
            instance.raycaster.set(position, vector.sub(position).normalize());
            var intersects = instance.raycaster.intersectObjects(instance.scene.children, true);
            // if there is one (or more) intersections
            if (intersects.length > 0) {
                if (instance.options.debug) console.dir(intersects[0]);
                // if the closest object intersected is not the currently stored intersection object
                if (intersects[0].object != instance.selected) {
                    // restore previous intersection object (if it exists) to its original color
                    if (instance.selected)
                        instance.selected.material.color.setHex(instance.selected.currentHex);
                    // store reference to closest object as current intersection object
                    instance.selected = intersects[0].object;
                    // store color of closest object (for later restoration)
                    instance.selected.currentHex = instance.selected.material.color.getHex();
                    // set a new color for closest object
                    instance.selected.material.color.setHex(instance.options.selectedMaterialColor);
                }
            } else {
                // TODO set all object opacities to their default

                // restore previous intersection object (if it exists) to its original color
                if (instance.selected)
                    instance.selected.material.color.setHex(instance.selected.currentHex);
                // remove previous intersection object reference
                //     by setting current intersection object to "nothing"
                instance.selected = null;
            }
        }
    };

    /**
     * Stop animation.
     */
    this.stop = function () {
    };

    /**
     * Subtract geometry B from geometry A.
     * @param A Mesh
     * @param B Mesh
     */
    this.subtract = function (A, B) {
        var aBsp, bBsp, result, subtractedBsp;
        aBsp = new ThreeBSP(A);
        bBsp = new ThreeBSP(B);
        subtractedBsp = aBsp.subtract(bBsp);
        result = new THREE.Mesh(subtractedBsp.toGeometry(), A.material);
        result.geometry.computeFaceNormals();
        result.geometry.computeVertexNormals();
        result.position.set(
            A.position.getComponent(0),
            A.position.getComponent(1),
            A.position.getComponent(2)
        );
        return result;
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
