// js/toast.js

export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    // For welcomes/stars
    if (type === 'welcome') {
        icon = '👋';
        toast.className = "toast success";
    }

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger reflow for animation
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
    }, 4000);
}

// Attach globally for easy replacement of alert()
window.showToast = showToast;

// Override window.alert to automatically use showToast
window.alert = function(msg) {
    if (msg && msg.toLowerCase && (msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error'))) {
        showToast(msg, 'error');
    } else {
        showToast(msg, 'success');
    }
};
