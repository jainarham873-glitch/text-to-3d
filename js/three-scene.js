// Three.js Scene with 360° Auto Rotate
(function() {
    'use strict';

    let scene, camera, renderer, controls;
    let currentModel = null;
    let gridHelper = null;
    
    // State
    let wireframeOn = false;
    let gridOn = true;
    let autoRotateOn = false;
    let rotateSpeed = 0.01;

    window.Viewer = {
        init: function(canvas) {
            console.log('[3D] Initializing...');

            if (!canvas) {
                console.error('[3D] No canvas!');
                return false;
            }

            const container = canvas.parentElement;

            try {
                // Scene
                scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0a0a0c);

                // Camera
                const aspect = container.clientWidth / container.clientHeight || 1;
                camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
                camera.position.set(5, 4, 5);

                // Renderer
                renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
                renderer.setSize(container.clientWidth, container.clientHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                renderer.shadowMap.enabled = true;

                // Controls
                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.minDistance = 2;
                controls.maxDistance = 20;

                // Lights
                scene.add(new THREE.AmbientLight(0xffffff, 0.5));
                
                const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
                mainLight.position.set(5, 10, 7);
                mainLight.castShadow = true;
                scene.add(mainLight);

                const fillLight = new THREE.DirectionalLight(0x6366f1, 0.3);
                fillLight.position.set(-5, 5, -5);
                scene.add(fillLight);

                // Grid
                gridHelper = new THREE.GridHelper(20, 40, 0x6366f1, 0x1a1a1f);
                gridHelper.position.y = -0.5;
                scene.add(gridHelper);

                // Animation Loop
                const animate = () => {
                    requestAnimationFrame(animate);
                    
                    // Auto rotate
                    if (autoRotateOn && currentModel) {
                        currentModel.rotation.y += rotateSpeed;
                    }
                    
                    controls.update();
                    renderer.render(scene, camera);
                };
                animate();

                // Resize
                const resize = () => {
                    const w = container.clientWidth;
                    const h = container.clientHeight;
                    if (w > 0 && h > 0) {
                        camera.aspect = w / h;
                        camera.updateProjectionMatrix();
                        renderer.setSize(w, h);
                    }
                };

                window.addEventListener('resize', resize);
                new ResizeObserver(resize).observe(container);

                console.log('[3D] Initialized');
                return true;

            } catch (err) {
                console.error('[3D] Init error:', err);
                return false;
            }
        },

        loadModel: async function(base64Data) {
            console.log('[3D] Loading model...');

            return new Promise((resolve, reject) => {
                if (!scene) {
                    reject(new Error('Scene not ready'));
                    return;
                }

                // Clear old model
                this.clearModel();

                try {
                    const binary = atob(base64Data);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }

                    const blob = new Blob([bytes.buffer], { type: 'model/gltf-binary' });
                    const url = URL.createObjectURL(blob);

                    new THREE.GLTFLoader().load(
                        url,
                        (gltf) => {
                            currentModel = gltf.scene;

                            currentModel.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    if (child.material) {
                                        child.material.side = THREE.DoubleSide;
                                        child.material.wireframe = wireframeOn;
                                    }
                                }
                            });

                            // Center
                            const box = new THREE.Box3().setFromObject(currentModel);
                            const center = box.getCenter(new THREE.Vector3());
                            currentModel.position.sub(center);
                            currentModel.position.y = 0;

                            // Scale
                            const size = box.getSize(new THREE.Vector3());
                            const maxDim = Math.max(size.x, size.y, size.z);
                            if (maxDim > 4) {
                                currentModel.scale.multiplyScalar(4 / maxDim);
                            }

                            scene.add(currentModel);
                            this.resetCamera();

                            URL.revokeObjectURL(url);
                            console.log('[3D] Model loaded');
                            resolve();
                        },
                        undefined,
                        (err) => {
                            URL.revokeObjectURL(url);
                            console.error('[3D] Load error:', err);
                            reject(err);
                        }
                    );
                } catch (err) {
                    console.error('[3D] Process error:', err);
                    reject(err);
                }
            });
        },

        clearModel: function() {
            if (currentModel) {
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
                console.log('[3D] Model cleared');
            }
        },

        resetCamera: function() {
            if (camera && controls) {
                camera.position.set(5, 4, 5);
                camera.lookAt(0, 0, 0);
                controls.reset();
            }
        },

        toggleWireframe: function() {
            wireframeOn = !wireframeOn;
            if (currentModel) {
                currentModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.wireframe = wireframeOn;
                    }
                });
            }
            console.log('[3D] Wireframe:', wireframeOn);
            return wireframeOn;
        },

        toggleGrid: function() {
            gridOn = !gridOn;
            if (gridHelper) gridHelper.visible = gridOn;
            console.log('[3D] Grid:', gridOn);
            return gridOn;
        },

        toggleAutoRotate: function() {
            autoRotateOn = !autoRotateOn;
            console.log('[3D] Auto-rotate:', autoRotateOn);
            return autoRotateOn;
        },

        setRotateSpeed: function(speed) {
            // speed 1-10 maps to 0.005 - 0.05
            rotateSpeed = 0.003 + (speed / 10) * 0.047;
            console.log('[3D] Rotate speed:', rotateSpeed.toFixed(4));
        },

        isRotating: function() {
            return autoRotateOn;
        }
    };

    console.log('[3D] Module loaded');
})();
