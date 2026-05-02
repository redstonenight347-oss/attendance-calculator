(function() {
    // Create modal HTML structure
    const modalHtml = `
        <div id="custom-modal-backdrop" class="modal-backdrop">
            <div class="custom-modal">
                <span id="custom-modal-icon" class="modal-icon">ℹ️</span>
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

    window.customAlert = function(message, title = 'Notification', icon = 'ℹ️') {
        return new Promise((resolve) => {
            const backdrop = document.getElementById('custom-modal-backdrop');
            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const iconEl = document.getElementById('custom-modal-icon');
            const buttonsContainer = document.getElementById('custom-modal-buttons');

            titleEl.textContent = title;
            messageEl.textContent = message;
            iconEl.textContent = icon;
            
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

    window.customConfirm = function(message, title = 'Confirm Action', icon = '⚠️') {
        return new Promise((resolve) => {
            const backdrop = document.getElementById('custom-modal-backdrop');
            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const iconEl = document.getElementById('custom-modal-icon');
            const buttonsContainer = document.getElementById('custom-modal-buttons');

            titleEl.textContent = title;
            messageEl.textContent = message;
            iconEl.textContent = icon;
            
            buttonsContainer.innerHTML = `
                <button class="modal-btn modal-btn-secondary">Cancel</button>
                <button class="modal-btn modal-btn-danger">Proceed</button>
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

    // Override window.alert
    // Note: This makes alert non-blocking. 
    window.alert = function(message) {
        let icon = 'ℹ️';
        let title = 'Notification';
        
        if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
            icon = '❌';
            title = 'Error';
        } else if (message.toLowerCase().includes('success')) {
            icon = '✅';
            title = 'Success';
        } else if (message.toLowerCase().includes('warning')) {
            icon = '⚠️';
            title = 'Warning';
        }
        
        window.customAlert(message, title, icon);
    };

    // We don't override window.confirm because it MUST be synchronous to work with existing code patterns.
    // Instead, we will manually update confirm() calls to await customConfirm().
})();
