document.addEventListener('DOMContentLoaded', () => {
    // Elements - matching YOUR new HTML IDs
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

    let modelData = null;

    // Initialize Three.js scene
    initScene(document.getElementById('canvas'));

    // Check backend connection
    api.health().then(() => {
        console.log('Backend connected');
    }).catch(() => {
        showToast('Cannot connect to server', true);
    });

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
    refineBtn.addEventListener('click', refine);

    // Enter key to refine
    refineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            refine();
        }
    });

    // New/Clear button
    newBtn.addEventListener('click', resetAll);

    // Viewer controls
    resetBtn.addEventListener('click', () => {
        resetCamera();
    });

    wireBtn.addEventListener('click', () => {
        const active = toggleWire();
        wireBtn.classList.toggle('active', active);
    });

    gridBtn.addEventListener('click', () => {
        const active = toggleGrid();
        gridBtn.classList.toggle('active', active);
    });

    // Download buttons
    dlGlb.addEventListener('click', () => {
        if (modelData?.glb) {
            api.download(modelData.glb, 'model.glb', 'model/gltf-binary');
            showToast('GLB downloaded!');
        }
    });

    dlObj.addEventListener('click', () => {
        if (modelData?.obj) {
            api.download(modelData.obj, 'model.obj', 'text/plain');
            showToast('OBJ downloaded!');
        }
    });

    // Generate function
    async function generate() {
        const text = prompt.value.trim();
        if (!text) {
            showToast('Please enter a prompt', true);
            return;
        }

        setLoading(true);

        try {
            const result = await api.generate(text, false);

            if (result.success) {
                modelData = {
                    glb: result.model_glb,
                    obj: result.model_obj
                };

                await loadModel(result.model_glb);

                placeholder.classList.add('hide');
                refineField.classList.add('show');
                downloads.classList.add('show');
                dlGlb.disabled = false;
                dlObj.disabled = false;

                showToast('Model generated successfully!');
            } else {
                showToast(result.message || 'Generation failed', true);
            }
        } catch (error) {
            showToast('Error: ' + error.message, true);
        }

        setLoading(false);
    }

    // Refine function
    async function refine() {
        const text = refineInput.value.trim();
        if (!text) {
            showToast('Enter refinement details', true);
            return;
        }

        try {
            const result = await api.generate(text, true);

            if (result.success) {
                modelData = {
                    glb: result.model_glb,
                    obj: result.model_obj
                };

                await loadModel(result.model_glb);
                refineInput.value = '';
                showToast('Model updated!');
            } else {
                showToast(result.message || 'Refinement failed', true);
            }
        } catch (error) {
            showToast('Error: ' + error.message, true);
        }
    }

    // Reset everything
    function resetAll() {
        prompt.value = '';
        refineInput.value = '';
        modelData = null;

        placeholder.classList.remove('hide');
        refineField.classList.remove('show');
        downloads.classList.remove('show');
        dlGlb.disabled = true;
        dlObj.disabled = true;

        clearModel();
        api.reset();
        showToast('Canvas cleared');
    }

    // Loading state
    function setLoading(loading) {
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
    function showToast(message, isError = false) {
        toastText.textContent = message;
        toast.style.borderColor = isError ? '#ef4444' : 'var(--accent)';
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
