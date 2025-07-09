// ===============================================
// DASHBOARD MODULE - Modern Dark Theme Design
// VERSIONE COMPLETA CON TUTTI I FIX
// ===============================================

class DashboardManager {
    constructor() {
        this.latestThreadsCache = new Map();
        this.refreshInterval = null;
        this.animationTimers = [];
    }

    // Carica dashboard principale
    loadDashboard() {
        const threadList = document.getElementById('thread-list');

        // Se l'utente non è ancora loggato, mostra loading
        if (!currentUser) {
            threadList.innerHTML = this.getLoadingHTML();
            return;
        }

        // Usa sempre il nickname se disponibile
        const userName = (currentUserData && currentUserData.username) ? 
                        currentUserData.username : 
                        (currentUser.displayName || 'Guerriero');
        const userClan = getCurrentUserClan();
        const userRole = getCurrentUserRole();

        threadList.innerHTML = this.getDashboardHTML(userName, userClan, userRole);

        // Carica contenuti dinamici con animazioni sequential
        this.loadContentWithAnimations();

        // Setup auto-refresh ogni 30 secondi
        this.setupAutoRefresh();
    }

    // Carica contenuti con animazioni sequenziali
    loadContentWithAnimations() {
        const animations = [
            { delay: 100, fn: () => this.loadStatsOverview() },
            { delay: 300, fn: () => this.loadLatestNotifications() },
            { delay: 500, fn: () => this.loadLatestGeneralThreads() },
            { delay: 700, fn: () => this.loadLatestClanThreads() },
            { delay: 900, fn: () => this.animateElements() }
        ];

        animations.forEach(({ delay, fn }) => {
            const timer = setTimeout(fn, delay);
            this.animationTimers.push(timer);
        });
    }

