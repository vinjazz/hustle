// ===============================================
// MANUAL REFRESH SYSTEM - DISATTIVA AUTO-UPDATES
// ===============================================

// Sistema di refresh manuale per ridurre consumo dati Firebase
class ManualRefreshSystem {
    constructor() {
        this.refreshButtons = {};
        this.lastRefreshTimes = {};
        this.isRefreshing = {};
        this.autoRefreshDisabled = true; // DISATTIVA AUTO-REFRESH
    }

    // Inizializza il sistema di refresh manuale
    init() {
        console.log('🔧 Inizializzazione sistema refresh manuale...');
        
        // Disattiva TUTTI gli auto-refresh esistenti
        this.disableAllAutoRefresh();
        
        // Aggiunge bottoni refresh alle sezioni
        this.addRefreshButtonsToSections();
        
        console.log('✅ Sistema refresh manuale attivato - AUTO-REFRESH DISATTIVATO');
    }

    // Disattiva tutti gli auto-refresh per ridurre consumo dati
    disableAllAutoRefresh() {
        console.log('🛑 Disattivazione auto-refresh...');
        
        // 1. Disattiva auto-refresh activity tracker
        if (window.activityTracker) {
            // Ferma l'interval di auto-refresh
            if (window.activityTracker.updateInterval) {
                clearInterval(window.activityTracker.updateInterval);
                window.activityTracker.updateInterval = null;
                console.log('✅ Activity tracker auto-refresh disattivato');
            }
            
            // Rimuovi tutti i listeners real-time
            window.activityTracker.removeRealtimeListeners();
            window.activityTracker.realtimeListeners = {};
            console.log('✅ Activity tracker real-time listeners rimossi');
        }

        // 2. Disattiva listeners messaggi real-time
        this.disableMessageListeners();

        // 3. Disattiva listeners thread real-time  
        this.disableThreadListeners();

        // 4. Disattiva listeners notifiche real-time
        this.disableNotificationListeners();

        // 5. Pulisci eventuali altri interval
        this.clearAllIntervals();

        console.log('🚫 TUTTI gli auto-refresh sono stati DISATTIVATI');
    }

    // Disattiva listeners messaggi
    disableMessageListeners() {
        if (window.messageListeners) {
            Object.keys(window.messageListeners).forEach(section => {
                const listener = window.messageListeners[section];
                if (listener && listener.path && listener.callback && window.firebaseDatabase) {
                    try {
                        const { ref, off } = window.firebaseImports;
                        const messagesRef = ref(window.firebaseDatabase, listener.path);
                        off(messagesRef, listener.callback);
                        console.log(`✅ Listener messaggi ${section} disattivato`);
                    } catch (error) {
                        console.warn(`⚠️ Errore disattivazione listener ${section}:`, error);
                    }
                }
            });
            window.messageListeners = {};
        }
    }

    // Disattiva listeners thread
    disableThreadListeners() {
        if (window.threadListeners) {
            Object.keys(window.threadListeners).forEach(section => {
                const listener = window.threadListeners[section];
                if (listener && listener.path && listener.callback && window.firebaseDatabase) {
                    try {
                        const { ref, off } = window.firebaseImports;
                        const threadsRef = ref(window.firebaseDatabase, listener.path);
                        off(threadsRef, listener.callback);
                        console.log(`✅ Listener thread ${section} disattivato`);
                    } catch (error) {
                        console.warn(`⚠️ Errore disattivazione listener ${section}:`, error);
                    }
                }
            });
            window.threadListeners = {};
        }
    }

    // Disattiva listeners notifiche
    disableNotificationListeners() {
        // Rimuovi eventuali listeners notifiche Firebase
        if (window.notificationListener) {
            try {
                const { ref, off } = window.firebaseImports;
                if (window.firebaseDatabase && window.currentUser) {
                    const notifRef = ref(window.firebaseDatabase, `notifications/${window.currentUser.uid}`);
                    off(notifRef, window.notificationListener);
                    window.notificationListener = null;
                    console.log('✅ Listener notifiche disattivato');
                }
            } catch (error) {
                console.warn('⚠️ Errore disattivazione listener notifiche:', error);
            }
        }
    }

