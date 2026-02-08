// API Client
(function() {
    'use strict';
    
    window.API = {
        baseUrl: (function() {
            const h = window.location.hostname;
            if (h === 'localhost' || h === '127.0.0.1') {
                return 'http://localhost:7860';
            }
            return 'https://jainarham-text-to-3d.hf.space';
        })(),

        sessionId: (function() {
            let id = localStorage.getItem('lumina_sid');
            if (!id) {
                id = 'sid_' + Math.random().toString(36).substr(2, 12);
                localStorage.setItem('lumina_sid', id);
            }
            return id;
        })(),

        generate: async function(prompt, isRefinement) {
            console.log('[API] Generating:', prompt, 'Refine:', isRefinement);
            
            try {
                const response = await fetch(this.baseUrl + '/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt,
                        session_id: this.sessionId,
                        is_refinement: isRefinement === true
                    })
                });

                if (!response.ok) {
                    throw new Error('Server returned ' + response.status);
                }

                const data = await response.json();
                console.log('[API] Response:', data.success ? 'OK' : 'FAIL');
                return data;
                
            } catch (err) {
                console.error('[API] Error:', err);
                throw err;
            }
        },

        checkHealth: async function() {
            try {
                const res = await fetch(this.baseUrl + '/health');
                return await res.json();
            } catch (err) {
                console.error('[API] Health check failed');
                throw err;
            }
        },

        download: function(base64Data, filename, mimeType) {
            try {
                const binary = atob(base64Data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
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
                console.log('[API] Downloaded:', filename);
            } catch (err) {
                console.error('[API] Download failed:', err);
            }
        },

        resetSession: function() {
            this.sessionId = 'sid_' + Math.random().toString(36).substr(2, 12);
            localStorage.setItem('lumina_sid', this.sessionId);
            console.log('[API] Session reset');
        }
    };

    console.log('[API] Loaded. Base:', window.API.baseUrl);
})();