    // Anima elementi della dashboard
    animateElements() {
        // Anima le cards con delay progressivo
        const cards = document.querySelectorAll('.content-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'slideInUp 0.6s ease forwards';
                card.style.opacity = '1';
            }, index * 150);
        });

        // Anima i quick nav cards
        const navCards = document.querySelectorAll('.quick-nav-card');
        navCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'fadeInScale 0.5s ease forwards';
                card.style.opacity = '1';
            }, index * 100);
        });

        // Anima le action buttons
        const actionBtns = document.querySelectorAll('.quick-action-btn');
        actionBtns.forEach((btn, index) => {
            setTimeout(() => {
                btn.style.animation = 'bounceIn 0.6s ease forwards';
                btn.style.opacity = '1';
            }, index * 120);
        });
    }

    // HTML principale della dashboard
    getDashboardHTML(userName, userClan, userRole) {
        return `
            <div class="dashboard-container">
                ${this.getWelcomeSection(userName, userClan, userRole)}
                ${this.getStatsOverview()}
                ${this.getQuickNavigationSection()}
                ${this.getContentGrid()}
                ${this.getQuickActionsSection(userClan)}
            </div>
        `;
    }

    // Sezione benvenuto migliorata
    getWelcomeSection(userName, userClan, userRole) {
        const welcomeMessage = this.getWelcomeMessage();
        const roleDisplay = this.getRoleDisplay(userRole);

        return `
            <div class="dashboard-welcome">
                <div class="welcome-bg-particles"></div>
                <div class="welcome-bg-icon">🏰</div>
                <div class="welcome-content">
                    <h2 class="welcome-title animate-text">
                        ${welcomeMessage}, <span class="username-highlight">${userName}</span>! ${roleDisplay}
                    </h2>
                    <p class="welcome-subtitle">
                        🛡️ Benvenuto nel tuo comando, guerriero! Gestisci il tuo impero e coordina le strategie con la community.
                    </p>
                    ${this.getClanStatusCard(userClan)}
                </div>
            </div>
        `;
    }

    // Nuova sezione statistiche overview
    getStatsOverview() {
        return `
            <div class="stats-overview">
                <div class="stat-card stat-threads">
                    <div class="stat-icon">📝</div>
                    <div class="stat-content">
                        <div class="stat-number" id="total-threads">-</div>
                        <div class="stat-label">Thread Totali</div>
                    </div>
                </div>
                <div class="stat-card stat-messages">
                    <div class="stat-icon">💬</div>
                    <div class="stat-content">
                        <div class="stat-number" id="total-messages">-</div>
                        <div class="stat-label">Messaggi Oggi</div>
                    </div>
                </div>
                <div class="stat-card stat-users">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-number" id="online-users">-</div>
                        <div class="stat-label">Utenti Online</div>
                    </div>
                </div>
                <div class="stat-card stat-clan">
                    <div class="stat-icon">🏰</div>
                    <div class="stat-content">
                        <div class="stat-number" id="clan-power">-</div>
                        <div class="stat-label">Potere Clan</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Navigazione rapida migliorata
    getQuickNavigationSection() {
        return `
            <div class="dashboard-section">
                <h3 class="section-title">
                    <span class="section-icon">🧭</span>
                    <span class="section-text">Navigazione Rapida</span>
                    <div class="section-line"></div>
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
                        <h3><span class="card-icon">🔔</span> Ultime Notifiche</h3>
                        <button class="card-action-btn" onclick="toggleNotificationsPanel()">
                            <span class="btn-text">Vedi Tutte</span>
                            <span class="btn-icon">→</span>
                        </button>
                    </div>
                    <div id="dashboard-notifications" class="card-content">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <span>Caricamento...</span>
                        </div>
                    </div>
                </div>

                <div class="content-card threads-card">
                    <div class="card-header">
                        <h3><span class="card-icon">🌍</span> Thread Generali</h3>
                        <button class="card-action-btn" onclick="switchSection('eventi')">
                            <span class="btn-text">Vedi Tutti</span>
                            <span class="btn-icon">→</span>
                        </button>
                    </div>
                    <div id="dashboard-general-threads" class="card-content">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <span>Caricamento...</span>
                        </div>
                    </div>
                </div>

                <div class="content-card clan-card">
                    <div class="card-header">
                        <h3><span class="card-icon">🏰</span> Attività Clan</h3>
                        <button class="card-action-btn" onclick="switchSection('clan-chat')">
                            <span class="btn-text">Vai al Clan</span>
                            <span class="btn-icon">→</span>
                        </button>
                    </div>
                    <div id="dashboard-clan-threads" class="card-content">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <span>Caricamento...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Azioni rapide migliorate - FIX APPLICATO
    getQuickActionsSection(userClan) {
        return `
            <div class="dashboard-section">
                <h3 class="section-title">
                    <span class="section-icon">⚡</span>
                    <span class="section-text">Azioni Rapide</span>
                    <div class="section-line"></div>
                </h3>
                <div class="quick-actions-grid">
                    ${this.getQuickActionButtons(userClan)}
                </div>
            </div>
        `;
    }

    // Cards navigazione rapida con design aggiornato
    getQuickNavCards() {
        const navItems = [
            { icon: '📅', title: 'Eventi', subtitle: 'Scopri eventi in corso', section: 'eventi', gradient: 'red' },
            { icon: '⚔️', title: 'Oggetti', subtitle: 'Guide armi e armature', section: 'oggetti', gradient: 'purple' },
            { icon: '🆕', title: 'Novità', subtitle: 'Ultimi aggiornamenti', section: 'novita', gradient: 'blue' },
            { icon: '🛋️', title: 'Salotto', subtitle: 'Per parlare del più e del meno', section: 'salotto', gradient: 'yellow'},
            { icon: '💬', title: 'Chat', subtitle: 'Chiacchiera con tutti', section: 'chat-generale', gradient: 'green' }
        ];

        return navItems.map(item => `
            <div class="quick-nav-card nav-card-${item.gradient}" onclick="switchSection('${item.section}')">
                <div class="nav-card-glow"></div>
                <div class="nav-card-icon">${item.icon}</div>
                <div class="nav-card-content">
                    <h4>${item.title}</h4>
                    <p>${item.subtitle}</p>
                </div>
                <div class="nav-card-arrow">→</div>
            </div>
        `).join('');
    }

    // Bottoni azioni rapide aggiornati - FIX APPLICATO
    getQuickActionButtons(userClan) {
        const actions = [
            {
                icon: '🎯',
                title: 'Strategie',
                subtitle: 'Guide e tattiche',
                action: "switchSection('eventi')",
                gradient: 'red'
            },
            {
                icon: '💬',
                title: 'Community',
                subtitle: 'Unisciti alla chat',
                action: "switchSection('chat-generale')",
                gradient: 'green'
            },
            {
                icon: '✍️',
                title: 'Crea Thread',
                subtitle: 'Condividi idee',
                action: "showThreadCreationModal()",
                gradient: 'purple'
            }
        ];

        if (userClan !== 'Nessuno') {
            actions.push({
                icon: '🏰',
                title: 'Clan Wars',
                subtitle: 'Strategia clan',
                action: "switchSection('clan-war')",
                gradient: 'blue'
            });
        }

        return actions.map(action => `
            <button class="quick-action-btn action-${action.gradient}" onclick="${action.action}">
                <div class="action-glow"></div>
                <div class="action-icon">${action.icon}</div>
                <div class="action-content">
                    <div class="action-title">${action.title}</div>
                    <div class="action-subtitle">${action.subtitle}</div>
                </div>
            </button>
        `).join('');
    }

    // Carica statistiche overview con dati reali
    async loadStatsOverview() {
        try {
            // Carica statistiche reali
            const stats = await this.calculateRealStats();
            
            // Aggiorna i contatori con animazione
            setTimeout(() => {
                this.updateStatWithAnimation('total-threads', stats.totalThreads);
                this.updateStatWithAnimation('total-messages', stats.todayMessages);
                this.updateStatWithAnimation('online-users', stats.onlineUsers);
                this.updateStatWithAnimation('clan-power', stats.clanPower);

                // Anima i numeri
                this.animateNumbers();
            }, 800);
            
        } catch (error) {
            console.error('Errore calcolo statistiche:', error);
            // Fallback con dati di esempio
            this.loadFallbackStats();
        }
    }

    // Calcola statistiche reali
    async calculateRealStats() {
        const stats = {
            totalThreads: 0,
            todayMessages: 0,
            onlineUsers: 0,
            clanPower: 0
        };

        // 1. Conta thread totali approvati
        const sections = ['eventi', 'oggetti', 'novita','salotto', 'associa-clan'];
        const userClan = getCurrentUserClan();
        
        if (userClan !== 'Nessuno') {
            sections.push('clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca');
        }

        for (const section of sections) {
            try {
                const threads = await this.getThreadsFromSection(section);
                stats.totalThreads += threads.length;
            } catch (error) {
                console.warn(`Errore conteggio thread ${section}:`, error);
            }
        }

        // 2. Conta messaggi di oggi
        stats.todayMessages = await this.countTodayMessages();

        // 3. Conta utenti "online" (registrati negli ultimi 30 giorni)
        stats.onlineUsers = await this.countActiveUsers();

        // 4. Calcola potere clan
        stats.clanPower = await this.calculateClanPower(userClan);

        return stats;
    }

    // Conta messaggi di oggi
    async countTodayMessages() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        let todayCount = 0;
        const chatSections = ['chat-generale'];
        const userClan = getCurrentUserClan();
        
        if (userClan !== 'Nessuno') {
            chatSections.push('clan-chat');
        }

        for (const section of chatSections) {
            try {
                const messages = await this.getMessagesFromSection(section);
                const todayMessages = messages.filter(msg => msg.timestamp >= todayTimestamp);
                todayCount += todayMessages.length;
            } catch (error) {
                console.warn(`Errore conteggio messaggi ${section}:`, error);
            }
        }

        return todayCount;
    }

    // Conta utenti attivi (registrati negli ultimi 30 giorni)
    async countActiveUsers() {
        try {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
                const usersRef = ref(window.firebaseDatabase, 'users');
                const snapshot = await get(usersRef);
                let activeCount = 0;
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        if (userData.createdAt && userData.createdAt >= thirtyDaysAgo) {
                            activeCount++;
                        }
                    });
                }
                
                return Math.max(activeCount, 1); // Almeno 1 (l'utente corrente)
            } else {
                // Modalità locale
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                const activeUsers = Object.values(users).filter(user => 
                    user.createdAt && user.createdAt >= thirtyDaysAgo
                );
                return Math.max(activeUsers.length, 1);
            }
        } catch (error) {
            console.error('Errore conteggio utenti attivi:', error);
            return 1;
        }
    }

    // Calcola potere clan basato su membri e attività
    async calculateClanPower(userClan) {
        if (userClan === 'Nessuno') {
            return 0;
        }

        try {
            let clanMembers = 0;
            let clanThreads = 0;
            let clanMessages = 0;

            // Conta membri del clan
            if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
                const usersRef = ref(window.firebaseDatabase, 'users');
                const snapshot = await get(usersRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        if (userData.clan === userClan) {
                            clanMembers++;
                        }
                    });
                }
            } else {
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                clanMembers = Object.values(users).filter(user => user.clan === userClan).length;
            }

            // Conta thread clan
            const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
            for (const section of clanSections) {
                try {
                    const threads = await this.getThreadsFromSection(section);
                    clanThreads += threads.length;
                } catch (error) {
                    console.warn(`Errore conteggio thread clan ${section}:`, error);
                }
            }

            // Conta messaggi clan (ultimi 7 giorni)
            try {
                const messages = await this.getMessagesFromSection('clan-chat');
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                clanMessages = messages.filter(msg => msg.timestamp >= weekAgo).length;
            } catch (error) {
                console.warn('Errore conteggio messaggi clan:', error);
            }

            // Formula: (membri * 100) + (thread * 50) + (messaggi * 10)
            const power = (clanMembers * 100) + (clanThreads * 50) + (clanMessages * 10);
            return Math.max(power, 100); // Minimo 100 di potere

        } catch (error) {
            console.error('Errore calcolo potere clan:', error);
            return 100;
        }
    }

    // Ottieni messaggi da una sezione
    async getMessagesFromSection(section) {
        const dataPath = getDataPath(section, 'messages');
        if (!dataPath) return [];

        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            try {
                const messagesRef = ref(window.firebaseDatabase, dataPath);
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
                return messages;
            } catch (error) {
                console.error(`Errore caricamento messaggi ${section}:`, error);
                return [];
            }
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            return JSON.parse(localStorage.getItem(storageKey) || '[]');
        }
    }

    // Aggiorna statistica con animazione
    updateStatWithAnimation(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (value === 0 && elementId === 'clan-power') {
            element.textContent = '-';
        } else {
            // Anima il conteggio da 0 al valore finale
            let current = 0;
            const increment = Math.max(1, Math.ceil(value / 30));
            const timer = setInterval(() => {
                current += increment;
                if (current >= value) {
                    current = value;
                    clearInterval(timer);
                }
                element.textContent = this.formatNumber(current);
            }, 50);
        }
    }

    // Formatta i numeri per renderli più leggibili
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    // Fallback con statistiche realistiche
    loadFallbackStats() {
        console.log('📊 Caricamento statistiche fallback');
        setTimeout(() => {
            // Statistiche più realistiche per una demo
            this.updateStatWithAnimation('total-threads', 12);
            this.updateStatWithAnimation('total-messages', 8);
            this.updateStatWithAnimation('online-users', 3);
            
            const userClan = getCurrentUserClan();
            if (userClan !== 'Nessuno') {
                this.updateStatWithAnimation('clan-power', 450);
            } else {
                document.getElementById('clan-power').textContent = '-';
            }

            this.animateNumbers();
        }, 800);
    }

    // Anima i numeri delle statistiche
    animateNumbers() {
        const numbers = document.querySelectorAll('.stat-number');
        numbers.forEach(num => {
            if (num.textContent !== '-') {
                num.style.animation = 'countUp 1s ease forwards';
            }
        });
    }

    // Carica ultime notifiche per dashboard
    loadLatestNotifications() {
        const container = document.getElementById('dashboard-notifications');
        
        if (!currentUser) {
            container.innerHTML = this.getEmptyState('🔒', 'Accedi per vedere le notifiche');
            return;
        }

        const recentNotifications = notificationsData.slice(0, 3);

        if (recentNotifications.length === 0) {
            container.innerHTML = this.getEmptyState('🔕', 'Nessuna notifica recente');
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
                ${!notif.read ? '<div class="unread-pulse"></div>' : ''}
            </div>
        `).join('');
    }

    // Carica ultimi thread generali - FIX APPLICATO
    async loadLatestGeneralThreads() {
        const container = document.getElementById('dashboard-general-threads');
        const sections = ['eventi', 'oggetti', 'novita','salotto', 'associa-clan'];
        
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
                container.innerHTML = this.getEmptyState('📝', 'Nessun thread recente');
                return;
            }

            // FIX: SOLO NAVIGAZIONE ALLE SEZIONI
            container.innerHTML = recentThreads.map(thread => `
                <div class="thread-item-small dashboard-thread-preview" 
                     onclick="navigateToSection('${thread.section}', '${thread.id}')"
                     data-section="${thread.section}"
                     title="Clicca per andare alla sezione ${this.getSectionName(thread.section)}">
                    <div class="thread-small-icon">${this.getSectionIcon(thread.section)}</div>
                    <div class="thread-small-content">
                        <div class="thread-small-title">${thread.title}</div>
                        <div class="thread-small-meta">
                            <span class="thread-author">${thread.author}</span>
                            <span class="thread-time">${formatTime(thread.createdAt)}</span>
                            <span class="thread-stats">💬 ${thread.replies || 0}</span>
                        </div>
                    </div>
                    <div class="thread-preview-arrow">→</div>
                    <div class="thread-section-label">${this.getSectionName(thread.section)}</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Errore caricamento thread generali:', error);
            container.innerHTML = this.getErrorState();
        }
    }

    // Carica ultimi thread clan - FIX APPLICATO
    async loadLatestClanThreads() {
        const container = document.getElementById('dashboard-clan-threads');
        const userClan = getCurrentUserClan();

        if (userClan === 'Nessuno') {
            container.innerHTML = `
                <div class="empty-state-enhanced">
                    <div class="empty-icon">🏠</div>
                    <div class="empty-title">Nessun Clan</div>
                    <div class="empty-subtitle">Unisciti a un clan per accedere a contenuti esclusivi</div>
                    <button class="join-clan-btn" onclick="switchSection('associa-clan')">
                        <span>Trova un Clan</span>
                        <span class="btn-arrow">→</span>
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
                container.innerHTML = this.getEmptyState('🏰', 'Nessuna attività clan recente');
                return;
            }

            // FIX: SOLO NAVIGAZIONE ALLE SEZIONI
            container.innerHTML = recentClanThreads.map(thread => `
                <div class="thread-item-small clan-thread dashboard-thread-preview" 
                     onclick="navigateToSection('${thread.section}', '${thread.id}')"
                     data-section="${thread.section}"
                     title="Clicca per andare alla sezione ${this.getSectionName(thread.section)}">
                    <div class="thread-small-icon clan-icon">${this.getSectionIcon(thread.section)}</div>
                    <div class="thread-small-content">
                        <div class="thread-small-title">${thread.title}</div>
                        <div class="thread-small-meta">
                            <span class="thread-author">${thread.author}</span>
                            <span class="thread-time">${formatTime(thread.createdAt)}</span>
                            <span class="thread-stats clan-stats">💬 ${thread.replies || 0}</span>
                        </div>
                    </div>
                    <div class="clan-badge">🏰</div>
                    <div class="thread-section-label">${this.getSectionName(thread.section)}</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Errore caricamento thread clan:', error);
            container.innerHTML = this.getErrorState();
        }
    }

    // Funzione per ottenere nome sezione leggibile
    getSectionName(section) {
        const names = {
            'eventi': 'Eventi',
            'oggetti': 'Oggetti',
            'novita': 'Novità',
            'salotto': 'Salotto',
            'associa-clan': 'Associa Clan',
            'clan-war': 'Guerra',
            'clan-premi': 'Premi',
            'clan-consigli': 'Consigli',
            'clan-bacheca': 'Bacheca'
        };
        return names[section] || section;
    }

    // Utility per stati vuoti migliorati
    getEmptyState(icon, message) {
        return `
            <div class="empty-state-enhanced">
                <div class="empty-icon">${icon}</div>
                <div class="empty-message">${message}</div>
            </div>
        `;
    }

    getErrorState() {
        return `
            <div class="error-state-enhanced">
                <div class="error-icon">⚠️</div>
                <div class="error-message">Errore nel caricamento</div>
            </div>
        `;
    }

    // Utility functions aggiornate
    getWelcomeMessage() {
        const hour = new Date().getHours();
        if (hour < 12) return '🌅 Buongiorno';
        if (hour < 18) return '☀️ Buon pomeriggio';
        return '🌙 Buonasera';
    }

    getRoleDisplay(role) {
        switch (role) {
            case USER_ROLES.SUPERUSER: return '<span class="role-badge role-super">👑 IMPERATORE</span>';
            case USER_ROLES.CLAN_MOD: return '<span class="role-badge role-mod">🛡️ COMANDANTE</span>';
            default: return '<span class="role-badge role-user">⚔️ GUERRIERO</span>';
        }
    }

    getClanStatusCard(userClan) {
        if (userClan !== 'Nessuno') {
            return `
                <div class="clan-status-card clan-active">
                    <div class="clan-glow"></div>
                    <div class="clan-icon">🏰</div>
                    <div class="clan-info">
                        <div class="clan-name">${userClan}</div>
                        <div class="clan-subtitle">Il tuo impero ti aspetta, comandante!</div>
                    </div>
                    <div class="clan-power-indicator"></div>
                </div>
            `;
        } else {
            return `
                <div class="clan-status-card clan-none">
                    <div class="clan-icon">⚠️</div>
                    <div class="clan-info">
                        <div class="clan-name">Senza Alleanze</div>
                        <div class="clan-subtitle">Unisciti a un clan per conquistare insieme!</div>
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
                <div class="loading-castle">🏰</div>
                <div class="loading-text">
                    <h2>Preparando il Comando...</h2>
                    <p>Caricamento della tua fortezza digitale</p>
                </div>
                <div class="loading-bar">
                    <div class="loading-progress"></div>
                </div>
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
                this.loadStatsOverview();
                this.loadLatestNotifications();
                this.loadLatestGeneralThreads();
                this.loadLatestClanThreads();
            }
        }, 60000); // Refresh ogni minuto
    }

    // Cleanup migliorato
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Pulisci i timer di animazione
        this.animationTimers.forEach(timer => clearTimeout(timer));
        this.animationTimers = [];
        
        this.latestThreadsCache.clear();
    }
}

// ===============================================
// DASHBOARD QUICK ACTIONS FIX - Thread Creation
// ===============================================

// Il problema: le azioni rapide della dashboard aprono il modal di creazione thread
// ma currentSection è "home", quindi il thread non sa dove essere salvato

// 1. OVERRIDE della funzione showThreadCreationModal quando siamo nella dashboard
const originalShowThreadCreationModal = window.showThreadCreationModal;

window.showThreadCreationModal = function(targetSection = null) {
    console.log('🎯 Apertura modal creazione thread');
    console.log('- Sezione corrente:', currentSection);
    console.log('- Sezione target:', targetSection);
    
    // Se siamo nella dashboard, chiedi dove creare il thread
    if (currentSection === 'home' && !targetSection) {
        showSectionSelectionModal();
        return;
    }
    
    // Se abbiamo una sezione target, vai lì prima di aprire il modal
    if (targetSection && targetSection !== currentSection) {
        console.log(`🔄 Reindirizzamento a sezione: ${targetSection}`);
        switchSection(targetSection);
        
        // Aspetta che la sezione sia caricata, poi apri il modal
        setTimeout(() => {
            originalShowThreadCreationModal.call(this);
        }, 500);
        return;
    }
    
    // Esegui la funzione originale
    originalShowThreadCreationModal.call(this);
};

// 2. Modal per selezione sezione quando si crea thread dalla dashboard
function showSectionSelectionModal() {
    // Rimuovi modal esistente se presente
    const existingModal = document.getElementById('sectionSelectionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Ottieni sezioni disponibili per l'utente
    const availableSections = getAvailableSectionsForUser();
    
    const modal = document.createElement('div');
    modal.id = 'sectionSelectionModal';
    modal.className = 'section-selection-modal';
    modal.innerHTML = `
        <div class="section-selection-content">
            <h3>Dove vuoi creare il thread?</h3>
            <p>Seleziona la sezione più appropriata per il tuo thread:</p>
            
            <div class="section-selection-grid">
                ${availableSections.map(section => `
                    <button class="section-selection-btn" onclick="createThreadInSection('${section.key}')">
                        <div class="section-icon">${section.icon}</div>
                        <div class="section-info">
                            <div class="section-name">${section.name}</div>
                            <div class="section-desc">${section.description}</div>
                        </div>
                    </button>
                `).join('')}
            </div>
            
            <div class="section-selection-actions">
                <button class="btn-cancel-selection" onclick="closeSectionSelectionModal()">
                    Annulla
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Previeni scroll del body
    document.body.style.overflow = 'hidden';
}

// 3. Funzione per ottenere sezioni disponibili per l'utente
function getAvailableSectionsForUser() {
    const sections = [
        {
            key: 'eventi',
            name: 'Eventi',
            icon: '📅',
            description: 'Discussioni su eventi del gioco'
        },
        {
            key: 'oggetti',
            name: 'Oggetti',
            icon: '⚔️',
            description: 'Guide su armi e armature'
        },
        {
            key: 'novita',
            name: 'Novità',
            icon: '🆕',
            description: 'Ultime notizie e aggiornamenti'
        },
        {
            key: 'salotto',
            name: 'Salotto',
            icon: '🛋️',
            description: 'Dove rilassarsi e parlare del più e del meno'
        },
        {
            key: 'associa-clan',
            name: 'Associa Clan',
            icon: '🏠',
            description: 'Richieste di associazione ai clan'
        }
    ];
    
    // Aggiungi sezioni clan se l'utente appartiene a un clan
    const userClan = getCurrentUserClan();
    if (userClan !== 'Nessuno') {
        sections.push(
            {
                key: 'clan-war',
                name: 'Guerra Clan',
                icon: '⚔️',
                description: 'Strategie e coordinamento guerre'
            },
            {
                key: 'clan-premi',
                name: 'Premi Clan',
                icon: '🏆',
                description: 'Ricompense e achievement'
            },
            {
                key: 'clan-consigli',
                name: 'Consigli Clan',
                icon: '💡',
                description: 'Suggerimenti per i membri'
            },
            {
                key: 'clan-bacheca',
                name: 'Bacheca Clan',
                icon: '🏰',
                description: 'Messaggi importanti del clan'
            }
        );
    }
    
    // Filtra sezioni in base ai permessi
    return sections.filter(section => canAccessSection(section.key));
}

// 4. Funzione per creare thread in una sezione specifica
window.createThreadInSection = function(sectionKey) {
    console.log(`📝 Creazione thread in sezione: ${sectionKey}`);
    
    // Chiudi modal di selezione
    closeSectionSelectionModal();
    
    // Vai alla sezione e apri il modal di creazione
    switchSection(sectionKey);
    
    // Aspetta che la sezione sia caricata, poi apri il modal
    setTimeout(() => {
        showThreadCreationModal(sectionKey);
    }, 600);
};

// 5. Funzione per chiudere modal di selezione sezione
window.closeSectionSelectionModal = function() {
    const modal = document.getElementById('sectionSelectionModal');
    if (modal) {
        modal.remove();
    }
    
    // Ripristina scroll del body
    document.body.style.overflow = 'auto';
};

// 6. OVERRIDE della funzione createThread per gestire meglio la sezione
const originalCreateThread = window.createThread;

window.createThread = async function() {
    console.log('📝 Creazione thread avviata');
    console.log('- Sezione corrente:', currentSection);
    
    // Verifica che non siamo nella dashboard
    if (currentSection === 'home') {
        console.error('❌ Tentativo di creare thread dalla dashboard!');
        alert('Errore: seleziona prima una sezione per creare il thread.');
        hideThreadCreationModal();
        showSectionSelectionModal();
        return;
    }
    
    // Verifica accesso alla sezione
    if (!canAccessSection(currentSection)) {
        console.error('❌ Accesso negato alla sezione:', currentSection);
        alert('Non hai i permessi per creare thread in questa sezione.');
        hideThreadCreationModal();
        return;
    }
    
    // Esegui la creazione normale
    return originalCreateThread.call(this);
};

// ===============================================
// DASHBOARD THREAD NAVIGATION - PROBLEMA RISOLTO
// ===============================================

// Funzione globale per navigare alle sezioni (NON aprire thread)
window.navigateToSection = function(targetSection, highlightThreadId = null) {
    console.log(`🧭 Navigazione a sezione: ${targetSection} ${highlightThreadId ? `(evidenzia: ${highlightThreadId})` : ''}`);
    
    // Controlla accesso alla sezione
    if (!canAccessSection(targetSection)) {
        if (targetSection.startsWith('clan-')) {
            alert('Devi appartenere a un clan per accedere a questa sezione!');
            return;
        } else if (targetSection.startsWith('admin-')) {
            alert('Non hai i permessi per accedere a questa sezione!');
            return;
        }
    }

    // Vai alla sezione
    switchSection(targetSection);
    
    // Se c'è un thread da evidenziare, lo facciamo dopo che la sezione è caricata
    if (highlightThreadId) {
        setTimeout(() => {
            highlightThread(highlightThreadId);
        }, 800);
    }
};

// Funzione per evidenziare un thread nella lista (invece di aprirlo)
window.highlightThread = function(threadId) {
    console.log(`✨ Evidenziazione thread: ${threadId}`);
    
    // Cerca il thread nella lista
    const threadElements = document.querySelectorAll(`[onclick*="${threadId}"]`);
    
    if (threadElements.length > 0) {
        const threadElement = threadElements[0];
        
        // Scrolla verso l'elemento
        threadElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Evidenzia temporaneamente
        threadElement.classList.add('highlighted-thread');
        
        // Rimuovi evidenziazione dopo 3 secondi
        setTimeout(() => {
            threadElement.classList.remove('highlighted-thread');
        }, 3000);
        
        console.log(`✅ Thread ${threadId} evidenziato`);
    } else {
        console.log(`⚠️ Thread ${threadId} non trovato nella lista`);
    }
};

// Sovrascrive openThread per controllare la sezione corrente
const originalOpenThread = window.openThread;
window.openThread = function(threadId, section) {
    // Controlla se siamo nella dashboard
    if (currentSection === 'home') {
        console.log('🚫 Tentativo di aprire thread dalla dashboard impedito');
        console.log(`👉 Usa navigateToSection('${section}', '${threadId}') invece`);
        
        // Naviga alla sezione invece di aprire il thread
        navigateToSection(section, threadId);
        return;
    }
    
    // Controlla se siamo nella sezione corretta
    if (currentSection !== section) {
        console.log(`⚠️ Tentativo di aprire thread ${threadId} dalla sezione sbagliata`);
        console.log(`Sezione corrente: ${currentSection}, richiesta: ${section}`);
        
        // Naviga alla sezione corretta
        navigateToSection(section, threadId);
        return;
    }
    
    // Esegui apertura normale
    return originalOpenThread.call(this, threadId, section);
};

// ===============================================
// GESTIONE EVENTI E CLEANUP
// ===============================================

// Gestione escape key per chiudere modal selezione sezione
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('sectionSelectionModal');
        if (modal) {
            closeSectionSelectionModal();
        }
    }
});

