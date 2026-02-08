/**
 * API Client for Text-to-3D Backend
 * Handles all communication with the backend server
 */

class APIClient {
    constructor() {
        // UPDATE THIS URL with your Hugging Face Space URL
        this.baseUrl = this.getBaseUrl();
        this.sessionId = this.getOrCreateSessionId();
    }

    getBaseUrl() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:7860';
    } else {
        // ✅ UPDATE THIS WITH YOUR ACTUAL HUGGING FACE SPACE URL
        return 'https://jainarham-text-to-3d.hf.space';
    }
}

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('text3d_session_id');
        if (!sessionId) {
            sessionId = this.generateUUID();
            localStorage.setItem('text3d_session_id', sessionId);
        }
        return sessionId;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${error.message}`);
            throw error;
        }
    }

    async generate(prompt) {
        return this.request('/generate', {
            method: 'POST',
            body: JSON.stringify({
                prompt: prompt,
                session_id: this.sessionId,
                is_refinement: false
            })
        });
    }

    async refine(prompt) {
        return this.request('/refine', {
            method: 'POST',
            body: JSON.stringify({
                prompt: prompt,
                session_id: this.sessionId,
                is_refinement: true
            })
        });
    }

    async healthCheck() {
        return this.request('/health');
    }

    base64ToBlob(base64Data, mimeType) {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    downloadModel(base64Data, filename, mimeType) {
        const blob = this.base64ToBlob(base64Data, mimeType);
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    newSession() {
        this.sessionId = this.generateUUID();
        localStorage.setItem('text3d_session_id', this.sessionId);
        return this.sessionId;
    }

    getSessionId() {
        return this.sessionId;
    }
}

// Global instance
const apiClient = new APIClient();