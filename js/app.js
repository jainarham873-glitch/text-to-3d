// Main Application with 360° Auto Rotate Support
(function() {
    'use strict';

    console.log('App: Starting...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    function initApp() {
        console.log('App: DOM ready');

        // Check dependencies
        if (!window.API) {
            console.error('App: API not loaded!');
            return;
        }
        if (!window.ThreeScene) {
            console.error('App: ThreeScene not loaded!');
            return;
        }

        // Get elements
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
            rotateBtn: document.getElementById('rotate-btn'),
            speedControl: document.getElementById('speed-control'),
            speedSlider: document.getElementById('speed-slider'),
            canvas: document.getElementById('canvas'),
            tags: document.querySelectorAll('.tag')
        };

        // Validate
        if (!elements.prompt || !elements.genBtn || !elements.canvas) {
            console.error('App: Required elements missing!');
            return;
        }

        let modelData = null;

        // Init 3D
        if (!window.ThreeScene.init(elements.canvas)) {
            showToast('Failed to initialize 3D viewer');
            return;
        }

        // Check backend
        window.API.checkHealth()
            .then(() => console.log('App: Backend connected'))
            .catch(() => showToast('Backend offline'));

        // --- Event Listeners ---

        // Tags
        elements.tags.forEach(tag => {
            tag.addEventListener('click', () => {
                elements.prompt.value = tag.dataset.p;
                elements.prompt.focus();
            });
        });

        // Generate
        elements.genBtn.addEventListener('click', handleGenerate);
        elements.prompt.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
            }
        });

        // Refine
        if (elements.refineBtn) {
            elements.refineBtn.addEventListener('click', handleRefine);
        }
        if (elements.refineInput) {
            elements.refineInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRefine();
                }
            });
        }

        // New/Reset
        if (elements.newBtn) {
            elements.newBtn.addEventListener('click', handleReset);
        }

        // Camera Reset
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', () => {
                window.ThreeScene.resetCamera();
                showToast('View reset');
            });
        }

        // Wireframe
        if (elements.wireBtn) {
            elements.wireBtn.addEventListener('click', () => {
                const active = window.ThreeScene.toggleWireframe();
                elements.wireBtn.classList.toggle('active', active);
                showToast(active ? 'Wireframe ON' : 'Wireframe OFF');
            });
        }

        // Grid
        if (elements.gridBtn) {
            elements.gridBtn.addEventListener('click', () => {
                const active = window.ThreeScene.toggleGrid();
                elements.gridBtn.classList.toggle('active', active);
            });
        }

        // 360° Auto Rotate
        if (elements.rotateBtn) {
            elements.rotateBtn.addEventListener('click', () => {
                const active = window.ThreeScene.toggleAutoRotate();
                elements.rotateBtn.classList.toggle('active', active);
                
                // Show/hide speed control
                if (elements.speedControl) {
                    elements.speedControl.style.display = active ? 'flex' : 'none';
                }
                
                showToast(active ? '360° Rotate ON' : '360° Rotate OFF');
            });
        }

        // Speed slider
        if (elements.speedSlider) {
            elements.speedSlider.addEventListener('input', (e) => {
                window.ThreeScene.setRotationSpeed(parseInt(e.target.value));
            });
        }

        // Downloads
        if (elements.dlGlb) {
            elements.dlGlb.addEventListener('click', () => {
                if (modelData?.glb) {
                    window.API.downloadFile(modelData.glb, 'lumina-model.glb', 'model/gltf-binary');
                    showToast('GLB downloaded!');
                }
            });
        }

        if (elements.dlObj) {
            elements.dlObj.addEventListener('click', () => {
                if (modelData?.obj) {
                    window.API.downloadFile(modelData.obj, 'lumina-model.obj', 'text/plain');
                    showToast('OBJ downloaded!');
                }
            });
        }

        // --- Functions ---

        async function handleGenerate() {
            const prompt = elements.prompt.value.trim();
            
            if (!prompt) {
                showToast('Please enter a prompt');
                return;
            }

            setLoading(true);

            try {
                const result = await window.API.generate(prompt, false);

                if (result.success) {
                    modelData = {
                        glb: result.model_glb,
                        obj: result.model_obj
                    };

                    await window.ThreeScene.loadModel(result.model_glb);

                    if (elements.placeholder) elements.placeholder.classList.add('hide');
                    if (elements.refineField) elements.refineField.classList.add('show');
                    if (elements.downloads) elements.downloads.classList.add('show');
                    if (elements.dlGlb) elements.dlGlb.disabled = false;
                    if (elements.dlObj) elements.dlObj.disabled = false;

                    const objCount = result.model_params?.objects?.length || 1;
                    showToast(`✓ Generated ${objCount} object(s)!`);
                } else {
                    showToast('Failed: ' + (result.message || 'Unknown error'));
                }
            } catch (err) {
                console.error('Generate error:', err);
                showToast('Error: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        async function handleRefine() {
            const prompt = elements.refineInput?.value.trim();
            
            if (!prompt) {
                showToast('Enter refinement details');
                return;
            }

            try {
                const result = await window.API.generate(prompt, true);

                if (result.success) {
                    modelData = {
                        glb: result.model_glb,
                        obj: result.model_obj
                    };

                    await window.ThreeScene.loadModel(result.model_glb);
                    if (elements.refineInput) elements.refineInput.value = '';

                    showToast('✓ Model updated!');
                } else {
                    showToast('Refinement failed');
                }
            } catch (err) {
                showToast('Error: ' + err.message);
            }
        }

        function handleReset() {
            elements.prompt.value = '';
            if (elements.refineInput) elements.refineInput.value = '';
            modelData = null;

            if (elements.placeholder) elements.placeholder.classList.remove('hide');
            if (elements.refineField) elements.refineField.classList.remove('show');
            if (elements.downloads) elements.downloads.classList.remove('show');
            if (elements.dlGlb) elements.dlGlb.disabled = true;
            if (elements.dlObj) elements.dlObj.disabled = true;

            // Turn off auto-rotate
            if (window.ThreeScene.isAutoRotating()) {
                window.ThreeScene.toggleAutoRotate();
                if (elements.rotateBtn) elements.rotateBtn.classList.remove('active');
                if (elements.speedControl) elements.speedControl.style.display = 'none';
            }

            window.ThreeScene.clearModel();
            window.API.resetSession();

            showToast('Canvas cleared');
        }

        function setLoading(loading) {
            if (!elements.genBtn) return;

            elements.genBtn.disabled = loading;
            
            if (elements.btnText && elements.btnLoading) {
                elements.btnText.style.display = loading ? 'none' : 'inline';
                elements.btnLoading.style.display = loading ? 'inline' : 'none';
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

        console.log('✓ App initialized');
    }
})();
