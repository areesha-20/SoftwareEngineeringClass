let conversations = [];
let currentConversationId = null;
let availableModels = [];

async function initializeDashboard() {
    requireAuth();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    const chatForm = document.getElementById('chatForm');
    const searchInput = document.getElementById('historySearch');
    const newChatBtn = document.getElementById('newChatBtn');
    const modelSelect = document.getElementById('modelSelect');

    if (userNameEl && user.email) userNameEl.textContent = user.email;
    if (userAvatarEl && user.email) userAvatarEl.textContent = user.email.charAt(0).toUpperCase();
    if (navLogoutBtn) navLogoutBtn.addEventListener('click', logoutUser);
    if (chatForm) chatForm.addEventListener('submit', handleChatSubmit);
    if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);
    if (modelSelect) modelSelect.addEventListener('change', handleModelChange);
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (event) => {
            await loadConversationHistory(event.target.value.trim());
        }, 250));
    }

    await loadModels();
    await loadConversationHistory();
}

async function loadModels() {
    try {
        const response = await apiCall('/models', { method: 'GET' });
        if (!response.success) return;

        const { local, public: publicModels } = response.data;
        availableModels = [...local, ...publicModels];

        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) return;

        modelSelect.innerHTML = '';

        if (local.length > 0) {
            const localGroup = document.createElement('optgroup');
            localGroup.label = '💻 Local (Ollama)';
            local.forEach((m) => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ provider: m.provider, model: m.id });
                opt.textContent = m.name;
                localGroup.appendChild(opt);
            });
            modelSelect.appendChild(localGroup);
        }

        const publicGroup = document.createElement('optgroup');
        publicGroup.label = '🌐 Public APIs';
        publicModels.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ provider: m.provider, model: m.id });
            opt.textContent = m.name;
            publicGroup.appendChild(opt);
        });
        modelSelect.appendChild(publicGroup);

        if (availableModels.length > 0) {
            modelSelect.selectedIndex = 0;
            handleModelChange();
        }
    } catch (error) {
        console.error('Failed to load models:', error);
    }
}

function handleModelChange() {
    const modelSelect = document.getElementById('modelSelect');
    const modelBadge = document.getElementById('modelBadge');
    if (!modelSelect || !modelSelect.value) return;

    const { provider } = JSON.parse(modelSelect.value);
    const isLocal = provider === 'ollama';

    if (modelBadge) {
        modelBadge.textContent = isLocal ? 'local' : 'public';
        modelBadge.className = `model-badge ${isLocal ? 'local' : 'public'}`;
    }
}

function getSelectedModel() {
    const modelSelect = document.getElementById('modelSelect');
    if (!modelSelect || !modelSelect.value) return { provider: 'ollama', model: 'llama3' };
    return JSON.parse(modelSelect.value);
}

async function loadConversationHistory(search = '') {
    try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await apiCall(`/conversations${query}`, { method: 'GET' });
        if (response.success) {
            conversations = response.data || [];
            displayHistoryList();
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

function displayHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (!conversations.length) {
        historyList.innerHTML = '<p class="empty-state">No saved conversations yet</p>';
        return;
    }

    historyList.innerHTML = conversations.map((conversation) => `
        <button class="history-item ${conversation.conversationId === currentConversationId ? 'active' : ''}" data-id="${conversation.conversationId}">
            <div class="history-item-top">
                <p>${escapeHtml(conversation.title || 'New Chat')}</p>
                <span>${formatDate(conversation.updatedAt)}</span>
            </div>
            <small>${escapeHtml((conversation.preview || '').slice(0, 80))}</small>
        </button>
    `).join('');

    historyList.querySelectorAll('.history-item').forEach((button) => {
        button.addEventListener('click', () => loadConversation(button.dataset.id));
    });
}

async function loadConversation(conversationId) {
    try {
        const response = await apiCall(`/conversations/${conversationId}`, { method: 'GET' });
        if (response.success) {
            currentConversationId = conversationId;
            renderConversation(response.data);
            displayHistoryList();
        }
    } catch (error) {
        showError('chatError', 'Failed to load conversation');
    }
}

function getToolBadge(tool) {
    if (!tool) return '';
    const icons = { math: '🧮', weather: '🌤️' };
    const icon = icons[tool] || '🔧';
    return `<span class="tool-badge">${icon} ${tool} tool</span>`;
}

function renderConversation(conversation) {
    const chatMessages = document.getElementById('chatMessages');
    const chatTitle = document.getElementById('chatTitle');
    if (!chatMessages) return;

    if (chatTitle) chatTitle.textContent = conversation.title || 'New Chat';

    if (!conversation.messages || !conversation.messages.length) {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h3>Start a conversation</h3>
                <p>Select a model above, then type your message below.<br>
                Try asking a math question like "what is 234 * 567?" or a weather question like "what is the weather in Tokyo?"</p>
            </div>
        `;
        return;
    }

    chatMessages.innerHTML = conversation.messages.map((message) => `
        <div class="message ${message.role === 'user' ? 'user' : 'ai'}">
            <div class="message-content">
                ${formatMessageContent(message.content)}
                ${message.role === 'assistant' ? getToolBadge(message.tool) : ''}
                <div class="message-timestamp">${formatDate(message.createdAt)}</div>
            </div>
        </div>
    `).join('');

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleChatSubmit(event) {
    event.preventDefault();
    hideError('chatError');

    const promptInput = document.getElementById('promptInput');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showError('chatError', 'Please enter a message');
        return;
    }

    const { provider, model } = getSelectedModel();
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
        let response;
        if (!currentConversationId) {
            response = await apiCall('/conversations', {
                method: 'POST',
                body: JSON.stringify({ prompt, provider, model })
            });
        } else {
            response = await apiCall(`/conversations/${currentConversationId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ prompt, provider, model })
            });
        }

        if (response.success) {
            const conversation = response.data.conversation || response.data;
            currentConversationId = conversation.conversationId;
            renderConversation(conversation);
            promptInput.value = '';
            await loadConversationHistory(document.getElementById('historySearch')?.value || '');
        }
    } catch (error) {
        showError('chatError', error?.data?.message || error.message || 'Failed to send message');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        promptInput.focus();
    }
}

function startNewChat() {
    currentConversationId = null;
    const chatTitle = document.getElementById('chatTitle');
    if (chatTitle) chatTitle.textContent = 'New Chat';
    renderConversation({ messages: [] });
    displayHistoryList();
    const promptInput = document.getElementById('promptInput');
    if (promptInput) promptInput.focus();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageContent(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function debounce(fn, wait = 200) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

document.addEventListener('DOMContentLoaded', initializeDashboard);
