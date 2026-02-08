// Main Application - Must load LAST
(function() {
    'use strict';

    console.log('App: Starting initialization...');

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    function initApp() {
        console.log('App: DOM ready, initializing...');

        // Check dependencies
        if (!window.API) {
            console.error('App: API not loaded!');
            return;
        }
        if (!window.ThreeScene) {
            console.error('App: ThreeScene not loaded!');
            return;
        }
        if (!window.THREE) {
            console.error('App: Three.js not loaded!');
            return;
        }

        // Get DOM elements
        const elements = {
            prompt: document.getElementById('prompt'),
            genBtn: document.getElementById('gen-btn'),
            btnText: document.getElementById('btn-text'),
            btnLoading: document.getElementById('btn-loading'),
            refineField: document.getElementById('refine-field'),
            refineInput: document.getElementById('refine'),
            refineBtn: document.getElementById('refine-btn'),
            placeholder: document.getElementById('placeholder'),
            downloads: document.getElementById('downloads'),
            dlGlb: document.getElementById('dl-glb'),
            dlObj: document.getElementById('dl-obj'),
            toast: document.getElementById('toast'),
            toastText: document.getElementById('toast-text'),
            newBtn: document.getElementById('new-btn'),
            resetBtn: document.getElementById('reset-btn'),
            wireBtn: document.getElementById('wire-btn'),
            gridBtn: document.getElementById('grid-btn'),
            canvas: document.getElementById('canvas'),
            tags: document.querySelectorAll('.tag')
        };

        // Validate required elements
        const required = ['prompt', 'genBtn', 'canvas'];
        for (let key of required) {
            if (!elements[key]) {
                console.error(`App: Required element '${key}' not found!`);
                return;
            }
        }

        // State
        let modelData = null;

        // Initialize 3D scene
        const sceneInitialized = window.ThreeScene.init(elements.canvas);
        if (!sceneInitialized) {
            console.error('App: Failed to initialize 3D scene');
            showToast('Failed to initialize 3D viewer');
            return;
        }

        // Check backend
        window.API.checkHealth()
            .then(() => {
                console.log('App: Backend connected');
            })
            .catch((err) => {
                console.warn('App: Backend not available', err);
                showToast('Backend not available - offline mode');
            });

        // Event Listeners

        // Tags/Presets
        elements.tags.forEach(tag => {
            tag.addEventListener('click', () => {
                elements.prompt.value = tag.dataset.p;
                elements.prompt.focus();
            });
        });

        // Generate button
        elements.genBtn.addEventListener('click', handleGenerate);

        // Enter to generate
        elements.prompt.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
            }
        });

        // Refine button
        if (elements.refineBtn) {
            elements.refineBtn.addEventListener('click', handleRefine);
        }

        // Enter to refine
        if (elements.refineInput) {
            elements.refineInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRefine();
                }
            });
        }

        // New/Clear button
        if (elements.newBtn) {
            elements.newBtn.addEventListener('click', handleReset);
        }

        // Viewer controls
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', () => {
                window.ThreeScene.resetCamera();
            });
        }

        if (elements.wireBtn) {
            elements.wireBtn.addEventListener('click', () => {
                const active = window.ThreeScene.toggleWireframe();
                elements.wireBtn.classList.toggle('active', active);
            });
        }

        if (elements.gridBtn) {
            elements.gridBtn.addEventListener('click', () => {
                const active = window.ThreeScene.toggleGrid();
                elements.gridBtn.classList.toggle('active', active);
            });
        }

        // Download buttons
        if (elements.dlGlb) {
            elements.dlGlb.addEventListener('click', () => {
                if (modelData?.glb) {
                    try {
                        window.API.downloadFile(modelData.glb, 'lumina-model.glb', 'model/gltf-binary');
                        showToast('GLB downloaded successfully!');
                    } catch (err) {
                        showToast('Download failed: ' + err.message);
                    }
                }
            });
        }

        if (elements.dlObj) {
            elements.dlObj.addEventListener('click', () => {
                if (modelData?.obj) {
                    try {
                        window.API.downloadFile(modelData.obj, 'lumina-model.obj', 'text/plain');
                        showToast('OBJ downloaded successfully!');
                    } catch (err) {
                        showToast('Download failed: ' + err.message);
                    }
                }
            });
        }

        // Functions

        async function handleGenerate() {
            const prompt = elements.prompt.value.trim();
            
            if (!prompt) {
                showToast('Please enter a prompt');
                return;
            }

            setLoading(true);

            try {
                console.log('App: Generating model...');
                const result = await window.API.generate(prompt, false);

                if (result.success) {
                    modelData = {
                        glb: result.model_glb,
                        obj: result.model_obj
                    };

                    await window.ThreeScene.loadModel(result.model_glb);

                    // Update UI
                    if (elements.placeholder) elements.placeholder.classList.add('hide');
                    if (elements.refineField) elements.refineField.classList.add('show');
                    if (elements.downloads) elements.downloads.classList.add('show');
                    if (elements.dlGlb) elements.dlGlb.disabled = false;
                    if (elements.dlObj) elements.dlObj.disabled = false;

                    showToast('✓ Model generated successfully!');
                } else {
                    showToast('Generation failed: ' + (result.message || 'Unknown error'));
                }
            } catch (err) {
                console.error('App: Generation error', err);
                showToast('Error: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        async function handleRefine() {
            const prompt = elements.refineInput.value.trim();
            
            if (!prompt) {
                showToast('Enter refinement instructions');
                return;
            }

            try {
                console.log('App: Refining model...');
                const result = await window.API.generate(prompt, true);

                if (result.success) {
                    modelData = {
                        glb: result.model_glb,
                        obj: result.model_obj
                    };

                    await window.ThreeScene.loadModel(result.model_glb);
                    elements.refineInput.value = '';

                    showToast('✓ Model refined!');
                } else {
                    showToast('Refinement failed: ' + (result.message || 'Unknown error'));
                }
            } catch (err) {
                console.error('App: Refinement error', err);
                showToast('Error: ' + err.message);
            }
        }

        function handleReset() {
            console.log('App: Resetting...');
            
            elements.prompt.value = '';
            if (elements.refineInput) elements.refineInput.value = '';
            
            modelData = null;

            if (elements.placeholder) elements.placeholder.classList.remove('hide');
            if (elements.refineField) elements.refineField.classList.remove('show');
            if (elements.downloads) elements.downloads.classList.remove('show');
            if (elements.dlGlb) elements.dlGlb.disabled = true;
            if (elements.dlObj) elements.dlObj.disabled = true;

            window.ThreeScene.clearModel();
            window.API.resetSession();

            showToast('Canvas cleared');
        }

        function setLoading(loading) {
            if (!elements.genBtn) return;

            elements.genBtn.disabled = loading;
            
            if (elements.btnText && elements.btnLoading) {
                if (loading) {
                    elements.btnText.style.display = 'none';
                    elements.btnLoading.style.display = 'inline';
                } else {
                    elements.btnText.style.display = 'inline';
                    elements.btnLoading.style.display = 'none';
                }
            } else {
                elements.genBtn.textContent = loading ? 'Generating...' : 'Generate Model';
            }
        }

        function showToast(message) {
            if (!elements.toast || !elements.toastText) return;

            elements.toastText.textContent = message;
            elements.toast.classList.add('show');

            setTimeout(() => {
                elements.toast.classList.remove('show');
            }, 3000);
        }

        console.log('✓ App initialized successfully');
    }
})();
