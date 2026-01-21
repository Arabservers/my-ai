const GEMINI_API_KEY = 'AIzaSyDO1X1l9v6D6X-RLNfMkQawhETv2mNNVTc';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص في البرمجة وتطوير المواقع اسمك TurkiBot. يمكنك:
1. إنشاء مواقع ويب كاملة باستخدام HTML, CSS, JavaScript
2. كتابة وتحسين الأكواد البرمجية
3. شرح المفاهيم البرمجية
4. حل المشاكل التقنية

عند إنشاء موقع أو كود:
- قم بتضمين الكود كاملاً داخل code blocks مع تحديد اللغة (html, css, javascript)
- اجعل التصاميم عصرية وجميلة باستخدام CSS متقدم
- استخدم ألوان جذابة وتأثيرات حديثة
- اجعل التصميم متجاوب مع جميع الشاشات

رد باللغة العربية دائماً إلا إذا طُلب منك غير ذلك.`;

const STORAGE_KEYS = {
    CHATS: 'turkibot_chats',
    CURRENT_CHAT: 'turkibot_current_chat',
    THEME: 'turkibot_theme',
    SETTINGS: 'turkibot_settings'
};

class ChatApp {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.progressBar = document.getElementById('progressBar');
        this.chatHistory = document.getElementById('chatHistory');
        this.codePreview = new CodePreview();
        this.conversationHistory = [];
        this.isLoading = false;
        this.chats = {};
        this.currentChatId = null;
        this.attachedFiles = [];
        this.init();
    }

    init() {
        this.loadTheme();
        this.loadChats();
        this.setupEventListeners();
        this.renderChatHistory();
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
            this.sendBtn.disabled = !this.messageInput.value.trim() && this.attachedFiles.length === 0;
        });

        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                this.messageInput.value = card.dataset.prompt;
                this.messageInput.dispatchEvent(new Event('input'));
                this.sendMessage();
            });
        });

        document.getElementById('newChatBtn')?.addEventListener('click', () => this.newChat());
        document.getElementById('clearChatBtn')?.addEventListener('click', () => this.clearCurrentChat());
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportChat());

        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        menuToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
            sidebarOverlay?.classList.toggle('active');
        });

        sidebarOverlay?.addEventListener('click', () => {
            sidebar?.classList.remove('open');
            sidebarOverlay?.classList.remove('active');
        });

        const attachBtn = document.getElementById('attachBtn');
        const fileInput = document.getElementById('fileInput');

        attachBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => this.handleFileUpload(e));

        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        });
    }

    handleSwipe(startX, endX) {
        const threshold = 100;
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (startX < 50 && endX - startX > threshold) {
            sidebar?.classList.add('open');
            sidebarOverlay?.classList.add('active');
        } else if (endX - startX < -threshold && sidebar?.classList.contains('open')) {
            sidebar?.classList.remove('open');
            sidebarOverlay?.classList.remove('active');
        }
    }

    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        const filePreview = document.getElementById('filePreview');

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('حجم الملف كبير جداً (الحد الأقصى 5MB)', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    data: event.target.result
                };
                this.attachedFiles.push(fileData);
                this.renderFilePreview();
            };

            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });

        e.target.value = '';
    }

    renderFilePreview() {
        const filePreview = document.getElementById('filePreview');
        if (!filePreview) return;

        if (this.attachedFiles.length === 0) {
            filePreview.classList.remove('active');
            filePreview.innerHTML = '';
            return;
        }

        filePreview.classList.add('active');
        filePreview.innerHTML = this.attachedFiles.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            return `
                <div class="file-preview-item">
                    ${isImage ? `<img src="${file.data}" alt="${file.name}">` : `<i class="fas fa-file-code"></i>`}
                    <span>${file.name}</span>
                    <button class="remove-file" onclick="app.removeFile(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');

        this.sendBtn.disabled = false;
    }

    removeFile(index) {
        this.attachedFiles.splice(index, 1);
        this.renderFilePreview();
        if (this.attachedFiles.length === 0 && !this.messageInput.value.trim()) {
            this.sendBtn.disabled = true;
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            this.updateThemeButton(true);
        }
    }

    toggleTheme() {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem(STORAGE_KEYS.THEME, isLight ? 'light' : 'dark');
        this.updateThemeButton(isLight);
        this.showToast(isLight ? 'تم التبديل للوضع الفاتح' : 'تم التبديل للوضع الداكن', 'success');
    }

    updateThemeButton(isLight) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.innerHTML = isLight
                ? '<i class="fas fa-sun"></i><span>الوضع الداكن</span>'
                : '<i class="fas fa-moon"></i><span>الوضع الفاتح</span>';
        }
    }

    loadChats() {
        const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
        const currentChatId = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT);

        if (savedChats) {
            this.chats = JSON.parse(savedChats);
        }

        if (currentChatId && this.chats[currentChatId]) {
            this.currentChatId = currentChatId;
            this.conversationHistory = this.chats[currentChatId].messages || [];
            this.loadChatMessages();
        }
    }

    saveChats() {
        localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(this.chats));
        if (this.currentChatId) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT, this.currentChatId);
        }
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    renderChatHistory() {
        if (!this.chatHistory) return;

        const chatIds = Object.keys(this.chats).sort((a, b) => {
            return (this.chats[b].updatedAt || 0) - (this.chats[a].updatedAt || 0);
        });

        if (chatIds.length === 0) {
            this.chatHistory.innerHTML = '<div class="no-chats" style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد محادثات سابقة</div>';
            return;
        }

        this.chatHistory.innerHTML = chatIds.map(id => {
            const chat = this.chats[id];
            const isActive = id === this.currentChatId;
            return `
                <div class="history-item ${isActive ? 'active' : ''}" data-chat-id="${id}">
                    <i class="fas fa-message"></i>
                    <span>${chat.title || 'محادثة جديدة'}</span>
                    <button class="delete-chat" onclick="event.stopPropagation(); app.deleteChat('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        this.chatHistory.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                this.switchChat(chatId);
            });
        });
    }

    switchChat(chatId) {
        if (!this.chats[chatId]) return;

        this.currentChatId = chatId;
        this.conversationHistory = this.chats[chatId].messages || [];
        this.saveChats();
        this.loadChatMessages();
        this.renderChatHistory();

        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        sidebar?.classList.remove('open');
        sidebarOverlay?.classList.remove('active');
    }

    loadChatMessages() {
        this.hideWelcome();
        this.chatContainer.innerHTML = '';

        this.conversationHistory.forEach(msg => {
            const role = msg.role === 'model' ? 'assistant' : msg.role;
            const text = msg.parts?.[0]?.text || '';
            if (text) {
                this.addMessage(text, role, false);
            }
        });

        this.scrollToBottom();
    }

    deleteChat(chatId) {
        delete this.chats[chatId];

        if (this.currentChatId === chatId) {
            this.currentChatId = null;
            this.conversationHistory = [];
            this.chatContainer.innerHTML = '';
            if (this.welcomeScreen) {
                this.welcomeScreen.style.display = 'flex';
                this.chatContainer.appendChild(this.welcomeScreen);
            }
        }

        this.saveChats();
        this.renderChatHistory();
        this.showToast('تم حذف المحادثة', 'success');
    }

    clearCurrentChat() {
        if (!this.currentChatId) return;

        this.conversationHistory = [];
        this.chats[this.currentChatId].messages = [];
        this.chats[this.currentChatId].title = 'محادثة جديدة';
        this.saveChats();

        this.chatContainer.innerHTML = '';
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'flex';
            this.chatContainer.appendChild(this.welcomeScreen);
        }

        this.renderChatHistory();
        this.showToast('تم مسح المحادثة', 'success');
    }

    async sendMessage() {
        let message = this.messageInput.value.trim();
        if ((!message && this.attachedFiles.length === 0) || this.isLoading) return;

        if (!this.currentChatId) {
            this.currentChatId = this.generateChatId();
            this.chats[this.currentChatId] = {
                id: this.currentChatId,
                title: message.substring(0, 50) || 'محادثة جديدة',
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
        }

        this.hideWelcome();

        if (this.attachedFiles.length > 0) {
            const fileNames = this.attachedFiles.map(f => f.name).join(', ');
            message = message ? `${message}\n\nالملفات المرفقة: ${fileNames}` : `الملفات المرفقة: ${fileNames}`;

            this.attachedFiles.forEach(file => {
                if (!file.type.startsWith('image/')) {
                    message += `\n\nمحتوى ${file.name}:\n${file.data}`;
                }
            });
        }

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.sendBtn.disabled = true;
        this.attachedFiles = [];
        this.renderFilePreview();

        this.showProgress();
        this.showTyping();
        this.isLoading = true;

        try {
            const response = await this.callGeminiAPI(message);
            this.hideTyping();
            this.hideProgress();
            this.addMessage(response, 'assistant');
            this.codePreview.processResponse(response);

            this.chats[this.currentChatId].updatedAt = Date.now();
            this.saveChats();
            this.renderChatHistory();
        } catch (error) {
            this.hideTyping();
            this.hideProgress();
            this.addMessage('عذراً، حدث خطأ: ' + error.message, 'assistant');
            console.error('Error:', error);
        }

        this.isLoading = false;
    }

    async callGeminiAPI(message) {
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const requestBody = {
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: this.conversationHistory,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192
            }
        };

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'فشل الاتصال بالخادم');
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('لم يتم استلام رد من الذكاء الاصطناعي');
        }

        const aiResponse = data.candidates[0].content.parts[0].text;

        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: aiResponse }]
        });

        this.chats[this.currentChatId].messages = this.conversationHistory;
        this.saveChats();

        return aiResponse;
    }

    addMessage(content, role, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        if (!animate) messageDiv.style.animation = 'none';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.formatMessage(content);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(text) {
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'code';
            const escapedCode = this.escapeHtml(code);
            const attrCode = code.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#96;');
            return `<pre><div class="code-header"><span class="code-lang">${language}</span><div class="code-actions"><button onclick="app.copyToClipboard(this)"><i class="fas fa-copy"></i> نسخ</button><button onclick="app.previewCode(this)"><i class="fas fa-eye"></i> معاينة</button></div></div><code data-code="${attrCode}" data-lang="${language}">${escapedCode}</code></pre>`;
        });

        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/\n/g, '<br>');

        return text;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    copyToClipboard(btn) {
        const codeEl = btn.closest('pre').querySelector('code');
        const code = codeEl.dataset.code.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#96;/g, '`');
        navigator.clipboard.writeText(code).then(() => {
            this.showToast('تم نسخ الكود!', 'success');
        });
    }

    previewCode(btn) {
        const codeEl = btn.closest('pre').querySelector('code');
        const code = codeEl.dataset.code.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#96;/g, '`');
        const lang = codeEl.dataset.lang.toLowerCase();

        if (lang === 'html') {
            this.codePreview.currentCode.html = code;
        } else if (lang === 'css') {
            this.codePreview.currentCode.css = code;
        } else if (lang === 'javascript' || lang === 'js') {
            this.codePreview.currentCode.js = code;
        }

        this.codePreview.show();
        this.codePreview.updatePreview();
    }

    showProgress() {
        this.progressBar?.classList.add('active');
    }

    hideProgress() {
        this.progressBar?.classList.remove('active');
    }

    showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant';
        typingDiv.id = 'typingIndicator';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';

        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';

        typingDiv.appendChild(avatar);
        typingDiv.appendChild(typing);
        this.chatContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTyping() {
        document.getElementById('typingIndicator')?.remove();
    }

    hideWelcome() {
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    newChat() {
        this.currentChatId = null;
        this.conversationHistory = [];
        this.chatContainer.innerHTML = '';

        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'flex';
            this.chatContainer.appendChild(this.welcomeScreen);
        }

        this.codePreview.close();
        this.renderChatHistory();

        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        sidebar?.classList.remove('open');
        sidebarOverlay?.classList.remove('active');
    }

    exportChat() {
        if (!this.currentChatId || this.conversationHistory.length === 0) {
            this.showToast('لا توجد محادثة للتصدير', 'error');
            return;
        }

        const chat = this.chats[this.currentChatId];
        let content = `# ${chat.title}\n`;
        content += `تاريخ الإنشاء: ${new Date(chat.createdAt).toLocaleString('ar')}\n\n`;
        content += '---\n\n';

        this.conversationHistory.forEach(msg => {
            const role = msg.role === 'model' ? '🤖 TurkiBot' : '👤 أنت';
            const text = msg.parts?.[0]?.text || '';
            content += `## ${role}\n\n${text}\n\n---\n\n`;
        });

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chat.title || 'محادثة'}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('تم تصدير المحادثة بنجاح!', 'success');
    }

    showToast(message, type = 'success') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>${message}`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ChatApp();
    window.app = app;
});