    // Pulisci tutti gli interval attivi
    clearAllIntervals() {
        // Trova tutti gli interval nel global scope
        const highestId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
            clearInterval(i);
            clearTimeout(i);
        }
        console.log('🧹 Tutti gli interval/timeout puliti');
    }

    // Aggiunge bottoni refresh alle sezioni
    addRefreshButtonsToSections() {
        console.log('🔄 Aggiungendo bottoni refresh...');

        // Aggiunge bottone al header principale
        this.addMainRefreshButton();

        // Aggiunge bottoni specifici per ogni tipo di contenuto
        this.addContentRefreshButtons();
    }

    // Bottone refresh principale nel header
    addMainRefreshButton() {
        const header = document.querySelector('.header');
        if (!header) return;

        // Rimuovi bottone esistente se presente
        const existingBtn = header.querySelector('.main-refresh-btn');
        if (existingBtn) existingBtn.remove();

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'main-refresh-btn';
        refreshBtn.innerHTML = `
            <span class="refresh-icon">🔄</span>
            <span class="refresh-text">Aggiorna</span>
        `;
        refreshBtn.title = 'Aggiorna contenuto corrente';
        refreshBtn.onclick = () => this.refreshCurrentSection();

        // Inserisci dopo il titolo
        const titleElement = header.querySelector('#section-title');
        if (titleElement) {
            titleElement.parentNode.insertBefore(refreshBtn, titleElement.nextSibling);
        } else {
            header.appendChild(refreshBtn);
        }

        console.log('✅ Bottone refresh principale aggiunto');
    }

    // Bottoni refresh per contenuti specifici
    addContentRefreshButtons() {
        // Bottone per thread list (forum)
        this.addThreadListRefreshButton();
        
        // Bottone per chat
        this.addChatRefreshButton();
        
        // Bottone per commenti thread
        this.addCommentsRefreshButton();
        
        // Bottone per notifiche
        this.addNotificationsRefreshButton();
    }

    // Bottone refresh per lista thread
    addThreadListRefreshButton() {
        const threadList = document.getElementById('thread-list');
        if (!threadList) return;

        // Crea container se non esiste
        let refreshContainer = threadList.querySelector('.thread-refresh-container');
        if (!refreshContainer) {
            refreshContainer = document.createElement('div');
            refreshContainer.className = 'thread-refresh-container';
            refreshContainer.innerHTML = `
                <div class="refresh-bar">
                    <div class="refresh-info">
                        <span class="refresh-status">📊 Dati in cache</span>
                        <span class="refresh-time" id="thread-last-refresh">Mai aggiornato</span>
                    </div>
                    <button class="refresh-btn thread-refresh-btn" onclick="window.manualRefresh.refreshThreads()">
                        <span class="refresh-icon">🔄</span>
                        <span>Aggiorna Thread</span>
                    </button>
                </div>
            `;
            threadList.insertBefore(refreshContainer, threadList.firstChild);
        }

        this.refreshButtons.threads = refreshContainer.querySelector('.thread-refresh-btn');
        console.log('✅ Bottone refresh thread aggiunto');
    }

    // Bottone refresh per chat
    addChatRefreshButton() {
        const chatContent = document.getElementById('chat-content');
        if (!chatContent) return;

        // Trova il container input chat
        const chatInput = chatContent.querySelector('.chat-input');
        if (!chatInput) return;

        // Crea bottone refresh per chat
        let refreshBtn = chatContent.querySelector('.chat-refresh-btn');
        if (!refreshBtn) {
            const refreshContainer = document.createElement('div');
            refreshContainer.className = 'chat-refresh-container';
            refreshContainer.innerHTML = `
                <div class="chat-refresh-bar">
                    <div class="refresh-info">
                        <span class="refresh-status">💬 Messaggi in cache</span>
                        <span class="refresh-time" id="chat-last-refresh">Mai aggiornato</span>
                    </div>
                    <button class="refresh-btn chat-refresh-btn" onclick="window.manualRefresh.refreshMessages()">
                        <span class="refresh-icon">🔄</span>
                        <span>Aggiorna Chat</span>
                    </button>
                </div>
            `;
            
            // Inserisci prima dell'input
            chatInput.parentNode.insertBefore(refreshContainer, chatInput);
            refreshBtn = refreshContainer.querySelector('.chat-refresh-btn');
        }

        this.refreshButtons.chat = refreshBtn;
        console.log('✅ Bottone refresh chat aggiunto');
    }

    // Bottone refresh per commenti
    addCommentsRefreshButton() {
        const threadView = document.getElementById('thread-view');
        if (!threadView) return;

        const commentsContainer = threadView.querySelector('#thread-comments');
        if (!commentsContainer) return;

        // Crea bottone refresh commenti
        let refreshBtn = threadView.querySelector('.comments-refresh-btn');
        if (!refreshBtn) {
            const refreshContainer = document.createElement('div');
            refreshContainer.className = 'comments-refresh-container';
            refreshContainer.innerHTML = `
                <div class="comments-refresh-bar">
                    <div class="refresh-info">
                        <span class="refresh-status">💭 Commenti in cache</span>
                        <span class="refresh-time" id="comments-last-refresh">Mai aggiornato</span>
                    </div>
                    <button class="refresh-btn comments-refresh-btn" onclick="window.manualRefresh.refreshComments()">
                        <span class="refresh-icon">🔄</span>
                        <span>Aggiorna Commenti</span>
                    </button>
                </div>
            `;
            
            // Inserisci prima dei commenti
            commentsContainer.parentNode.insertBefore(refreshContainer, commentsContainer);
            refreshBtn = refreshContainer.querySelector('.comments-refresh-btn');
        }

        this.refreshButtons.comments = refreshBtn;
        console.log('✅ Bottone refresh commenti aggiunto');
    }

    // Bottone refresh per notifiche
    addNotificationsRefreshButton() {
        const notifPanel = document.getElementById('notificationsPanel');
        if (!notifPanel) return;

        const notifHeader = notifPanel.querySelector('.notifications-header');
        if (!notifHeader) return;

        // Aggiungi bottone refresh notifiche
        let refreshBtn = notifHeader.querySelector('.notif-refresh-btn');
        if (!refreshBtn) {
            refreshBtn = document.createElement('button');
            refreshBtn.className = 'notif-refresh-btn';
            refreshBtn.innerHTML = '🔄';
            refreshBtn.title = 'Aggiorna notifiche';
            refreshBtn.onclick = () => this.refreshNotifications();
            
            notifHeader.appendChild(refreshBtn);
        }

        this.refreshButtons.notifications = refreshBtn;
        console.log('✅ Bottone refresh notifiche aggiunto');
    }

    // METODI DI REFRESH MANUALI

    // Refresh sezione corrente
    async refreshCurrentSection() {
        const currentSection = window.currentSection;
        
        if (!currentSection) {
            console.log('⚠️ Nessuna sezione corrente da aggiornare');
            return;
        }

        console.log('🔄 Refresh manuale sezione:', currentSection);

        // Mostra stato loading sul bottone principale
        const mainBtn = document.querySelector('.main-refresh-btn');
        if (mainBtn) {
            const originalHTML = mainBtn.innerHTML;
            mainBtn.innerHTML = `<span class="refresh-icon spinning">⏳</span><span>Aggiornando...</span>`;
            mainBtn.disabled = true;

            setTimeout(() => {
                mainBtn.innerHTML = originalHTML;
                mainBtn.disabled = false;
            }, 2000);
        }

        // Refresh in base al tipo di sezione
        const sectionConfig = window.sectionConfig[currentSection];
        if (!sectionConfig) return;

        try {
            if (sectionConfig.type === 'forum' || sectionConfig.type === 'admin') {
                await this.refreshThreads();
            } else if (sectionConfig.type === 'chat') {
                await this.refreshMessages();
            } else if (sectionConfig.type === 'dashboard') {
                await this.refreshDashboard();
            }

            // Refresh badge se attivati
            if (window.activityTracker && !this.autoRefreshDisabled) {
                await window.activityTracker.refreshBadges();
            }

            this.showRefreshSuccess('Sezione aggiornata!');
        } catch (error) {
            console.error('Errore refresh sezione:', error);
            this.showRefreshError('Errore nell\'aggiornamento');
        }
    }

    // Refresh thread manuale
    async refreshThreads() {
        if (this.isRefreshing.threads) return;
        
        console.log('🔄 Refresh manuale thread...');
        this.isRefreshing.threads = true;

        const btn = this.refreshButtons.threads;
        if (btn) {
            btn.innerHTML = '<span class="refresh-icon spinning">⏳</span><span>Aggiornando...</span>';
            btn.disabled = true;
        }

        try {
            // Forza ricaricamento thread senza listeners real-time
            await this.loadThreadsManual(window.currentSection);
            
            this.updateRefreshTime('threads');
            this.showRefreshSuccess('Thread aggiornati!');
        } catch (error) {
            console.error('Errore refresh thread:', error);
            this.showRefreshError('Errore aggiornamento thread');
        } finally {
            this.isRefreshing.threads = false;
            if (btn) {
                btn.innerHTML = '<span class="refresh-icon">🔄</span><span>Aggiorna Thread</span>';
                btn.disabled = false;
            }
        }
    }

    // Refresh messaggi manuale
    async refreshMessages() {
        if (this.isRefreshing.messages) return;
        
        console.log('🔄 Refresh manuale messaggi...');
        this.isRefreshing.messages = true;

        const btn = this.refreshButtons.chat;
        if (btn) {
            btn.innerHTML = '<span class="refresh-icon spinning">⏳</span><span>Aggiornando...</span>';
            btn.disabled = true;
        }

        try {
            // Forza ricaricamento messaggi senza listeners real-time
            await this.loadMessagesManual(window.currentSection);
            
            this.updateRefreshTime('messages');
            this.showRefreshSuccess('Chat aggiornata!');
        } catch (error) {
            console.error('Errore refresh messaggi:', error);
            this.showRefreshError('Errore aggiornamento chat');
        } finally {
            this.isRefreshing.messages = false;
            if (btn) {
                btn.innerHTML = '<span class="refresh-icon">🔄</span><span>Aggiorna Chat</span>';
                btn.disabled = false;
            }
        }
    }

    // Refresh commenti manuale
    async refreshComments() {
        if (this.isRefreshing.comments || !window.currentThreadId) return;
        
        console.log('🔄 Refresh manuale commenti...');
        this.isRefreshing.comments = true;

        const btn = this.refreshButtons.comments;
        if (btn) {
            btn.innerHTML = '<span class="refresh-icon spinning">⏳</span><span>Aggiornando...</span>';
            btn.disabled = true;
        }

        try {
            // Forza ricaricamento commenti senza listeners real-time
            await this.loadCommentsManual(window.currentThreadId, window.currentThreadSection);
            
            this.updateRefreshTime('comments');
            this.showRefreshSuccess('Commenti aggiornati!');
        } catch (error) {
            console.error('Errore refresh commenti:', error);
            this.showRefreshError('Errore aggiornamento commenti');
        } finally {
            this.isRefreshing.comments = false;
            if (btn) {
                btn.innerHTML = '<span class="refresh-icon">🔄</span><span>Aggiorna Commenti</span>';
                btn.disabled = false;
            }
        }
    }

    // Refresh notifiche manuale
    async refreshNotifications() {
        if (this.isRefreshing.notifications) return;
        
        console.log('🔄 Refresh manuale notifiche...');
        this.isRefreshing.notifications = true;

        const btn = this.refreshButtons.notifications;
        if (btn) {
            btn.innerHTML = '⏳';
            btn.disabled = true;
        }

        try {
            // Ricarica notifiche manualmente
            if (window.loadNotifications) {
                window.loadNotifications();
            }
            
            this.updateRefreshTime('notifications');
            this.showRefreshSuccess('Notifiche aggiornate!');
        } catch (error) {
            console.error('Errore refresh notifiche:', error);
            this.showRefreshError('Errore aggiornamento notifiche');
        } finally {
            this.isRefreshing.notifications = false;
            if (btn) {
                btn.innerHTML = '🔄';
                btn.disabled = false;
            }
        }
    }

    // Refresh dashboard manuale
    async refreshDashboard() {
        console.log('🔄 Refresh manuale dashboard...');
        
        try {
            if (window.loadDashboard) {
                window.loadDashboard();
            }
            this.showRefreshSuccess('Dashboard aggiornata!');
        } catch (error) {
            console.error('Errore refresh dashboard:', error);
            this.showRefreshError('Errore aggiornamento dashboard');
        }
    }

    // METODI DI CARICAMENTO MANUALE (SENZA LISTENERS)

    // Carica thread manualmente (una tantum)
    async loadThreadsManual(sectionKey) {
        const dataPath = window.getDataPath(sectionKey, 'threads');
        if (!dataPath) return;

        console.log('📖 Caricamento manuale thread da:', dataPath);

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, get } = window.firebaseImports;
            const threadsRef = ref(window.firebaseDatabase, dataPath);
            
            // SINGLE READ - nessun listener real-time
            const snapshot = await get(threadsRef);
            
            const threads = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    threads.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }

            // Ordina e mostra
            threads.sort((a, b) => b.createdAt - a.createdAt);
            window.displayThreads(threads.slice(0, 20));
            
            console.log(`✅ Caricati ${threads.length} thread manualmente`);
        } else {
            // Modalità locale
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            threads.sort((a, b) => b.createdAt - a.createdAt);
            window.displayThreads(threads);
        }
    }

    // Carica messaggi manualmente (una tantum)
    async loadMessagesManual(sectionKey) {
        const dataPath = window.getDataPath(sectionKey, 'messages');
        if (!dataPath) return;

        console.log('📖 Caricamento manuale messaggi da:', dataPath);

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, get } = window.firebaseImports;
            const messagesRef = ref(window.firebaseDatabase, dataPath);
            
            // SINGLE READ - nessun listener real-time
            const snapshot = await get(messagesRef);
            
            const messages = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    messages.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }

            // Ordina e mostra solo gli ultimi 50
            messages.sort((a, b) => a.timestamp - b.timestamp);
            const recentMessages = messages.slice(-50);
            
            window.displayMessages(recentMessages);
            window.updateMessageCounter(recentMessages.length);
            
            console.log(`✅ Caricati ${recentMessages.length} messaggi manualmente`);
        } else {
            // Modalità locale
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            messages.sort((a, b) => a.timestamp - b.timestamp);
            window.displayMessages(messages);
            window.updateMessageCounter(messages.length);
        }
    }

    // Carica commenti manualmente (una tantum)
    async loadCommentsManual(threadId, section) {
        const dataPath = window.getDataPath(section, 'comments');
        if (!dataPath || !threadId) return;

        console.log('📖 Caricamento manuale commenti da:', `${dataPath}/${threadId}`);

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, get } = window.firebaseImports;
            const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
            
            // SINGLE READ - nessun listener real-time
            const snapshot = await get(commentsRef);
            
            const comments = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    comments.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }

            // Ordina e mostra solo gli ultimi 30
            comments.sort((a, b) => a.timestamp - b.timestamp);
            const recentComments = comments.slice(-30);
            
            window.displayThreadComments(recentComments);
            
            console.log(`✅ Caricati ${recentComments.length} commenti manualmente`);
        } else {
            // Modalità locale
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
            const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
            comments.sort((a, b) => a.timestamp - b.timestamp);
            window.displayThreadComments(comments);
        }
    }

    // UTILITY

    // Aggiorna tempo ultimo refresh
    updateRefreshTime(type) {
        this.lastRefreshTimes[type] = Date.now();
        const timeElement = document.getElementById(`${type}-last-refresh`) || 
                          document.getElementById(`${type.replace('s', '')}-last-refresh`);
        
        if (timeElement) {
            const time = new Date().toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            });
            timeElement.textContent = `Ultimo: ${time}`;
        }
    }

    // Mostra successo refresh
    showRefreshSuccess(message) {
        this.showRefreshNotification(message, 'success');
    }

    // Mostra errore refresh
    showRefreshError(message) {
        this.showRefreshNotification(message, 'error');
    }

    // Mostra notifica refresh
    showRefreshNotification(message, type = 'info') {
        // Crea toast temporaneo
        const toast = document.createElement('div');
        toast.className = `refresh-toast refresh-toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Animazione
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Rimozione automatica
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }

    // Re-aggiunge bottoni quando si cambia sezione
    onSectionChange() {
        setTimeout(() => {
            this.addContentRefreshButtons();
        }, 500);
    }

    // Pulizia quando si fa logout
    cleanup() {
        // Rimuovi tutti i bottoni
        Object.values(this.refreshButtons).forEach(btn => {
            if (btn && btn.parentNode) {
                btn.parentNode.removeChild(btn);
            }
        });
        
        this.refreshButtons = {};
        this.lastRefreshTimes = {};
        this.isRefreshing = {};
    }
}

// Istanza globale
window.manualRefresh = new ManualRefreshSystem();

// Override delle funzioni originali per disattivare auto-loading
const originalSwitchSection = window.switchSection;
window.switchSection = function(sectionKey) {
    // Esegui switch normale ma senza auto-loading
    const result = originalSwitchSection.call(this, sectionKey);
    
    // Re-aggiungi bottoni refresh
    window.manualRefresh.onSectionChange();
    
    return result;
};

// Override funzioni di caricamento per renderle manuali
const originalLoadThreads = window.loadThreads;
window.loadThreads = function(sectionKey) {
    console.log('🚫 Auto-loading thread disattivato. Usa il bottone refresh.');
    
    // Carica solo se esplicitamente richiesto
    if (window.manualRefresh && !window.manualRefresh.autoRefreshDisabled) {
        return originalLoadThreads.call(this, sectionKey);
    }
    
    // Mostra messaggio per refreshare manualmente
    const threadList = document.getElementById('thread-list');
    if (threadList) {
        threadList.innerHTML = `
            <div class="manual-refresh-prompt">
                <div class="prompt-icon">🔄</div>
                <div class="prompt-title">Contenuto in Cache</div>
                <div class="prompt-message">Per ridurre il consumo dati, l'aggiornamento automatico è disattivato.</div>
                <button class="prompt-refresh-btn" onclick="window.manualRefresh.refreshThreads()">
                    🔄 Aggiorna Thread
                </button>
            </div>
        `;
        
        // Aggiungi anche il bottone nel container
        window.manualRefresh.addThreadListRefreshButton();
    }
};

const originalLoadMessages = window.loadMessages;
window.loadMessages = function(sectionKey) {
    console.log('🚫 Auto-loading messaggi disattivato. Usa il bottone refresh.');
    
    // Carica solo se esplicitamente richiesto
    if (window.manualRefresh && !window.manualRefresh.autoRefreshDisabled) {
        return originalLoadMessages.call(this, sectionKey);
    }
    
    // Mostra messaggio per refreshare manualmente
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="manual-refresh-prompt">
                <div class="prompt-icon">💬</div>
                <div class="prompt-title">Chat in Cache</div>
                <div class="prompt-message">Per ridurre il consumo dati, l'aggiornamento automatico è disattivato.</div>
                <button class="prompt-refresh-btn" onclick="window.manualRefresh.refreshMessages()">
                    🔄 Aggiorna Chat
                </button>
            </div>
        `;
        
        // Aggiungi anche il bottone nel container
        window.manualRefresh.addChatRefreshButton();
    }
};

// Inizializzazione automatica quando il sistema è pronto
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.manualRefresh) {
            window.manualRefresh.init();
        }
    }, 3000); // Aspetta che tutto sia caricato
});

// Pulisci al logout
const originalHandleLogout = window.handleLogout;
window.handleLogout = function() {
    if (window.manualRefresh) {
        window.manualRefresh.cleanup();
    }
    return originalHandleLogout.call(this);
};

console.log('🔧 Sistema refresh manuale caricato - AUTO-REFRESH DISATTIVATO per ridurre consumo dati!');