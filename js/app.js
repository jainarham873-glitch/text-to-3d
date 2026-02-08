// Main App
(function() {
    'use strict';

    console.log('[App] Starting...');

    document.addEventListener('DOMContentLoaded', function() {
        console.log('[App] DOM ready');

        // Check dependencies
        if (!window.API) {
            console.error('[App] API missing!');
            return;
        }
        if (!window.Viewer) {
            console.error('[App] Viewer missing!');
            return;
        }

        // Elements
        const $ = (id) => document.getElementById(id);
        
        const prompt = $('prompt');
        const genBtn = $('gen-btn');
        const btnText = $('btn-text');
        const btnLoading = $('btn-loading');
        const refineSection = $('refine-section');
        const refineInput = $('refine-input');
        const refineBtn = $('refine-btn');
        const placeholder = $('placeholder');
        const downloadSection = $('download-section');
        const dlGlb = $('dl-glb');
        const dlObj = $('dl-obj');
        const toast = $('toast');
        const toastText = $('toast-text');
        const newBtn = $('new-btn');
        const resetViewBtn = $('reset-view-btn');
        const wireframeBtn = $('wireframe-btn');
        const gridBtn = $('grid-btn');
        const autoRotateBtn = $('auto-rotate-btn');
        const speedSliderContainer = $('speed-slider-container');
        const speedSlider = $('speed-slider');
        const speedValue = $('speed-value');
        const canvas = $('canvas');
        const tags = document.querySelectorAll('.tag');

        // Check required elements
        if (!prompt || !genBtn || !canvas) {
            console.error('[App] Missing required elements!');
            return;
        }

        let modelData = null;

        // Init 3D Viewer
        if (!window.Viewer.init(canvas)) {
            showToast('Failed to init 3D viewer', 'error');
            return;
        }

        // Check API
        window.API.checkHealth()
            .then(() => console.log('[App] API connected'))
            .catch(() => showToast('Server offline', 'error'));

        // --- EVENT LISTENERS ---

        // Tags/Presets
        tags.forEach(function(tag) {
            tag.addEventListener('click', function() {
                prompt.value = this.getAttribute('data-p');
                prompt.focus();
            });
        });

        // Generate Button
        genBtn.addEventListener('click', handleGenerate);

        // Enter to generate
        prompt.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
            }
        });

        // Refine Button
        if (refineBtn) {
            refineBtn.addEventListener('click', handleRefine);
        }

        // Enter to refine
        if (refineInput) {
            refineInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRefine();
                }
            });
        }

        // New/Clear Button
        if (newBtn) {
            newBtn.addEventListener('click', handleReset);
        }

        // Reset View Button
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', function() {
                window.Viewer.resetCamera();
                showToast('View reset');
            });
        }

        // Wireframe Button
        if (wireframeBtn) {
            wireframeBtn.addEventListener('click', function() {
                const active = window.Viewer.toggleWireframe();
                this.classList.toggle('active', active);
                showToast(active ? 'Wireframe ON' : 'Wireframe OFF');
            });
        }

        // Grid Button
        if (gridBtn) {
            gridBtn.addEventListener('click', function() {
                const active = window.Viewer.toggleGrid();
                this.classList.toggle('active', active);
            });
        }

        // 360° Auto Rotate Button
        if (autoRotateBtn) {
            autoRotateBtn.addEventListener('click', function() {
                console.log('[App] 360 button clicked');
                const active = window.Viewer.toggleAutoRotate();
                this.classList.toggle('active', active);
                
                // Show/hide speed slider
                if (speedSliderContainer) {
                    speedSliderContainer.classList.toggle('visible', active);
                }
                
                showToast(active ? '360° Rotate ON' : '360° Rotate OFF');
            });
        }

        // Speed Slider
        if (speedSlider) {
            speedSlider.addEventListener('input', function() {
                const val = parseInt(this.value);
                window.Viewer.setRotateSpeed(val);
                if (speedValue) speedValue.textContent = val;
            });
        }

        // Download GLB
        if (dlGlb) {
            dlGlb.addEventListener('click', function() {
                if (modelData && modelData.glb) {
                    window.API.download(modelData.glb, 'model.glb', 'model/gltf-binary');
                    showToast('GLB downloaded!', 'success');
                }
            });
        }

        // Download OBJ
        if (dlObj) {
            dlObj.addEventListener('click', function() {
                if (modelData && modelData.obj) {
                    window.API.download(modelData.obj, 'model.obj', 'text/plain');
                    showToast('OBJ downloaded!', 'success');
                }
            });
        }

        // --- FUNCTIONS ---

        async function handleGenerate() {
            const text = prompt.value.trim();
            
            if (!text) {
                showToast('Please enter a prompt', 'error');
                return;
            }

            setLoading(true);

            try {
                console.log('[App] Generating...');
                const result = await window.API.generate(text, false);

                if (result.success) {
                    modelData = {
                        glb: result.model_glb,
                        obj: result.model_obj
                    };

                    await window.Viewer.loadModel(result.model_glb);

                    // Show UI elements
                    if (placeholder) placeholder.classList.add('hidden');
                    if (refineSection) refineSection.classList.add('visible');
                    if (downloadSection) downloadSection.classList.add('visible');
                    if (dlGlb) dlGlb.disabled = false;
                    if (dlObj) dlObj.disabled = false;

                    const count = result.model_params?.objects?.length || 1;
                    showToast('Generated ' + count + ' object(s)!', 'success');
                } else {
                    showToast(result.message || 'Generation failed', 'error');
                }
            } catch (err) {
                console.error('[App] Generate error:', err);
                showToast('Error: ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        }

        async function handleRefine() {
            const text = refineInput ? refineInput.value.trim() : '';
            
            if (!text) {
                showToast('Enter refinement instructions', 'error');
                return;
            }

            // Disable button during refinement
            if (refineBtn) refineBtn.disabled = true;

            try {
                console.log('[App] Refining...');
                const result = await window.API.generate(text, true);

                if (result.success) {
                    modelData = {
                        glb: result.model_glb,
                        obj: result.model_obj
                    };

                    await window.Viewer.loadModel(result.model_glb);
                    
                    if (refineInput) refineInput.value = '';
                    showToast('Model updated!', 'success');
                } else {
                    showToast(result.message || 'Refinement failed', 'error');
                }
            } catch (err) {
                console.error('[App] Refine error:', err);
                showToast('Error: ' + err.message, 'error');
            } finally {
                if (refineBtn) refineBtn.disabled = false;
            }
        }

        function handleReset() {
            prompt.value = '';
            if (refineInput) refineInput.value = '';
            modelData = null;

            if (placeholder) placeholder.classList.remove('hidden');
            if (refineSection) refineSection.classList.remove('visible');
            if (downloadSection) downloadSection.classList.remove('visible');
            if (dlGlb) dlGlb.disabled = true;
            if (dlObj) dlObj.disabled = true;

            // Stop auto-rotate
            if (window.Viewer.isRotating()) {
                window.Viewer.toggleAutoRotate();
                if (autoRotateBtn) autoRotateBtn.classList.remove('active');
                if (speedSliderContainer) speedSliderContainer.classList.remove('visible');
            }

            window.Viewer.clearModel();
            window.API.resetSession();

            showToast('Canvas cleared');
        }

        function setLoading(loading) {
            if (genBtn) genBtn.disabled = loading;
            if (genBtn) genBtn.classList.toggle('loading', loading);
        }

        function showToast(message, type) {
            if (!toast || !toastText) return;

            toastText.textContent = message;
            
            toast.classList.remove('visible', 'success', 'error');
            
            if (type === 'success') toast.classList.add('success');
            if (type === 'error') toast.classList.add('error');
            
            // Force reflow
            toast.offsetHeight;
            
            toast.classList.add('visible');

            setTimeout(function() {
                toast.classList.remove('visible');
            }, 3000);
        }

        console.log('[App] Ready!');
    });
})();
