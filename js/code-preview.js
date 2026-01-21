class CodePreview {
    constructor() {
        this.panel = document.getElementById('previewPanel');
        this.codeView = document.getElementById('codeView');
        this.previewFrame = document.getElementById('previewFrame');
        this.tabs = document.querySelectorAll('.preview-tab');
        this.currentCode = { html: '', css: '', js: '' };
        this.init();
    }

    init() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        document.getElementById('copyCodeBtn')?.addEventListener('click', () => this.copyCode());
        document.getElementById('downloadCodeBtn')?.addEventListener('click', () => this.downloadCode());
        document.getElementById('closePreviewBtn')?.addEventListener('click', () => this.close());
    }

    extractCode(text) {
        const codeBlocks = [];
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            codeBlocks.push({
                language: (match[1] || 'text').toLowerCase(),
                code: match[2].trim()
            });
        }

        return codeBlocks;
    }

    processResponse(text) {
        const codeBlocks = this.extractCode(text);

        if (codeBlocks.length === 0) return false;

        codeBlocks.forEach(block => {
            if (block.language === 'html') {
                this.currentCode.html = block.code;
            } else if (block.language === 'css') {
                this.currentCode.css = block.code;
            } else if (block.language === 'javascript' || block.language === 'js') {
                this.currentCode.js = block.code;
            }
        });

        if (this.currentCode.html || this.currentCode.css || this.currentCode.js) {
            this.show();
            this.updatePreview();
            return true;
        }

        return false;
    }

    show() {
        this.panel.classList.add('active');
        document.querySelector('.main-content').style.flex = '1';
    }

    close() {
        this.panel.classList.remove('active');
    }

    switchTab(tab) {
        this.tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        if (tab === 'preview') {
            this.codeView.classList.remove('active');
            this.previewFrame.classList.add('active');
        } else {
            this.previewFrame.classList.remove('active');
            this.codeView.classList.add('active');
            this.showCode();
        }
    }

    showCode() {
        let codeHtml = '';

        if (this.currentCode.html) {
            codeHtml += `<div class="code-section">
                <h4 style="color: var(--accent-secondary); margin-bottom: 12px; font-size: 14px;">HTML</h4>
                <pre><code>${this.escapeHtml(this.currentCode.html)}</code></pre>
            </div>`;
        }

        if (this.currentCode.css) {
            codeHtml += `<div class="code-section">
                <h4 style="color: var(--accent-secondary); margin-bottom: 12px; font-size: 14px;">CSS</h4>
                <pre><code>${this.escapeHtml(this.currentCode.css)}</code></pre>
            </div>`;
        }

        if (this.currentCode.js) {
            codeHtml += `<div class="code-section">
                <h4 style="color: var(--accent-secondary); margin-bottom: 12px; font-size: 14px;">JavaScript</h4>
                <pre><code>${this.escapeHtml(this.currentCode.js)}</code></pre>
            </div>`;
        }

        this.codeView.innerHTML = codeHtml || '<p style="color: var(--text-muted); text-align: center; padding: 40px;">لا يوجد كود حالياً</p>';
    }

    updatePreview() {
        const combinedHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; }
        ${this.currentCode.css}
    </style>
</head>
<body>
    ${this.currentCode.html}
    <script>${this.currentCode.js}<\/script>
</body>
</html>`;

        this.previewFrame.srcdoc = combinedHtml;
        this.switchTab('preview');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    copyCode() {
        let fullCode = '';

        if (this.currentCode.html) {
            fullCode += `<!-- HTML -->\n${this.currentCode.html}\n\n`;
        }
        if (this.currentCode.css) {
            fullCode += `/* CSS */\n${this.currentCode.css}\n\n`;
        }
        if (this.currentCode.js) {
            fullCode += `// JavaScript\n${this.currentCode.js}`;
        }

        if (fullCode) {
            navigator.clipboard.writeText(fullCode).then(() => {
                window.app?.showToast('تم نسخ الكود بنجاح!', 'success');
            });
        }
    }

    downloadCode() {
        const combinedHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Page</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; }
${this.currentCode.css}
    </style>
</head>
<body>
${this.currentCode.html}
    <script>
${this.currentCode.js}
    <\/script>
</body>
</html>`;

        const blob = new Blob([combinedHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated-page.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.app?.showToast('تم تحميل الملف بنجاح!', 'success');
    }
}

window.CodePreview = CodePreview;
