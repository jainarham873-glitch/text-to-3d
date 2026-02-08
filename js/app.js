/**
 * Main Application Controller
 * Handles chat interface and 3D model generation
 */

class App {
    constructor() {
        this.scene = null;
        this.currentModelData = null;
        this.hasGeneratedModel = false;
        this.messageCount = 0;
        
        this.initElements();
        this.initEventListeners();
        this.initScene();
        this.checkBackend();
    }

    initElements() {
        // Chat elements
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        
        // Viewer elements
        this.viewerPanel = document.getElementById('viewer-panel');
        this.viewerEmpty = document.getElementById('viewer-empty');
        
        // Buttons
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.toggleWireframeBtn = document.getElementById('toggle-wireframe');
        this.toggleGridBtn = document.getElementById('toggle-grid');
        this.resetCameraBtn = document.getElementById('reset-camera');
        this.closeViewerBtn = document.getElementById('close-viewer');
        this.downloadGlbBtn = document.getElementById('download-glb');
        this.downloadObjBtn = document.getElementById('download-obj');
        
        // Quick prompts
        this.quickPrompts = document.querySelectorAll('.quick-prompt');
        
        // Loading & Toast
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
    }

    initEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Enable/disable send button
        this.chatInput.addEventListener('input', () => {
            this.sendBtn.disabled = !this.chatInput.value.trim();
            this.autoResizeTextarea();
        });
        
        // New chat
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        
        // Viewer controls
        this.toggleWireframeBtn.addEventListener('click', () => {
            if (this.scene) {
                const isWireframe = this.scene.toggleWireframe();
                this.toggleWireframeBtn.classList.toggle('active', isWireframe);
            }
        });
        
        this.toggleGridBtn.addEventListener('click', () => {
            if (this.scene) {
                const showGrid = this.scene.toggleGrid();
                this.toggleGridBtn.classList.toggle('active', showGrid);
            }
        });
        
        this.resetCameraBtn.addEventListener('click', () => {
            if (this.scene) {
                this.scene.resetCamera();
            }
        });
        
        this.closeViewerBtn.addEventListener('click', () => {
            this.viewerPanel.classList.remove('open');
        });
        
        // Downloads
        this.downloadGlbBtn.addEventListener('click', () => this.downloadModel('glb'));
        this.downloadObjBtn.addEventListener('click', () => this.downloadModel('obj'));
        
