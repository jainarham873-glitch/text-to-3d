// API Client - Must load FIRST
(function() {
    'use strict';
    
    const API = {
        baseUrl: (function() {
            const host = window.location.hostname;
            if (host === 'localhost' || host === '127.0.0.1') {
                return 'http://localhost:7860';
            }
            return 'https://jainarham-text-to-3d.hf.space';
        })(),

        sessionId: (function() {
            let id = localStorage.getItem('lumina_session');
            if (!id) {
                id = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
                localStorage.setItem('lumina_session', id);
            }
            return id;
        })(),

        async generate(prompt, isRefinement = false) {
            console.log('API: Generating with prompt:', prompt);
            
            const response = await fetch(this.baseUrl + '/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    session_id: this.sessionId,
                    is_refinement: isRefinement
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API: Response received', data.success ? 'SUCCESS' : 'FAILED');
            return data;
        },

        async checkHealth() {
            try {
                const response = await fetch(this.baseUrl + '/health');
                const data = await response.json();
                console.log('API: Backend health:', data);
                return data;
            } catch (err) {
                console.error('API: Health check failed', err);
                throw err;
            }
        },

        downloadFile(base64Data, filename, mimeType) {
            console.log('API: Downloading', filename);
            
            try {
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                const blob = new Blob([bytes], { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                URL.revokeObjectURL(url);
                console.log('API: Download complete');
            } catch (err) {
                console.error('API: Download failed', err);
                throw err;
            }
        },

        resetSession() {
            this.sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
            localStorage.setItem('lumina_session', this.sessionId);
            console.log('API: Session reset');
        }
    };

    window.API = API;
    console.log('✓ API Client loaded');
})();
