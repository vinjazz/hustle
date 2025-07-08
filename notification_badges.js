// ===============================================
// NOTIFICATION BADGES SYSTEM
// Sistema per mostrare badge con contenuti nuovi
// ===============================================

class NotificationBadges {
    constructor() {
        this.lastVisited = {}; // Cache per ultima visita per sezione
        this.newCounts = {}; // Contatori contenuti nuovi
        this.listeners = {}; // Listener Firebase
        this.initialized = false;
    }

    // Inizializza il sistema badge
    async initialize(currentUser) {
        if (this.initialized || !currentUser) return;
        
        console.log('🏷️ Inizializzazione sistema badge...');
        
        this.currentUser = currentUser;
        await this.loadLastVisited();
        await this.calculateNewCounts();
        this.updateAllBadges();
        this.setupRealtimeListeners();
        
        this.initialized = true;
        console.log('✅ Sistema badge inizializzato');
    }

    // Pulisce tutto al logout
    cleanup() {
        console.log('🧹 Pulizia sistema badge...');
        
        this.cleanupListeners();
        this.clearAllBadges();
        this.lastVisited = {};
        this.newCounts = {};
        this.initialized = false;
        this.currentUser = null;
    }

    // Carica ultima visita per sezione
    async loadLastVisited() {
        if (!this.currentUser) return;

        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                // Carica da Firebase - usa il path users esistente
                const ref = window.firebaseImports.ref;
                const get = window.firebaseImports.get;
                
                const lastVisitedRef = ref(window.firebaseDatabase, `users/${this.currentUser.uid}/lastVisited`);
                const snapshot = await get(lastVisitedRef);
                
                if (snapshot.exists()) {
                    this.lastVisited = snapshot.val();
                } else {
                    // Prima volta - imposta tutto a ora
                    this.lastVisited = this.getDefaultLastVisited();
                    await this.saveLastVisited();
                }
            } else {
                // Modalità locale
                const storageKey = `hc_last_visited_${this.currentUser.uid}`;
                const stored = localStorage.getItem(storageKey);
                
                if (stored) {
                    this.lastVisited = JSON.parse(stored);
                } else {
                    this.lastVisited = this.getDefaultLastVisited();
                    this.saveLastVisitedLocal();
                }
            }