// Prevenzione click fuori dal modal
document.addEventListener('click', function(e) {
    const modal = document.getElementById('sectionSelectionModal');
    if (modal && e.target === modal) {
        closeSectionSelectionModal();
    }
});

// Cleanup quando si cambia sezione
const originalSwitchSection = window.switchSection;
window.switchSection = function(sectionKey) {
    // Chiudi modal di selezione se aperto
    closeSectionSelectionModal();
    
    // Pulisci dashboard manager se stiamo uscendo dalla home
    if (currentSection === 'home') {
        window.dashboardManager.cleanup();
    }
    
    // Esegui switch normale
    return originalSwitchSection.call(this, sectionKey);
};

// ===============================================
// INIZIALIZZAZIONE E ISTANZE GLOBALI
// ===============================================

// Istanza globale del dashboard manager
window.dashboardManager = new DashboardManager();

// Sovrascrive la funzione loadDashboard globale
window.loadDashboard = function() {
    console.log('📊 Caricamento dashboard con tutti i fix applicati...');
    
    // Esegui caricamento dashboard
    window.dashboardManager.loadDashboard();
    
    // Applica fix dopo caricamento
    setTimeout(() => {
        // Marca i thread come preview
        const dashboardThreads = document.querySelectorAll('.dashboard-thread-preview');
        dashboardThreads.forEach(thread => {
            thread.setAttribute('data-dashboard-preview', 'true');
        });
        
        console.log('✅ Tutti i fix dashboard applicati');
    }, 1000);
};

// ===============================================
// FUNZIONI DI DEBUG
// ===============================================

// Funzione di debug per testare le azioni rapide
window.debugQuickActions = function() {
    console.log('🔍 Debug Azioni Rapide:');
    console.log('- Sezione corrente:', currentSection);
    console.log('- Sezioni disponibili:', getAvailableSectionsForUser().map(s => s.key));
    console.log('- Modal selezione presente:', !!document.getElementById('sectionSelectionModal'));
    
    // Testa la funzione di creazione
    console.log('🧪 Test apertura modal selezione...');
    showSectionSelectionModal();
};

// Debug per thread navigation
window.debugDashboardThreads = function() {
    console.log('🔍 Debug Dashboard Threads:');
    console.log('- Sezione corrente:', currentSection);
    console.log('- Thread dashboard trovati:', document.querySelectorAll('.dashboard-thread-preview').length);
    
    // Mostra tutti i thread con onclick
    const threadsWithClick = document.querySelectorAll('[onclick*="openThread"]');
    console.log('- Thread con openThread:', threadsWithClick.length);
    
    threadsWithClick.forEach((thread, index) => {
        console.log(`  ${index + 1}. ${thread.onclick}`);
    });
};

console.log('🚀 Dashboard completo con tutti i fix caricato!');