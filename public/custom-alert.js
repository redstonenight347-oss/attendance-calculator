(function () {
    const SVG_ICONS = {
        info: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-7 h-7 text-blue-500"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-7 h-7 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`,
        success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-7 h-7 text-emerald-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-7 h-7 text-rose-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        save: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8 inline-block mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>`
    };

    function resolveIcon(icon) {
        if (!icon) return SVG_ICONS.info;
        if (icon.startsWith('<svg')) return icon;
        if (SVG_ICONS[icon]) return SVG_ICONS[icon];
        if (icon.includes('warning')) return SVG_ICONS.warning;
        if (icon.includes('success')) return SVG_ICONS.success;
        if (icon.includes('error')) return SVG_ICONS.error;
        if (icon.includes('save')) return SVG_ICONS.save;
        return SVG_ICONS.info;
    }

    // Create modal HTML structure
    const modalHtml = `
        <div id="custom-modal-backdrop" class="modal-backdrop">
            <div class="custom-modal">
                <span id="custom-modal-icon" class="modal-icon">${SVG_ICONS.info}</span>
                <h3 id="custom-modal-title" class="modal-title">Notification</h3>
                <p id="custom-modal-message" class="modal-message">This is a message.</p>
                <div id="custom-modal-buttons" class="modal-buttons">
                    <button id="custom-modal-ok" class="modal-btn modal-btn-primary">OK</button>
                </div>
            </div>
        </div>
    `;

    // Inject into body when DOM is ready
    function injectModal() {
        if (!document.getElementById('custom-modal-backdrop')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectModal);
    } else {
        injectModal();
    }

    window.customAlert = function (message, title = 'Notification', icon = 'info') {
        return new Promise((resolve) => {
            const backdrop = document.getElementById('custom-modal-backdrop');
            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const iconEl = document.getElementById('custom-modal-icon');
            const buttonsContainer = document.getElementById('custom-modal-buttons');

            titleEl.textContent = title;
            messageEl.textContent = message;
            iconEl.innerHTML = resolveIcon(icon);

            buttonsContainer.innerHTML = `
                <button class="modal-btn modal-btn-primary">OK</button>
            `;

            const okBtn = buttonsContainer.querySelector('button');
            okBtn.onclick = () => {
                backdrop.classList.remove('active');
                resolve();
            };

            backdrop.classList.add('active');
        });
    };

    window.customConfirm = function (message, title = 'Confirm Action', icon = 'warning', cancelLabel = 'Cancel', proceedLabel = 'Proceed') {
        return new Promise((resolve) => {
            const backdrop = document.getElementById('custom-modal-backdrop');
            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const iconEl = document.getElementById('custom-modal-icon');
            const buttonsContainer = document.getElementById('custom-modal-buttons');

            titleEl.textContent = title;
            messageEl.textContent = message;
            iconEl.innerHTML = resolveIcon(icon);

            const isDanger = title.toLowerCase().includes('delete') || title.toLowerCase().includes('clear') || title.toLowerCase().includes('discard');
            const btnClass = isDanger ? 'modal-btn-danger' : 'modal-btn-primary';

            buttonsContainer.innerHTML = `
                <button class="modal-btn modal-btn-secondary">${cancelLabel}</button>
                <button class="modal-btn ${btnClass}">${proceedLabel}</button>
            `;

            const [cancelBtn, proceedBtn] = buttonsContainer.querySelectorAll('button');

            cancelBtn.onclick = () => {
                backdrop.classList.remove('active');
                resolve(false);
            };

            proceedBtn.onclick = () => {
                backdrop.classList.remove('active');
                resolve(true);
            };

            backdrop.classList.add('active');
        });
    };

    // Override window.alert with SVG icon support
    window.alert = function (message) {
        let icon = 'info';
        let title = 'Notification';

        if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
            icon = 'error';
            title = 'Error';
        } else if (message.toLowerCase().includes('success')) {
            icon = 'success';
            title = 'Success';
        } else if (message.toLowerCase().includes('warning')) {
            icon = 'warning';
            title = 'Warning';
        }

        window.customAlert(message, title, icon);
    };
})();
