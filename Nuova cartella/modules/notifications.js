// notifications.js - Sistema di notifiche

window.Notifications = {
    // Stato del sistema notifiche
    isInitialized: false,
    listeners: {},
    notifications: [],
    unreadCount: 0,
    lastCheck: 0,
    checkInterval: null,

    /**
     * Inizializza il sistema di notifiche
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('🔔 Inizializzazione sistema notifiche...');
        
        // Carica notifiche esistenti
        this.loadStoredNotifications();
        
        // Imposta controlli periodici
        this.startPeriodicChecks();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Sistema notifiche inizializzato');
    },

    /**
     * Carica notifiche salvate
     */
    loadStoredNotifications() {
        try {
            const stored = localStorage.getItem('hc_notifications');
            this.notifications = stored ? JSON.parse(stored) : [];
            this.updateUnreadCount();
            this.updateUI();
        } catch (error) {
            console.error('Errore caricamento notifiche:', error);
            this.notifications = [];
        }
    },

    /**
     * Salva notifiche
     */
    saveNotifications() {
        try {
            localStorage.setItem('hc_notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Errore salvataggio notifiche:', error);
        }
    },

    /**
     * Avvia controlli periodici
     */
    startPeriodicChecks() {
        // Controlla immediatamente
        this.checkForUpdates();
        
        // Imposta controllo periodico
        this.checkInterval = setInterval(() => {
            this.checkForUpdates();
        }, window.UPDATE_INTERVALS.NOTIFICATIONS_CHECK);
    },

    /**
     * Ferma controlli periodici
     */
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    },

    /**
     * Controlla aggiornamenti
     */
    async checkForUpdates() {
        if (!window.currentUser) return;

        try {
            // Controlla nuovi messaggi in tutte le sezioni chat
            await this.checkNewMessages();
            
            // Controlla thread da moderare se è moderatore
            if (Utils.isClanModerator()) {
                await this.checkPendingModeration();
            }
            
            // Aggiorna badge delle sezioni
            this.updateSectionBadges();
            
            this.lastCheck = Date.now();
        } catch (error) {
            console.error('Errore controllo aggiornamenti:', error);
        }
    },

    /**
     * Controlla nuovi messaggi
     */
    async checkNewMessages() {
        const chatSections = ['chat-generale'];
        
        // Aggiungi chat clan se l'utente è in un clan
        if (Utils.getCurrentUserClan() !== 'Nessuno') {
            chatSections.push('clan-chat');
        }

        for (const section of chatSections) {
            await this.checkSectionMessages(section);
        }
    },

    /**
     * Controlla messaggi di una sezione specifica
     */
    async checkSectionMessages(section) {
        const lastSeen = Utils.getLastSeen(section);
        const dataPath = Utils.getDataPath(section, 'messages');
        
        if (!dataPath) return;

        try {
            let messages = [];
            
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                // Controlla Firebase
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(messagesRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const message = childSnapshot.val();
                        if (message.timestamp > lastSeen && message.authorId !== window.currentUser.uid) {
                            messages.push({
                                id: childSnapshot.key,
                                ...message,
                                section: section
                            });
                        }
                    });
                }
            } else {
                // Controlla localStorage
                const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                const localMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
                
                messages = localMessages.filter(msg => 
                    msg.timestamp > lastSeen && 
                    msg.authorId !== window.currentUser.uid
                );
            }

            // Aggiungi notifiche per nuovi messaggi
            messages.forEach(message => {
                this.addNotification({
                    id: Utils.generateId('notif'),
                    type: window.NOTIFICATION_TYPES.NEW_MESSAGE,
                    title: `💬 Nuovo messaggio in ${this.getSectionDisplayName(section)}`,
                    content: `${message.author}: ${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}`,
                    timestamp: message.timestamp,
                    section: section,
                    read: false
                });
            });

        } catch (error) {
            console.error(`Errore controllo messaggi ${section}:`, error);
        }
    },

    /**
     * Controlla thread in attesa di moderazione
     */
    async checkPendingModeration() {
        const userClan = Utils.getCurrentUserClan();
        if (userClan === 'Nessuno') return;

        try {
            const pendingThreads = await this.getPendingThreadsForClan(userClan);
            const lastCheck = localStorage.getItem('lastModerationCheck') || '0';
            const newPending = pendingThreads.filter(thread => thread.createdAt > parseInt(lastCheck));

            newPending.forEach(thread => {
                this.addNotification({
                    id: Utils.generateId('notif'),
                    type: window.NOTIFICATION_TYPES.PENDING_MODERATION,
                    title: '🛡️ Nuovo contenuto da moderare',
                    content: `Thread "${thread.title}" in attesa di approvazione`,
                    timestamp: thread.createdAt,
                    section: 'clan-moderation',
                    read: false,
                    threadId: thread.id,
                    threadSection: thread.section
                });
            });

            if (newPending.length > 0) {
                localStorage.setItem('lastModerationCheck', Date.now().toString());
            }

        } catch (error) {
            console.error('Errore controllo moderazione:', error);
        }
    },

    /**
     * Ottiene thread in attesa per un clan
     */
    async getPendingThreadsForClan(clanName) {
        const pendingThreads = [];
        const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
        
        for (const section of clanSections) {
            try {
                const dataPath = Utils.getDataPath(section, 'threads');
                if (!dataPath) continue;
                
                let threads = [];
                
                if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                    const { ref, get } = window.firebaseImports;
                    const threadsRef = ref(window.firebaseDatabase, dataPath);
                    const snapshot = await get(threadsRef);
                    
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            const threadData = childSnapshot.val();
                            if (threadData.status === 'pending') {
                                threads.push({
                                    id: childSnapshot.key,
                                    section: section,
                                    ...threadData
                                });
                            }
                        });
                    }
                } else {
                    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                    const localThreads = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    threads = localThreads.filter(t => t.status === 'pending').map(t => ({
                        ...t,
                        section: section
                    }));
                }
                
                pendingThreads.push(...threads);
            } catch (error) {
                console.error(`Errore caricamento thread pending per ${section}:`, error);
            }
        }
        
        return pendingThreads.sort((a, b) => b.createdAt - a.createdAt);
    },

    /**
     * Aggiunge una notifica
     */
    addNotification(notification) {
        // Controlla se la notifica esiste già
        const exists = this.notifications.some(n => 
            n.type === notification.type && 
            n.section === notification.section && 
            n.timestamp === notification.timestamp
        );

        if (!exists) {
            this.notifications.unshift(notification);
            
            // Mantieni solo le ultime 50 notifiche
            if (this.notifications.length > 50) {
                this.notifications = this.notifications.slice(0, 50);
            }

            this.saveNotifications();
            this.updateUnreadCount();
            this.updateUI();
            
            // Mostra popup se la notifica è recente (ultimi 10 secondi)
            if (Date.now() - notification.timestamp < 10000) {
                this.showPopup(notification);
            }
        }
    },

    /**
     * Mostra popup notifica
     */
    showPopup(notification) {
        const popup = document.createElement('div');
        popup.className = 'notification-popup';
        popup.innerHTML = `
            <div class="notification-title">${notification.title}</div>
            <div class="notification-content">${notification.content}</div>
        `;

        // Aggiungi click handler per navigare alla sezione
        popup.addEventListener('click', () => {
            if (notification.section) {
                App.switchSection(notification.section);
                this.markAsRead(notification.id);
            }
            popup.remove();
        });

        document.body.appendChild(popup);

        // Anima l'entrata
        setTimeout(() => popup.classList.add('show'), 100);

        // Rimuovi automaticamente dopo 5 secondi
        setTimeout(() => {
            if (popup.parentNode) {
                popup.classList.remove('show');
                setTimeout(() => popup.remove(), 300);
            }
        }, 5000);
    },

    /**
     * Aggiorna contatore non lette
     */
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
    },

    /**
     * Aggiorna UI notifiche
     */
    updateUI() {
        // Aggiorna badge campana
        const badge = document.getElementById('notificationsBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // Aggiorna lista notifiche
        this.updateNotificationsList();
    },

    /**
     * Aggiorna badge delle sezioni
     */
    updateSectionBadges() {
        Object.keys(window.NOTIFICATION_SECTIONS).forEach(section => {
            const config = window.NOTIFICATION_SECTIONS[section];
            const badge = document.getElementById(config.badge);
            
            if (badge) {
                const lastSeen = Utils.getLastSeen(section);
                const unreadCount = this.getUnreadCountForSection(section, lastSeen);
                
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        });
    },

    /**
     * Ottiene il numero di elementi non letti per una sezione
     */
    getUnreadCountForSection(section, lastSeen) {
        const notifications = this.notifications.filter(n => 
            n.section === section && 
            n.timestamp > lastSeen &&
            !n.read
        );
        return notifications.length;
    },

    /**
     * Aggiorna lista notifiche nel pannello
     */
    updateNotificationsList() {
        const list = document.getElementById('notificationsList');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    Nessuna notifica
                </div>
            `;
            return;
        }

        list.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''}" 
                 onclick="Notifications.handleNotificationClick('${notification.id}')">
                <div class="notification-item-title">${notification.title}</div>
                <div class="notification-item-content">${notification.content}</div>
                <div class="notification-item-time">${Utils.formatTime(notification.timestamp)}</div>
            </div>
        `).join('');
    },

    /**
     * Gestisce click su notifica
     */
    handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Marca come letta
        this.markAsRead(notificationId);

        // Naviga alla sezione se specificata
        if (notification.section) {
            this.togglePanel(); // Chiudi pannello
            App.switchSection(notification.section);
        }
    },

    /**
     * Marca notifica come letta
     */
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.saveNotifications();
            this.updateUnreadCount();
            this.updateUI();
        }
    },

    /**
     * Marca tutte le notifiche come lette
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.updateUnreadCount();
        this.updateUI();
    },

    /**
     * Toggle pannello notifiche
     */
    togglePanel() {
        const panel = document.getElementById('notificationsPanel');
        if (!panel) return;

        const isVisible = panel.classList.contains('show');
        
        if (isVisible) {
            panel.classList.remove('show');
        } else {
            panel.classList.add('show');
            this.updateNotificationsList();
        }
    },

    /**
     * Ottiene nome visualizzato per una sezione
     */
    getSectionDisplayName(sectionKey) {
        const section = window.SECTION_CONFIG[sectionKey];
        return section ? section.title.replace(/[📅⚔️🆕💬🛡️🏰🏆💡]/g, '').trim() : sectionKey;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Chiudi pannello quando si clicca fuori
        document.addEventListener('click', (event) => {
            const panel = document.getElementById('notificationsPanel');
            const bell = document.getElementById('notificationsBell');
            
            if (panel && bell && 
                !panel.contains(event.target) && 
                !bell.contains(event.target) &&
                panel.classList.contains('show')) {
                panel.classList.remove('show');
            }
        });

        // Marca come lette quando si visita una sezione
        document.addEventListener('sectionChanged', (event) => {
            const section = event.detail.section;
            if (window.NOTIFICATION_SECTIONS[section]) {
                Utils.saveLastSeen(section);
                this.updateSectionBadges();
            }
        });
    },

    /**
     * Pulisce il sistema notifiche
     */
    cleanup() {
        this.stopPeriodicChecks();
        this.isInitialized = false;
        console.log('🔔 Sistema notifiche pulito');
    },

    /**
     * Reset completo notifiche (per debug)
     */
    reset() {
        this.notifications = [];
        this.unreadCount = 0;
        localStorage.removeItem('hc_notifications');
        Object.keys(window.NOTIFICATION_SECTIONS).forEach(section => {
            const config = window.NOTIFICATION_SECTIONS[section];
            localStorage.removeItem(config.storageKey);
        });
        localStorage.removeItem('lastModerationCheck');
        this.updateUI();
        console.log('🔔 Notifiche resettate');
    }
};

console.log('🔔 Notifications module loaded');