// ===============================================
// DASHBOARD MODULE - Modern Mobile-First Design
// ===============================================

class DashboardManager {
    constructor() {
        this.latestThreadsCache = new Map();
        this.refreshInterval = null;
    }

    // Carica dashboard principale
    loadDashboard() {
        const threadList = document.getElementById('thread-list');

        // Se l'utente non è ancora loggato, mostra loading
        if (!currentUser) {
            threadList.innerHTML = this.getLoadingHTML();
            return;
        }

        const userName = currentUser.displayName || 'Guerriero';
        const userClan = getCurrentUserClan();
        const userRole = getCurrentUserRole();

        threadList.innerHTML = this.getDashboardHTML(userName, userClan, userRole);

        // Carica contenuti dinamici
        setTimeout(() => {
            this.loadLatestNotifications();
            this.loadLatestGeneralThreads();
            this.loadLatestClanThreads();
            this.loadDailyTip();
        }, 100);

        // Setup auto-refresh ogni 30 secondi
        this.setupAutoRefresh();
    }

    // HTML principale della dashboard
    getDashboardHTML(userName, userClan, userRole) {
        return `
            <div class="dashboard-container">
                ${this.getWelcomeSection(userName, userClan, userRole)}
                ${this.getQuickNavigationSection()}
                ${this.getContentGrid()}
                ${this.getQuickActionsSection(userClan)}
            </div>
        `;
    }

    // Sezione benvenuto
    getWelcomeSection(userName, userClan, userRole) {
        const welcomeMessage = this.getWelcomeMessage();
        const roleDisplay = this.getRoleDisplay(userRole);

        return `
            <div class="dashboard-welcome">
                <div class="welcome-bg-icon">🏰</div>
                <div class="welcome-content">
                    <h2 class="welcome-title">
                        ${welcomeMessage}, ${userName}! ${roleDisplay}
                    </h2>
                    <p class="welcome-subtitle">
                        Benvenuto nel forum di Hustle Castle Council! Rimani aggiornato su eventi, strategie e novità della community.
                    </p>
                    ${this.getClanStatusCard(userClan)}
                </div>
            </div>
        `;
    }

    // Navigazione rapida
    getQuickNavigationSection() {
        return `
            <div class="dashboard-section">
                <h3 class="section-title">
                    <span class="section-icon">🧭</span>
                    Navigazione Rapida
                </h3>
                <div class="quick-nav-grid">
                    ${this.getQuickNavCards()}
                </div>
            </div>
        `;
    }

