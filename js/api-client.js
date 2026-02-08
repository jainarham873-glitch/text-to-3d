const api = {
    base: (() => {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:7860';
        }
        return 'https://jainarham-text-to-3d.hf.space';
    })(),

    sid: localStorage.getItem('sid') || (() => {
        const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('sid', id);
        return id;
    })(),

    async generate(prompt, isRefine = false) {
        const res = await fetch(`${this.base}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                session_id: this.sid,
                is_refinement: isRefine
            })
        });

        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }

        return res.json();
    },

    async health() {
        const res = await fetch(`${this.base}/health`);
        return res.json();
    },

    download(base64, filename, mimeType) {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: mimeType });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download failed:', e);
        }
    },

    reset() {
        this.sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('sid', this.sid);
    }
};