        // Quick prompts
        this.quickPrompts.forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                this.chatInput.value = prompt;
                this.sendBtn.disabled = false;
                this.chatInput.focus();
            });
        });
    }

    initScene() {
        // Initialize Three.js scene after a small delay to ensure DOM is ready
        setTimeout(() => {
            this.scene = new ThreeScene('three-canvas');
        }, 100);
    }

    async checkBackend() {
        try {
            await apiClient.healthCheck();
            console.log('Backend connected successfully');
        } catch (error) {
            console.error('Backend not available:', error);
            this.showToast('Backend not connected. Please check if the server is running.', 'error');
        }
    }

    autoResizeTextarea() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 150) + 'px';
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        this.chatInput.value = '';
        this.sendBtn.disabled = true;
        this.chatInput.style.height = 'auto';
        
        // Show typing indicator
        const typingId = this.showTypingIndicator();
        
        try {
            // Call API
            let result;
            if (this.hasGeneratedModel) {
                result = await apiClient.refine(message);
            } else {
                result = await apiClient.generate(message);
            }
            
            // Remove typing indicator
            this.removeTypingIndicator(typingId);
            
            if (result.success) {
                // Store model data
                this.currentModelData = {
                    glb: result.model_glb,
                    obj: result.model_obj,
                    params: result.model_params
                };
                
                this.hasGeneratedModel = true;
                
                // Add AI response with model preview
                this.addModelResponse(result);
                
                // Load model in viewer
                if (this.scene && result.model_glb) {
                    await this.scene.loadGLB(result.model_glb);
                    this.viewerEmpty.classList.add('hidden');
                    this.enableDownloads();
                }
            } else {
                this.addMessage(`Sorry, I couldn't generate that model. ${result.message}`, 'ai');
            }
        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.addMessage(`Oops! Something went wrong: ${error.message}`, 'ai');
            this.showToast('Failed to generate model', 'error');
        }
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.id = `message-${++this.messageCount}`;
        
        if (type === 'user') {
            messageDiv.innerHTML = `
                <div class="message-avatar">U</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-name">You</span>
                    </div>
                    <div class="message-text">${this.escapeHtml(text)}</div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-name">3D AI Generator</span>
                    </div>
                    <div class="message-text"><p>${text}</p></div>
                </div>
            `;
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv.id;
    }

    addModelResponse(result) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.id = `message-${++this.messageCount}`;
        
        const objectCount = result.model_params?.objects?.length || 1;
        const shapes = result.model_params?.objects?.map(o => o.type).join(', ') || 'model';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">3D AI Generator</span>
                </div>
                <div class="message-text">
                    <p>✨ I've created your 3D model!</p>
                </div>
                <div class="message-model-preview">
                    <div class="model-preview-header">
                        <h4>🎨 Generated Model</h4>
                        <button class="view-3d-btn" onclick="app.openViewer()">View in 3D</button>
                    </div>
                    <div class="model-preview-info">
                        <p><strong>Objects:</strong> ${objectCount} (${shapes})</p>
                        <p><span class="interpretation-badge">🧠 ${result.interpretation || 'Model generated successfully'}</span></p>
                    </div>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const id = `typing-${Date.now()}`;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message';
        typingDiv.id = id;
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
        
        return id;
    }

    removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    openViewer() {
        this.viewerPanel.classList.add('open');
        if (this.scene) {
            setTimeout(() => this.scene.onResize(), 300);
        }
    }

    enableDownloads() {
        this.downloadGlbBtn.disabled = false;
        this.downloadObjBtn.disabled = false;
    }

    disableDownloads() {
        this.downloadGlbBtn.disabled = true;
        this.downloadObjBtn.disabled = true;
    }

    downloadModel(format) {
        if (!this.currentModelData) {
            this.showToast('No model to download', 'error');
            return;
        }
        
        const timestamp = new Date().toISOString().slice(0, 10);
        
        if (format === 'glb' && this.currentModelData.glb) {
            apiClient.downloadModel(
                this.currentModelData.glb,
                `model_${timestamp}.glb`,
                'model/gltf-binary'
            );
            this.showToast('GLB file downloaded!', 'success');
        } else if (format === 'obj' && this.currentModelData.obj) {
            apiClient.downloadModel(
                this.currentModelData.obj,
                `model_${timestamp}.obj`,
                'text/plain'
            );
            this.showToast('OBJ file downloaded!', 'success');
        }
    }

    startNewChat() {
        // Clear chat messages except welcome
        const messages = this.chatMessages.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) msg.remove();
        });
        
        // Reset state
        this.hasGeneratedModel = false;
        this.currentModelData = null;
        this.messageCount = 0;
        
        // Clear 3D viewer
        if (this.scene) {
            this.scene.clearModel();
        }
        this.viewerEmpty.classList.remove('hidden');
        this.disableDownloads();
        
        // Close viewer panel
        this.viewerPanel.classList.remove('open');
        
        // Create new session
        apiClient.newSession();
        
        this.showToast('Started new chat', 'success');
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        this.toastMessage.textContent = message;
        this.toast.className = 'toast visible';
        
        if (type === 'success') {
            this.toast.classList.add('success');
        } else if (type === 'error') {
            this.toast.classList.add('error');
        }
        
        setTimeout(() => {
            this.toast.classList.remove('visible');
        }, 3000);
    }

    showLoading() {
        this.loadingOverlay.classList.add('visible');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('visible');
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});