            console.log('📊 Ultima visita caricata:', this.lastVisited);
        } catch (error) {
            console.warn('⚠️ Errore caricamento ultima visita:', error.message);
            console.log('🔄 Fallback a modalità locale...');
            // Fallback a modalità locale
            this.lastVisited = this.getDefaultLastVisited();
            this.saveLastVisitedLocal();
        }
    }

    // Salva ultima visita
    async saveLastVisited() {
        if (!this.currentUser) return;

        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                const ref = window.firebaseImports.ref;
                const update = window.firebaseImports.update;
                
                // Usa update invece di set per non sovrascrivere altri dati utente
                const updates = {};
                updates[`users/${this.currentUser.uid}/lastVisited`] = this.lastVisited;
                await update(ref(window.firebaseDatabase), updates);
            } else {
                this.saveLastVisitedLocal();
            }
        } catch (error) {
            console.warn('⚠️ Errore salvataggio Firebase:', error.message);
            console.log('🔄 Salvataggio locale come fallback...');
            // Fallback a salvataggio locale
            this.saveLastVisitedLocal();
        }
    }

    // Salva locale
    saveLastVisitedLocal() {
        if (!this.currentUser) return;
        
        const storageKey = `hc_last_visited_${this.currentUser.uid}`;
        localStorage.setItem(storageKey, JSON.stringify(this.lastVisited));
    }

    // Default ultima visita (ora per tutte le sezioni)
    getDefaultLastVisited() {
        const now = Date.now();
        const lastVisited = {};
        
        Object.keys(window.sectionConfig || {}).forEach(sectionKey => {
            lastVisited[sectionKey] = now;
        });
        
        return lastVisited;
    }

    // Calcola contenuti nuovi dall'ultima visita
    async calculateNewCounts() {
        console.log('🔢 Calcolo contenuti nuovi...');
        
        this.newCounts = {};
        
        // Calcola per ogni sezione
        for (const sectionKey of Object.keys(window.sectionConfig || {})) {
            const section = window.sectionConfig[sectionKey];
            const lastVisit = this.lastVisited[sectionKey] || 0;
            
            let newCount = 0;
            
            if (section.type === 'forum') {
                // Conta thread nuovi
                newCount = await this.countNewThreads(sectionKey, lastVisit);
            } else if (section.type === 'chat') {
                // Conta messaggi nuovi
                newCount = await this.countNewMessages(sectionKey, lastVisit);
            }
            
            this.newCounts[sectionKey] = newCount;
        }
        
        console.log('📊 Conteggi nuovi:', this.newCounts);
    }

    // Conta thread nuovi in una sezione
    async countNewThreads(sectionKey, lastVisit) {
        try {
            const dataPath = this.getDataPath(sectionKey, 'threads');
            if (!dataPath) return 0;
            
            let count = 0;
            
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                const ref = window.firebaseImports.ref;
                const get = window.firebaseImports.get;
                
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(threadsRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const thread = childSnapshot.val();
                        if (thread.createdAt > lastVisit && 
                            (!thread.status || thread.status === 'approved')) {
                            count++;
                        }
                    });
                }
            } else {
                // Modalità locale
                const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
                
                count = threads.filter(thread => 
                    thread.createdAt > lastVisit && 
                    (!thread.status || thread.status === 'approved')
                ).length;
            }
            
            return count;
        } catch (error) {
            console.error(`Errore conteggio thread ${sectionKey}:`, error);
            return 0;
        }
    }

    // Conta messaggi nuovi in una chat
    async countNewMessages(sectionKey, lastVisit) {
        try {
            const dataPath = this.getDataPath(sectionKey, 'messages');
            if (!dataPath) return 0;
            
            let count = 0;
            
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                const ref = window.firebaseImports.ref;
                const get = window.firebaseImports.get;
                
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(messagesRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const message = childSnapshot.val();
                        if (message.timestamp > lastVisit && 
                            message.authorId !== this.currentUser.uid) { // Non contare i propri messaggi
                            count++;
                        }
                    });
                }
            } else {
                // Modalità locale
                const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
                
                count = messages.filter(message => 
                    message.timestamp > lastVisit && 
                    message.authorId !== this.currentUser.uid
                ).length;
            }
            
            return count;
        } catch (error) {
            console.error(`Errore conteggio messaggi ${sectionKey}:`, error);
            return 0;
        }
    }

    // Setup listener in tempo reale
    setupRealtimeListeners() {
        if (!window.useFirebase || !window.firebaseDatabase || !window.firebaseReady) {
            return;
        }

        console.log('👂 Setup listener tempo reale per badge...');
        
        Object.keys(window.sectionConfig || {}).forEach(sectionKey => {
            const section = window.sectionConfig[sectionKey];
            
            if (section.type === 'forum') {
                this.setupThreadListener(sectionKey);
            } else if (section.type === 'chat') {
                this.setupMessageListener(sectionKey);
            }
        });
    }

    // Listener per thread
    setupThreadListener(sectionKey) {
        const dataPath = this.getDataPath(sectionKey, 'threads');
        if (!dataPath) return;

        const ref = window.firebaseImports.ref;
        const onValue = window.firebaseImports.onValue;
        
        const threadsRef = ref(window.firebaseDatabase, dataPath);
        
        const callback = (snapshot) => {
            const lastVisit = this.lastVisited[sectionKey] || 0;
            let newCount = 0;
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const thread = childSnapshot.val();
                    if (thread.createdAt > lastVisit && 
                        (!thread.status || thread.status === 'approved')) {
                        newCount++;
                    }
                });
            }
            
            this.newCounts[sectionKey] = newCount;
            this.updateBadge(sectionKey);
        };
        
        this.listeners[`threads_${sectionKey}`] = { ref: threadsRef, callback };
        onValue(threadsRef, callback);
    }

    // Listener per messaggi
    setupMessageListener(sectionKey) {
        const dataPath = this.getDataPath(sectionKey, 'messages');
        if (!dataPath) return;

        const ref = window.firebaseImports.ref;
        const onValue = window.firebaseImports.onValue;
        
        const messagesRef = ref(window.firebaseDatabase, dataPath);
        
        const callback = (snapshot) => {
            const lastVisit = this.lastVisited[sectionKey] || 0;
            let newCount = 0;
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const message = childSnapshot.val();
                    if (message.timestamp > lastVisit && 
                        message.authorId !== this.currentUser.uid) {
                        newCount++;
                    }
                });
            }
            
            this.newCounts[sectionKey] = newCount;
            this.updateBadge(sectionKey);
        };
        
        this.listeners[`messages_${sectionKey}`] = { ref: messagesRef, callback };
        onValue(messagesRef, callback);
    }

    // Pulisci listener
    cleanupListeners() {
        if (!window.useFirebase || !window.firebaseDatabase || !window.firebaseReady) {
            return;
        }

        const off = window.firebaseImports.off;
        
        Object.values(this.listeners).forEach(listener => {
            off(listener.ref, listener.callback);
        });
        
        this.listeners = {};
    }

    // Aggiorna tutti i badge
    updateAllBadges() {
        Object.keys(window.sectionConfig || {}).forEach(sectionKey => {
            this.updateBadge(sectionKey);
        });
    }

    // Aggiorna badge singolo
    updateBadge(sectionKey) {
        const navItem = document.querySelector(`[data-section="${sectionKey}"]`);
        if (!navItem) return;

        const count = this.newCounts[sectionKey] || 0;
        
        // Rimuovi badge esistente
        const existingBadge = navItem.querySelector('.nav-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Aggiungi nuovo badge se necessario
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = count > 99 ? '99+' : count.toString();
            navItem.appendChild(badge);
        }
    }

    // Pulisci tutti i badge
    clearAllBadges() {
        document.querySelectorAll('.nav-badge').forEach(badge => badge.remove());
    }

    // Segna sezione come visitata
    async markSectionAsVisited(sectionKey) {
        const now = Date.now();
        this.lastVisited[sectionKey] = now;
        this.newCounts[sectionKey] = 0;
        
        // Aggiorna badge
        this.updateBadge(sectionKey);
        
        // Salva nel database
        await this.saveLastVisited();
        
        console.log(`✅ Sezione ${sectionKey} segnata come visitata`);
    }

    // Incrementa contatore per sezione (per modalità locale)
    incrementCounter(sectionKey, isOwnContent = false) {
        if (!this.initialized || isOwnContent) return;
        
        this.newCounts[sectionKey] = (this.newCounts[sectionKey] || 0) + 1;
        this.updateBadge(sectionKey);
    }

    // Ottieni path dati (stessa logica del main script)
    getDataPath(sectionKey, dataType) {
        if (sectionKey.startsWith('clan-')) {
            const userClan = this.getCurrentUserClan();
            if (userClan === 'Nessuno') {
                return null;
            }
            const safeClanName = userClan.replace(/[.#$[\]]/g, '_');
            return `${dataType}/clan/${safeClanName}/${sectionKey}`;
        } else {
            return `${dataType}/${sectionKey}`;
        }
    }

    // Ottieni clan utente corrente
    getCurrentUserClan() {
        const clanElement = document.getElementById('currentClan');
        return clanElement ? clanElement.textContent : 'Nessuno';
    }

    // Debug info
    getDebugInfo() {
        return {
            initialized: this.initialized,
            user: this.currentUser?.uid,
            lastVisited: this.lastVisited,
            newCounts: this.newCounts,
            listenersCount: Object.keys(this.listeners).length
        };
    }
}

// Istanza globale
window.notificationBadges = new NotificationBadges();

// Hook nel sistema esistente
(function() {
    // Backup funzioni originali
    const originalSwitchSection = window.switchSection;
    const originalHandleUserLogin = window.handleUserLogin;
    const originalHandleUserLogout = window.handleUserLogout;
    const originalSaveLocalMessage = window.saveLocalMessage;
    const originalSaveLocalThread = window.saveLocalThread;

    // Override switchSection per segnare come visitata
    window.switchSection = function(sectionKey) {
        const result = originalSwitchSection.call(this, sectionKey);
        
        // Segna sezione come visitata se badge system è attivo
        if (window.notificationBadges.initialized) {
            window.notificationBadges.markSectionAsVisited(sectionKey);
        }
        
        return result;
    };

    // Override login per inizializzare badge
    window.handleUserLogin = function(user) {
        const result = originalHandleUserLogin.call(this, user);
        
        // Inizializza badge system dopo login
        setTimeout(() => {
            window.notificationBadges.initialize(user);
        }, 1000);
        
        return result;
    };

    // Override logout per pulire badge
    window.handleUserLogout = function() {
        window.notificationBadges.cleanup();
        return originalHandleUserLogout.call(this);
    };

    // Override save message locale per incrementare counter
    window.saveLocalMessage = function(section, messageData) {
        const result = originalSaveLocalMessage.call(this, section, messageData);
        
        // Incrementa counter se non è un messaggio proprio
        if (window.notificationBadges.initialized && 
            messageData.authorId !== window.notificationBadges.currentUser?.uid) {
            window.notificationBadges.incrementCounter(section);
        }
        
        return result;
    };

    // Override save thread locale per incrementare counter
    window.saveLocalThread = function(section, threadData) {
        const result = originalSaveLocalThread.call(this, section, threadData);
        
        // Incrementa counter se non è un thread proprio
        if (window.notificationBadges.initialized && 
            threadData.authorId !== window.notificationBadges.currentUser?.uid) {
            window.notificationBadges.incrementCounter(section);
        }
        
        return result;
    };
})();

// Funzioni di debug
window.debugBadges = function() {
    console.log('🏷️ Debug Sistema Badge:', window.notificationBadges.getDebugInfo());
};

window.resetBadges = function() {
    window.notificationBadges.lastVisited = window.notificationBadges.getDefaultLastVisited();
    window.notificationBadges.saveLastVisited();
    window.notificationBadges.calculateNewCounts().then(() => {
        window.notificationBadges.updateAllBadges();
    });
    console.log('🔄 Badge resettati');
};

window.testBadge = function(sectionKey) {
    window.notificationBadges.incrementCounter(sectionKey || 'chat-generale');
    console.log(`🧪 Badge test incrementato per ${sectionKey || 'chat-generale'}`);
};

console.log('🏷️ Sistema Notification Badges caricato');