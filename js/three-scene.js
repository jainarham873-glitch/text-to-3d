/**
 * Three.js Scene Manager
 * Handles 3D rendering and model display
 */

class ThreeScene {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.container = this.canvas.parentElement;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.gridHelper = null;
        this.isWireframe = false;
        this.showGrid = true;
        
        this.init();
        this.animate();
        
        window.addEventListener('resize', () => this.onResize());
        
        // Resize observer for container size changes
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight || 1;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(3, 2, 3);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 15;

        // Lighting
        this.setupLighting();

        // Grid
        this.setupGrid();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x4fc3f7, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
    }

    setupGrid() {
        this.gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x333333);
        this.gridHelper.position.y = -0.5;
        this.scene.add(this.gridHelper);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    async loadGLB(base64Data) {
        return new Promise((resolve, reject) => {
            try {
                this.clearModel();

                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes.buffer], { type: 'model/gltf-binary' });
                const url = URL.createObjectURL(blob);

                const loader = new THREE.GLTFLoader();
                loader.load(
                    url,
                    (gltf) => {
                        this.currentModel = gltf.scene;
                        
                        this.currentModel.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                if (child.material) {
                                    child.material.side = THREE.DoubleSide;
                                    if (this.isWireframe) {
                                        child.material.wireframe = true;
                                    }
                                }
                            }
                        });

                        // Center model
                        const box = new THREE.Box3().setFromObject(this.currentModel);
                        const center = box.getCenter(new THREE.Vector3());
                        this.currentModel.position.sub(center);

                        // Scale to fit
                        const size = box.getSize(new THREE.Vector3());
                        const maxDim = Math.max(size.x, size.y, size.z);
                        if (maxDim > 3) {
                            const scale = 3 / maxDim;
                            this.currentModel.scale.multiplyScalar(scale);
                        }

                        this.scene.add(this.currentModel);
                        this.resetCamera();
                        
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

    clearModel() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel.traverse((child) => {
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
            this.currentModel = null;
        }
    }

    resetCamera() {
        this.camera.position.set(3, 2, 3);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }

    toggleWireframe() {
        this.isWireframe = !this.isWireframe;
        
        if (this.currentModel) {
            this.currentModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.wireframe = this.isWireframe;
                }
            });
        }
        
        return this.isWireframe;
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.gridHelper.visible = this.showGrid;
        return this.showGrid;
    }

    hasModel() {
        return this.currentModel !== null;
    }
}

// Global instance
let threeScene = null;