    // Griglia contenuti principali
    getContentGrid() {
        return `
            <div class="dashboard-content-grid">
                <div class="content-card notifications-card">
                    <div class="card-header">
                        <h3><span>🔔</span> Ultime Notifiche</h3>
                        <button class="card-action-btn" onclick="toggleNotificationsPanel()">
                            Vedi Tutte
                        </button>
                    </div>
                    <div id="dashboard-notifications" class="card-content">
                        <div class="loading-state">🔄 Caricamento...</div>
                    </div>
                </div>

                <div class="content-card threads-card">
                    <div class="card-header">
                        <h3><span>🌍</span> Thread Generali</h3>
                        <button class="card-action-btn" onclick="switchSection('eventi')">
                            Vedi Tutti
                        </button>
                    </div>
                    <div id="dashboard-general-threads" class="card-content">
                        <div class="loading-state">🔄 Caricamento...</div>
                    </div>
                </div>

                <div class="content-card clan-card">
                    <div class="card-header">
                        <h3><span>🏰</span> Thread Clan</h3>
                        <button class="card-action-btn" onclick="switchSection('clan-chat')">
                            Vai al Clan
                        </button>
                    </div>
                    <div id="dashboard-clan-threads" class="card-content">
                        <div class="loading-state">🔄 Caricamento...</div>
                    </div>
                </div>

                <div class="content-card tip-card">
                    <div class="card-header">
                        <h3><span>💡</span> Consiglio del Giorno</h3>
                        <button class="card-action-btn" onclick="dashboardManager.loadDailyTip()">
                            🔄
                        </button>
                    </div>
                    <div id="dashboard-daily-tip" class="card-content">
                        <div class="loading-state">🔄 Caricamento...</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Azioni rapide
    getQuickActionsSection(userClan) {
        return `
            <div class="dashboard-section">
                <h3 class="section-title">
                    <span class="section-icon">⚡</span>
                    Azioni Rapide
                </h3>
                <div class="quick-actions-grid">
                    ${this.getQuickActionButtons(userClan)}
                </div>
            </div>
        `;
    }

    // Cards navigazione rapida
    getQuickNavCards() {
        const navItems = [
            { icon: '📅', title: 'Eventi', subtitle: 'Scopri eventi in corso', section: 'eventi', color: 'red' },
            { icon: '⚔️', title: 'Oggetti', subtitle: 'Guide armi e armature', section: 'oggetti', color: 'purple' },
            { icon: '🆕', title: 'Novità', subtitle: 'Ultimi aggiornamenti', section: 'novita', color: 'blue' },
            { icon: '💬', title: 'Chat', subtitle: 'Chiacchiera con tutti', section: 'chat-generale', color: 'green' }
        ];

        return navItems.map(item => `
            <div class="quick-nav-card nav-card-${item.color}" onclick="switchSection('${item.section}')">
                <div class="nav-card-icon">${item.icon}</div>
                <div class="nav-card-content">
                    <h4>${item.title}</h4>
                    <p>${item.subtitle}</p>
                </div>
            </div>
        `).join('');
    }

    // Bottoni azioni rapide
    getQuickActionButtons(userClan) {
        const actions = [
            {
                icon: '📅',
                title: 'Controlla Eventi',
                action: "switchSection('eventi')",
                color: 'red'
            },
            {
                icon: '💬',
                title: 'Inizia Chat',
                action: "switchSection('chat-generale')",
                color: 'green'
            },
            {
                icon: '✍️',
                title: 'Nuovo Thread',
                action: "showThreadCreationModal()",
                color: 'purple'
            }
        ];

        if (userClan !== 'Nessuno') {
            actions.push({
                icon: '🏰',
                title: 'Chat Clan',
                action: "switchSection('clan-chat')",
                color: 'blue'
            });
        }

        return actions.map(action => `
            <button class="quick-action-btn action-${action.color}" onclick="${action.action}">
                <span class="action-icon">${action.icon}</span>
                <span class="action-text">${action.title}</span>
            </button>
        `).join('');
    }

    // Carica ultime notifiche per dashboard
    loadLatestNotifications() {
        const container = document.getElementById('dashboard-notifications');
        
        if (!currentUser) {
            container.innerHTML = '<div class="empty-state">🔒 Accedi per vedere le notifiche</div>';
            return;
        }

        const recentNotifications = notificationsData.slice(0, 3);

        if (recentNotifications.length === 0) {
            container.innerHTML = '<div class="empty-state">🔕 Nessuna notifica recente</div>';
            return;
        }

        container.innerHTML = recentNotifications.map(notif => `
            <div class="notification-item-small ${!notif.read ? 'unread' : ''}" 
                 onclick="handleNotificationClick('${notif.id}')">
                <div class="notif-icon">${this.getNotificationIcon(notif.type)}</div>
                <div class="notif-content">
                    <div class="notif-text">
                        <strong>${notif.fromUser}</strong> ${this.getNotificationMessage(notif)}
                    </div>
                    <div class="notif-time">${formatTime(notif.timestamp)}</div>
                </div>
                ${!notif.read ? '<div class="unread-dot"></div>' : ''}
            </div>
        `).join('');
    }

    // Carica ultimi thread generali
    async loadLatestGeneralThreads() {
        const container = document.getElementById('dashboard-general-threads');
        const sections = ['eventi', 'oggetti', 'novita', 'associa-clan'];
        
        try {
            const allThreads = [];
            
            for (const section of sections) {
                const threads = await this.getThreadsFromSection(section);
                allThreads.push(...threads.map(t => ({...t, section})));
            }

            // Ordina per data e prendi i più recenti
            allThreads.sort((a, b) => b.createdAt - a.createdAt);
            const recentThreads = allThreads.slice(0, 4);

            if (recentThreads.length === 0) {
                container.innerHTML = '<div class="empty-state">📝 Nessun thread recente</div>';
                return;
            }

            container.innerHTML = recentThreads.map(thread => `
                <div class="thread-item-small" onclick="switchSection('${thread.section}'); setTimeout(() => openThread('${thread.id}', '${thread.section}'), 500)">
                    <div class="thread-small-icon">${this.getSectionIcon(thread.section)}</div>
                    <div class="thread-small-content">
                        <div class="thread-small-title">${thread.title}</div>
                        <div class="thread-small-meta">
                            ${thread.author} • ${formatTime(thread.createdAt)}
                            <span class="thread-small-stats">💬 ${thread.replies || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Errore caricamento thread generali:', error);
            container.innerHTML = '<div class="error-state">❌ Errore nel caricamento</div>';
        }
    }

