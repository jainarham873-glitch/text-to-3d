console.log('app.js loading...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');

    // Get elements
    const prompt = document.getElementById('prompt');
    const genBtn = document.getElementById('gen-btn');
    const refineField = document.getElementById('refine-field');
    const refineInput = document.getElementById('refine');
    const refineBtn = document.getElementById('refine-btn');
    const placeholder = document.getElementById('placeholder');
    const downloads = document.getElementById('downloads');
    const dlGlb = document.getElementById('dl-glb');
    const dlObj = document.getElementById('dl-obj');
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    const newBtn = document.getElementById('new-btn');
    const resetBtn = document.getElementById('reset-btn');
    const wireBtn = document.getElementById('wire-btn');
    const gridBtn = document.getElementById('grid-btn');
    const tags = document.querySelectorAll('.tag');

    // Check if elements exist
    if (!prompt || !genBtn) {
        console.error('Required elements not found!');
        return;
    }

    let modelData = null;

    // Initialize Three.js scene
    const canvas = document.getElementById('canvas');
    if (canvas && window.initScene) {
        window.initScene(canvas);
    } else {
        console.error('Canvas or initScene not found');
    }

    // Check backend connection
    if (window.api) {
        window.api.health()
            .then(() => console.log('Backend connected'))
            .catch(() => showToast('Cannot connect to server'));
    }

    // Tag presets click
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            prompt.value = tag.dataset.p;
            prompt.focus();
        });
    });

    // Generate button
    genBtn.addEventListener('click', generate);

    // Enter key to generate
    prompt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generate();
        }
    });

    // Refine button
    if (refineBtn) {
        refineBtn.addEventListener('click', refine);
    }

    // Enter key to refine
    if (refineInput) {
        refineInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                refine();
            }
        });
    }

    // New/Clear button
    if (newBtn) {
        newBtn.addEventListener('click', resetAll);
    }

    // Viewer controls
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.resetCamera) window.resetCamera();
        });
    }

    if (wireBtn) {
        wireBtn.addEventListener('click', () => {
            if (window.toggleWire) {
                const active = window.toggleWire();
                wireBtn.classList.toggle('active', active);
            }
        });
    }

    if (gridBtn) {
        gridBtn.addEventListener('click', () => {
            if (window.toggleGrid) {
                const active = window.toggleGrid();
                gridBtn.classList.toggle('active', active);
            }
        });
    }

    // Download buttons
    if (dlGlb) {
        dlGlb.addEventListener('click', () => {
            if (modelData?.glb && window.api) {
                window.api.download(modelData.glb, 'model.glb', 'model/gltf-binary');
                showToast('GLB downloaded!');
            }
        });
    }

    if (dlObj) {
        dlObj.addEventListener('click', () => {
            if (modelData?.obj && window.api) {
                window.api.download(modelData.obj, 'model.obj', 'text/plain');
                showToast('OBJ downloaded!');
            }
        });
    }

    // Generate function
    async function generate() {
        const text = prompt.value.trim();
        if (!text) {
            showToast('Please enter a prompt');
            return;
        }

        setLoading(true);

        try {
            const result = await window.api.generate(text, false);

            if (result.success) {
                modelData = {
                    glb: result.model_glb,
                    obj: result.model_obj
                };

                await window.loadModel(result.model_glb);

                if (placeholder) placeholder.classList.add('hide');
                if (refineField) refineField.classList.add('show');
                if (downloads) downloads.classList.add('show');
                if (dlGlb) dlGlb.disabled = false;
                if (dlObj) dlObj.disabled = false;

                showToast('Model generated successfully!');
            } else {
                showToast(result.message || 'Generation failed');
            }
        } catch (error) {
            showToast('Error: ' + error.message);
            console.error(error);
        }

        setLoading(false);
    }

    // Refine function
    async function refine() {
        const text = refineInput.value.trim();
        if (!text) {
            showToast('Enter refinement details');
            return;
        }

        try {
            const result = await window.api.generate(text, true);

            if (result.success) {
                modelData = {
                    glb: result.model_glb,
                    obj: result.model_obj
                };

                await window.loadModel(result.model_glb);
                refineInput.value = '';
                showToast('Model updated!');
            } else {
                showToast(result.message || 'Refinement failed');
            }
        } catch (error) {
            showToast('Error: ' + error.message);
            console.error(error);
        }
    }

    // Reset everything
    function resetAll() {
        prompt.value = '';
        if (refineInput) refineInput.value = '';
        modelData = null;

        if (placeholder) placeholder.classList.remove('hide');
        if (refineField) refineField.classList.remove('show');
        if (downloads) downloads.classList.remove('show');
        if (dlGlb) dlGlb.disabled = true;
        if (dlObj) dlObj.disabled = true;

        if (window.clearModel) window.clearModel();
        if (window.api) window.api.reset();
        showToast('Canvas cleared');
    }

    // Loading state
    function setLoading(loading) {
        if (!genBtn) return;
        
        genBtn.disabled = loading;
        if (loading) {
            genBtn.textContent = 'Generating...';
            genBtn.style.opacity = '0.7';
        } else {
            genBtn.textContent = 'Generate Model';
            genBtn.style.opacity = '1';
        }
    }

    // Toast notification
    function showToast(message) {
        if (!toast || !toastText) return;
        
        toastText.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    console.log('App initialized successfully');
});
