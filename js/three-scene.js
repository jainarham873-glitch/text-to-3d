// Three.js Scene Manager - Must load SECOND
(function() {
    'use strict';

    let scene, camera, renderer, controls;
    let currentModel = null;
    let gridHelper = null;
    let wireframeMode = false;
    let gridVisible = true;

    const ThreeScene = {
        init: function(canvasElement) {
            console.log('3D: Initializing scene...');

            if (!canvasElement) {
                console.error('3D: Canvas element not found!');
                return false;
            }

            const container = canvasElement.parentElement;
            if (!container) {
                console.error('3D: Container not found!');
                return false;
            }

            try {
                // Scene
                scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0a0a0c);

                // Camera
                const aspect = container.clientWidth / container.clientHeight || 1;
                camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
                camera.position.set(3, 2.5, 3);
                camera.lookAt(0, 0, 0);

                // Renderer
                renderer = new THREE.WebGLRenderer({
                    canvas: canvasElement,
                    antialias: true,
                    alpha: false
                });
                renderer.setSize(container.clientWidth, container.clientHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                // Controls
                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.minDistance = 1;
                controls.maxDistance = 15;
                controls.maxPolarAngle = Math.PI;

                // Lighting
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(5, 10, 7);
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 1024;
                directionalLight.shadow.mapSize.height = 1024;
                scene.add(directionalLight);

                const fillLight = new THREE.DirectionalLight(0x6366f1, 0.3);
                fillLight.position.set(-5, 5, -5);
                scene.add(fillLight);

                // Grid
                gridHelper = new THREE.GridHelper(10, 20, 0x6366f1, 0x222228);
                gridHelper.position.y = -0.5;
                scene.add(gridHelper);

                // Animation loop
                function animate() {
                    requestAnimationFrame(animate);
                    if (controls) controls.update();
                    if (renderer && scene && camera) {
                        renderer.render(scene, camera);
                    }
                }
                animate();

                // Resize handler
                const resizeHandler = () => {
                    if (!container || !camera || !renderer) return;
                    
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    
                    if (width > 0 && height > 0) {
                        camera.aspect = width / height;
                        camera.updateProjectionMatrix();
                        renderer.setSize(width, height);
                    }
                };

                window.addEventListener('resize', resizeHandler);
                
                // Try ResizeObserver
                if ('ResizeObserver' in window) {
                    const resizeObserver = new ResizeObserver(resizeHandler);
                    resizeObserver.observe(container);
                }

                console.log('✓ 3D Scene initialized');
                return true;

            } catch (err) {
                console.error('3D: Initialization failed', err);
                return false;
            }
        },

        loadModel: async function(base64Data) {
            console.log('3D: Loading model...');

            return new Promise((resolve, reject) => {
                if (!scene) {
                    reject(new Error('Scene not initialized'));
                    return;
                }

                try {
                    // Clear existing model
                    this.clearModel();

                    // Decode base64
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    const blob = new Blob([bytes.buffer], { type: 'model/gltf-binary' });
                    const url = URL.createObjectURL(blob);

                    // Load with GLTFLoader
                    const loader = new THREE.GLTFLoader();
                    
                    loader.load(
                        url,
                        (gltf) => {
                            currentModel = gltf.scene;

                            // Apply materials and shadows
                            currentModel.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    
                                    if (child.material) {
                                        child.material.side = THREE.DoubleSide;
                                        child.material.wireframe = wireframeMode;
                                    }
                                }
                            });

                            // Center model
                            const box = new THREE.Box3().setFromObject(currentModel);
                            const center = box.getCenter(new THREE.Vector3());
                            currentModel.position.sub(center);

                            // Scale to fit
                            const size = box.getSize(new THREE.Vector3());
                            const maxDim = Math.max(size.x, size.y, size.z);
                            if (maxDim > 2) {
                                const scale = 2 / maxDim;
                                currentModel.scale.multiplyScalar(scale);
                            }

                            scene.add(currentModel);
                            this.resetCamera();

                            URL.revokeObjectURL(url);
                            console.log('✓ Model loaded successfully');
                            resolve();
                        },
                        (progress) => {
                            const percent = (progress.loaded / progress.total * 100).toFixed(0);
                            console.log('3D: Loading progress:', percent + '%');
                        },
                        (error) => {
                            URL.revokeObjectURL(url);
                            console.error('3D: Model load failed', error);
                            reject(error);
                        }
                    );

                } catch (err) {
                    console.error('3D: Model processing failed', err);
                    reject(err);
                }
            });
        },

        clearModel: function() {
            if (currentModel && scene) {
                scene.remove(currentModel);
                
                currentModel.traverse((child) => {
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
                
                currentModel = null;
                console.log('3D: Model cleared');
            }
        },

        resetCamera: function() {
            if (camera && controls) {
                camera.position.set(3, 2.5, 3);
                camera.lookAt(0, 0, 0);
                controls.reset();
                console.log('3D: Camera reset');
            }
        },

        toggleWireframe: function() {
            wireframeMode = !wireframeMode;
            
            if (currentModel) {
                currentModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.wireframe = wireframeMode;
                    }
                });
            }
            
            console.log('3D: Wireframe', wireframeMode ? 'ON' : 'OFF');
            return wireframeMode;
        },

        toggleGrid: function() {
            gridVisible = !gridVisible;
            
            if (gridHelper) {
                gridHelper.visible = gridVisible;
            }
            
            console.log('3D: Grid', gridVisible ? 'ON' : 'OFF');
            return gridVisible;
        }
    };

    window.ThreeScene = ThreeScene;
    console.log('✓ Three.js Scene Manager loaded');
})();