    // Carica ultimi thread clan
    async loadLatestClanThreads() {
        const container = document.getElementById('dashboard-clan-threads');
        const userClan = getCurrentUserClan();

        if (userClan === 'Nessuno') {
            container.innerHTML = `
                <div class="empty-state">
                    🏠 Non hai un clan
                    <button class="join-clan-btn" onclick="switchSection('associa-clan')">
                        Unisciti a un Clan
                    </button>
                </div>
            `;
            return;
        }

        try {
            const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
            const allClanThreads = [];

            for (const section of clanSections) {
                const threads = await this.getClanThreadsFromSection(section);
                allClanThreads.push(...threads.map(t => ({...t, section})));
            }

            allClanThreads.sort((a, b) => b.createdAt - a.createdAt);
            const recentClanThreads = allClanThreads.slice(0, 4);

            if (recentClanThreads.length === 0) {
                container.innerHTML = '<div class="empty-state">🏰 Nessun thread clan recente</div>';
                return;
            }

            container.innerHTML = recentClanThreads.map(thread => `
                <div class="thread-item-small clan-thread" onclick="switchSection('${thread.section}'); setTimeout(() => openThread('${thread.id}', '${thread.section}'), 500)">
                    <div class="thread-small-icon">${this.getSectionIcon(thread.section)}</div>
                    <div class="thread-small-content">
                        <div class="thread-small-title">${thread.title}</div>
                        <div class="thread-small-meta">
                            ${thread.author} • ${formatTime(thread.createdAt)}
                            <span class="thread-small-stats">💬 ${thread.replies || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Errore caricamento thread clan:', error);
            container.innerHTML = '<div class="error-state">❌ Errore nel caricamento</div>';
        }
    }

    // Carica consiglio del giorno
    loadDailyTip() {
        const container = document.getElementById('dashboard-daily-tip');
        const tips = [
            {
                icon: '⚔️',
                title: 'Strategia di Combattimento',
                content: 'Bilancia sempre la tua formazione: un tank robusto, DPS equilibrati e un supporto possono fare la differenza!'
            },
            {
                icon: '🏰',
                title: 'Gestione del Castello',
                content: 'Aggiorna sempre la sala del trono prima di potenziare altre stanze per massimizzare l\'efficienza.'
            },
            {
                icon: '💎',
                title: 'Gemme e Equipaggiamento',
                content: 'Non vendere mai le gemme leggendarie! Potrebbero essere utili per upgrade futuri.'
            },
            {
                icon: '🎯',
                title: 'Eventi Speciali',
                content: 'Partecipa sempre agli eventi temporanei: offrono ricompense uniche!'
            },
            {
                icon: '👥',
                title: 'Vita di Clan',
                content: 'Coordina sempre con il tuo clan prima delle guerre. La comunicazione è la chiave!'
            }
        ];

        const today = new Date().getDate();
        const selectedTip = tips[today % tips.length];

        container.innerHTML = `
            <div class="daily-tip-content">
                <div class="tip-icon">${selectedTip.icon}</div>
                <div class="tip-text">
                    <h4>${selectedTip.title}</h4>
                    <p>${selectedTip.content}</p>
                </div>
            </div>
        `;
    }

    // Utility functions
    getWelcomeMessage() {
        const hour = new Date().getHours();
        if (hour < 12) return '🌅 Buongiorno';
        if (hour < 18) return '☀️ Buon pomeriggio';
        return '🌙 Buonasera';
    }

    getRoleDisplay(role) {
        switch (role) {
            case USER_ROLES.SUPERUSER: return '<span class="role-badge role-super">👑 SUPER</span>';
            case USER_ROLES.CLAN_MOD: return '<span class="role-badge role-mod">🛡️ MOD</span>';
            default: return '<span class="role-badge role-user">⚔️ GUERRIERO</span>';
        }
    }

    getClanStatusCard(userClan) {
        if (userClan !== 'Nessuno') {
            return `
                <div class="clan-status-card clan-active">
                    <div class="clan-icon">🏰</div>
                    <div class="clan-info">
                        <strong>Clan: ${userClan}</strong>
                        <p>Accedi alle sezioni dedicate del tuo clan</p>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="clan-status-card clan-none">
                    <div class="clan-icon">⚠️</div>
                    <div class="clan-info">
                        <strong>Non hai un clan</strong>
                        <p>Unisciti per accedere a funzionalità esclusive!</p>
                    </div>
                </div>
            `;
        }
    }

    getSectionIcon(section) {
        const icons = {
            'eventi': '📅',
            'oggetti': '⚔️',
            'novita': '🆕',
            'associa-clan': '🏠',
            'clan-war': '⚔️',
            'clan-premi': '🏆',
            'clan-consigli': '💡',
            'clan-bacheca': '🏰'
        };
        return icons[section] || '📝';
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'mention': return '💬';
            case 'reply': return '↩️';
            case 'like': return '❤️';
            default: return '🔔';
        }
    }

    getNotificationMessage(notification) {
        switch (notification.type) {
            case 'mention': return 'ti ha menzionato';
            case 'reply': return 'ha risposto al tuo thread';
            default: return 'nuova notifica';
        }
    }

    getLoadingHTML() {
        return `
            <div class="dashboard-loading">
                <div class="loading-icon">⏳</div>
                <h2>Caricamento Dashboard...</h2>
                <p>Preparazione della tua area personale</p>
            </div>
        `;
    }

    // Utility per ottenere thread
    async getThreadsFromSection(section) {
        const dataPath = getDataPath(section, 'threads');
        if (!dataPath) return [];

        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            try {
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(threadsRef);
                const threads = [];
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const threadData = childSnapshot.val();
                        if (!threadData.status || threadData.status === 'approved') {
                            threads.push({
                                id: childSnapshot.key,
                                ...threadData
                            });
                        }
                    });
                }
                return threads;
            } catch (error) {
                console.error(`Errore caricamento thread ${section}:`, error);
                return [];
            }
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return threads.filter(t => !t.status || t.status === 'approved');
        }
    }

    async getClanThreadsFromSection(section) {
        return this.getThreadsFromSection(section);
    }

    // Setup auto-refresh
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (currentSection === 'home' && currentUser) {
                this.loadLatestNotifications();
                this.loadLatestGeneralThreads();
                this.loadLatestClanThreads();
            }
        }, 30000); // Refresh ogni 30 secondi
    }

    // Cleanup
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.latestThreadsCache.clear();
    }
}

// Istanza globale del dashboard manager
window.dashboardManager = new DashboardManager();

// Sovrascrive la funzione loadDashboard globale
window.loadDashboard = function() {
    window.dashboardManager.loadDashboard();
};

// Cleanup quando si cambia sezione
const originalSwitchSection = window.switchSection;
window.switchSection = function(sectionKey) {
    if (currentSection === 'home') {
        window.dashboardManager.cleanup();
    }
    return originalSwitchSection(sectionKey);
};