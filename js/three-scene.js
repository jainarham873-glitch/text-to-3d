let scene, camera, renderer, controls, model, grid;
let isWireframe = false;
let showGridFlag = true;

function initScene(canvas) {
    const container = canvas.parentElement;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);

    // Camera
    const aspect = container.clientWidth / container.clientHeight || 1;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(3, 2.5, 3);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 15;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7);
    directional.castShadow = true;
    scene.add(directional);

    const fill = new THREE.DirectionalLight(0x6366f1, 0.3);
    fill.position.set(-5, 5, -5);
    scene.add(fill);

    // Grid
    grid = new THREE.GridHelper(10, 20, 0x6366f1, 0x222228);
    grid.position.y = -0.5;
    scene.add(grid);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    function onResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width && height) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    }

    window.addEventListener('resize', onResize);
    new ResizeObserver(onResize).observe(container);
}

async function loadModel(base64Data) {
    return new Promise((resolve, reject) => {
        // Clear existing model
        clearModel();

        try {
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            const blob = new Blob([bytes.buffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);

            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    model = gltf.scene;

                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            if (child.material) {
                                child.material.side = THREE.DoubleSide;
                                child.material.wireframe = isWireframe;
                            }
                        }
                    });

                    // Center model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);

                    // Scale to fit
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    if (maxDim > 2) {
                        model.scale.multiplyScalar(2 / maxDim);
                    }

                    scene.add(model);
                    resetCamera();

                    URL.revokeObjectURL(url);
                    resolve();
                },
                undefined,
                (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        } catch (error) {
            reject(error);
        }
    });
}

function clearModel() {
    if (model) {
        scene.remove(model);
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        model = null;
    }
}

function resetCamera() {
    camera.position.set(3, 2.5, 3);
    camera.lookAt(0, 0, 0);
    controls.reset();
}

function toggleWire() {
    isWireframe = !isWireframe;
    if (model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.wireframe = isWireframe;
            }
        });
    }
    return isWireframe;
}

function toggleGrid() {
    showGridFlag = !showGridFlag;
    if (grid) {
        grid.visible = showGridFlag;
    }
    return showGridFlag;
}
