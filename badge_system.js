// ===============================================
// BADGE SYSTEM - SISTEMA NOTIFICHE SEZIONI
// ===============================================

/**
 * Sistema completo per gestire i badge di notifica delle sezioni
 * Mostra badge numerici quando ci sono nuovi contenuti dall'ultimo accesso
 */

class BadgeSystem {
    constructor() {
        this.lastVisitData = {}; // Ultima visita per sezione
        this.badgeCounters = {}; // Contatori attuali
        this.isInitialized = false;
        this.listeners = {}; // Listeners attivi
        
        console.log('🏷️ Badge System inizializzato');
    }

    // ===============================================
    // INIZIALIZZAZIONE
    // ===============================================

    async initialize(currentUser) {
        if (!currentUser) {
            console.log('⚠️ Badge System: Nessun utente, skip inizializzazione');
            return;
        }

        this.currentUser = currentUser;
        this.isInitialized = true;

        console.log('🏷️ Inizializzazione Badge System per:', currentUser.email);

        // Carica dati ultima visita
        await this.loadLastVisitData();

        // Inizializza badge per tutte le sezioni
        await this.initializeAllBadges();

        // Setup listeners per aggiornamenti in tempo reale
        this.setupRealtimeListeners();

        // Aggiorna timestamp login generale
        await this.updateLastLogin();

        console.log('✅ Badge System completamente inizializzato');
    }

    // Pulisci tutto al logout
    cleanup() {
        console.log('🧹 Cleanup Badge System');
        
        // Rimuovi tutti i listeners
        this.cleanupListeners();
        
        // Reset dati
        this.lastVisitData = {};
        this.badgeCounters = {};
        this.isInitialized = false;
        this.currentUser = null;
        
        // Rimuovi tutti i badge dalla UI
        this.removeAllBadges();
    }

    // ===============================================
    // GESTIONE DATI ULTIMA VISITA
    // ===============================================

    async loadLastVisitData() {
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                // Carica da Firebase
                const { ref, get } = window.firebaseImports;
                const visitsRef = ref(window.firebaseDatabase, `userVisits/${this.currentUser.uid}`);
                const snapshot = await get(visitsRef);
                
                if (snapshot.exists()) {
                    this.lastVisitData = snapshot.val();
                } else {
                    this.lastVisitData = { lastLogin: Date.now() };
                }
            } else {
                // Carica da localStorage
                const storageKey = `hc_user_visits_${this.currentUser.uid}`;
                this.lastVisitData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                
                if (!this.lastVisitData.lastLogin) {
                    this.lastVisitData.lastLogin = Date.now();
                }
            }

            console.log('📅 Dati ultima visita caricati:', this.lastVisitData);
        } catch (error) {
            console.error('Errore caricamento dati visita:', error);
            this.lastVisitData = { lastLogin: Date.now() };
        }
    }

    async saveLastVisitData() {
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                // Salva su Firebase
                const { ref, set } = window.firebaseImports;
                const visitsRef = ref(window.firebaseDatabase, `userVisits/${this.currentUser.uid}`);
                await set(visitsRef, this.lastVisitData);
            } else {
                // Salva su localStorage
                const storageKey = `hc_user_visits_${this.currentUser.uid}`;
                localStorage.setItem(storageKey, JSON.stringify(this.lastVisitData));
            }
        } catch (error) {
            console.error('Errore salvataggio dati visita:', error);
        }
    }

    async updateLastLogin() {
        this.lastVisitData.lastLogin = Date.now();
        await this.saveLastVisitData();
        console.log('⏰ Timestamp ultimo login aggiornato');
    }

    async updateSectionVisit(sectionKey) {
        this.lastVisitData[sectionKey] = Date.now();
        await this.saveLastVisitData();
        
        // Rimuovi badge dalla sezione visitata
        this.removeBadge(sectionKey);
        
        console.log(`🏷️ Visita aggiornata per sezione: ${sectionKey}`);
    }

    // ===============================================
    // INIZIALIZZAZIONE BADGE
    // ===============================================

    async initializeAllBadges() {
        console.log('🏷️ Inizializzazione badge per tutte le sezioni...');

        // Reset contatori
        this.badgeCounters = {};

        // Lista sezioni da controllare
        const sectionsToCheck = [
            // Sezioni generali
            'eventi', 'oggetti', 'novita', 'chat-generale', 'associa-clan',
            // Sezioni clan (se l'utente appartiene a un clan)
            ...this.getClanSections()
        ];

        // Calcola badge per ogni sezione
        for (const section of sectionsToCheck) {
            await this.calculateSectionBadge(section);
        }

        // Aggiorna UI
        this.updateAllBadgesUI();

        console.log('✅ Badge inizializzati per', sectionsToCheck.length, 'sezioni');
    }

    getClanSections() {
        const userClan = this.getCurrentUserClan();
        if (userClan === 'Nessuno') return [];

        return ['clan-chat', 'clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
    }

    getCurrentUserClan() {
        // Usa la funzione globale esistente
        if (typeof getCurrentUserClan === 'function') {
            return getCurrentUserClan();
        }
        return 'Nessuno';
    }

    // ===============================================
    // CALCOLO BADGE PER SEZIONE
    // ===============================================

    async calculateSectionBadge(sectionKey) {
        try {
            const section = window.sectionConfig[sectionKey];
            if (!section) return;

            let newCount = 0;
            const lastVisit = this.getLastVisitForSection(sectionKey);

            if (section.type === 'forum') {
                newCount = await this.countNewThreads(sectionKey, lastVisit);
            } else if (section.type === 'chat') {
                newCount = await this.countNewMessages(sectionKey, lastVisit);
            }

            this.badgeCounters[sectionKey] = newCount;
            
            if (newCount > 0) {
                console.log(`🏷️ ${sectionKey}: ${newCount} nuovi contenuti`);
            }

        } catch (error) {
            console.error(`Errore calcolo badge per ${sectionKey}:`, error);
            this.badgeCounters[sectionKey] = 0;
        }
    }

    getLastVisitForSection(sectionKey) {
        // Usa timestamp specifico della sezione, o ultimo login generale
        return this.lastVisitData[sectionKey] || this.lastVisitData.lastLogin || 0;
    }

    // ===============================================
    // CONTEGGIO CONTENUTI NUOVI
    // ===============================================

    async countNewThreads(sectionKey, sinceTimestamp) {
        try {
            const dataPath = this.getDataPath(sectionKey, 'threads');
            if (!dataPath) return 0;

            let threads = [];

            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                // Conteggio Firebase
                const { ref, get } = window.firebaseImports;
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(threadsRef);

                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        threads.push(childSnapshot.val());
                    });
                }
            } else {
                // Conteggio localStorage
                const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            }

            // Filtra thread nuovi e approvati
            const newThreads = threads.filter(thread => {
                const isNew = thread.createdAt > sinceTimestamp;
                const isApproved = !thread.status || thread.status === 'approved';
                return isNew && isApproved;
            });

            return newThreads.length;

        } catch (error) {
            console.error(`Errore conteggio thread per ${sectionKey}:`, error);
            return 0;
        }
    }

    async countNewMessages(sectionKey, sinceTimestamp) {
        try {
            const dataPath = this.getDataPath(sectionKey, 'messages');
            if (!dataPath) return 0;

            let messages = [];

            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                // Conteggio Firebase
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(messagesRef);

                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        messages.push(childSnapshot.val());
                    });
                }
            } else {
                // Conteggio localStorage
                const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            }

            // Filtra messaggi nuovi (escludendo i propri)
            const newMessages = messages.filter(message => {
                const isNew = message.timestamp > sinceTimestamp;
                const isNotOwnMessage = message.authorId !== this.currentUser?.uid;
                return isNew && isNotOwnMessage;
            });

            return newMessages.length;

        } catch (error) {
            console.error(`Errore conteggio messaggi per ${sectionKey}:`, error);
            return 0;
        }
    }

    // ===============================================
    // LISTENERS TEMPO REALE
    // ===============================================

    setupRealtimeListeners() {
        if (!window.useFirebase || !window.firebaseDatabase || !window.firebaseReady) {
            console.log('🏷️ Firebase non disponibile, skip listeners tempo reale');
            return;
        }

        console.log('🏷️ Setup listeners tempo reale per badge...');

        const sectionsToWatch = [
            'eventi', 'oggetti', 'novita', 'chat-generale', 'associa-clan',
            ...this.getClanSections()
        ];

        const { ref, onValue, off } = window.firebaseImports;

        sectionsToWatch.forEach(sectionKey => {
            // Listener per thread
            const section = window.sectionConfig[sectionKey];
            if (section) {
                if (section.type === 'forum') {
                    const threadsPath = this.getDataPath(sectionKey, 'threads');
                    if (threadsPath) {
                        const threadsRef = ref(window.firebaseDatabase, threadsPath);
                        const callback = () => this.handleContentUpdate(sectionKey);
                        onValue(threadsRef, callback);
                        this.listeners[`${sectionKey}_threads`] = { ref: threadsRef, callback };
                    }
                } else if (section.type === 'chat') {
                    const messagesPath = this.getDataPath(sectionKey, 'messages');
                    if (messagesPath) {
                        const messagesRef = ref(window.firebaseDatabase, messagesPath);
                        const callback = () => this.handleContentUpdate(sectionKey);
                        onValue(messagesRef, callback);
                        this.listeners[`${sectionKey}_messages`] = { ref: messagesRef, callback };
                    }
                }
            }
        });

        console.log('✅ Listeners tempo reale configurati per', Object.keys(this.listeners).length, 'sezioni');
    }

    cleanupListeners() {
        if (!window.useFirebase || !Object.keys(this.listeners).length) return;

        const { off } = window.firebaseImports;

        Object.values(this.listeners).forEach(listener => {
            off(listener.ref, listener.callback);
        });

        this.listeners = {};
        console.log('🧹 Listeners badge rimossi');
    }

    async handleContentUpdate(sectionKey) {
        // Ricalcola badge per la sezione aggiornata
        await this.calculateSectionBadge(sectionKey);
        this.updateBadgeUI(sectionKey);
    }

    // ===============================================
    // UTILITY DATA PATH
    // ===============================================

    getDataPath(sectionKey, dataType) {
        // Usa la stessa logica del sistema principale
        if (sectionKey.startsWith('clan-')) {
            const userClan = this.getCurrentUserClan();
            if (userClan === 'Nessuno') return null;
            
            const safeClanName = userClan.replace(/[.#$[\]]/g, '_');
            return `${dataType}/clan/${safeClanName}/${sectionKey}`;
        } else {
            return `${dataType}/${sectionKey}`;
        }
    }

    // ===============================================
    // AGGIORNAMENTO UI BADGE
    // ===============================================

    updateAllBadgesUI() {
        Object.keys(this.badgeCounters).forEach(sectionKey => {
            this.updateBadgeUI(sectionKey);
        });
    }

    updateBadgeUI(sectionKey) {
        const count = this.badgeCounters[sectionKey] || 0;
        const navItem = document.querySelector(`[data-section="${sectionKey}"]`);
        
        if (!navItem) return;

        this.removeBadge(sectionKey);

        if (count > 0) {
            this.addBadge(sectionKey, count);
        }
    }

    addBadge(sectionKey, count) {
        const navItem = document.querySelector(`[data-section="${sectionKey}"]`);
        if (!navItem) return;

        // Rimuovi badge esistente
        this.removeBadge(sectionKey);

        // Crea nuovo badge
        const badge = document.createElement('span');
        badge.className = 'section-badge';
        badge.textContent = count > 99 ? '99+' : count.toString();
        badge.setAttribute('data-section', sectionKey);

        // Aggiungi al nav item
        navItem.appendChild(badge);

        console.log(`🏷️ Badge aggiunto a ${sectionKey}: ${count}`);
    }

    removeBadge(sectionKey) {
        const existingBadge = document.querySelector(`.section-badge[data-section="${sectionKey}"]`);
        if (existingBadge) {
            existingBadge.remove();
        }
    }

    removeAllBadges() {
        document.querySelectorAll('.section-badge').forEach(badge => {
            badge.remove();
        });
    }

    // ===============================================
    // API PUBBLICA
    // ===============================================

    // Chiamata quando l'utente entra in una sezione
    async markSectionAsVisited(sectionKey) {
        if (!this.isInitialized) return;
        
        await this.updateSectionVisit(sectionKey);
        console.log(`✅ Sezione ${sectionKey} marcata come visitata`);
    }

    // Forza aggiornamento badge per una sezione
    async refreshSectionBadge(sectionKey) {
        if (!this.isInitialized) return;
        
        await this.calculateSectionBadge(sectionKey);
        this.updateBadgeUI(sectionKey);
    }

    // Forza aggiornamento tutti i badge
    async refreshAllBadges() {
        if (!this.isInitialized) return;
        
        await this.initializeAllBadges();
    }

    // Ottieni conteggio badge per sezione
    getBadgeCount(sectionKey) {
        return this.badgeCounters[sectionKey] || 0;
    }

    // Ottieni statistiche complete
    getStats() {
        const totalBadges = Object.values(this.badgeCounters).reduce((sum, count) => sum + count, 0);
        const sectionsWithBadges = Object.values(this.badgeCounters).filter(count => count > 0).length;
        
        return {
            totalNewContent: totalBadges,
            sectionsWithNewContent: sectionsWithBadges,
            badgeCounters: { ...this.badgeCounters },
            lastVisitData: { ...this.lastVisitData }
        };
    }
}

// ===============================================
// ISTANZA GLOBALE
// ===============================================

// Crea istanza globale del sistema badge
window.badgeSystem = new BadgeSystem();

// Esponi API per uso esterno
window.markSectionAsVisited = (sectionKey) => window.badgeSystem.markSectionAsVisited(sectionKey);
window.refreshSectionBadge = (sectionKey) => window.badgeSystem.refreshSectionBadge(sectionKey);
window.refreshAllBadges = () => window.badgeSystem.refreshAllBadges();
window.getBadgeStats = () => window.badgeSystem.getStats();

// ===============================================
// INTEGRAZIONE CON SISTEMA ESISTENTE
// ===============================================

// Hook per inizializzazione dopo login
document.addEventListener('userLoggedIn', (event) => {
    const user = event.detail.user;
    setTimeout(() => {
        window.badgeSystem.initialize(user);
    }, 1000); // Piccolo delay per permettere il caricamento dei dati utente
});

// Hook per cleanup dopo logout
document.addEventListener('userLoggedOut', () => {
    window.badgeSystem.cleanup();
});

// Hook per aggiornamento quando si cambia sezione
document.addEventListener('sectionChanged', (event) => {
    const sectionKey = event.detail.sectionKey;
    window.badgeSystem.markSectionAsVisited(sectionKey);
});

console.log('🏷️ Badge System Module caricato');

// ===============================================
// FUNZIONI DI DEBUG E TEST
// ===============================================

window.debugBadges = function() {
    console.log('🏷️ === DEBUG BADGE SYSTEM ===');
    const stats = window.badgeSystem.getStats();
    console.log('📊 Statistiche:', stats);
    console.log('🔧 Sistema inizializzato:', window.badgeSystem.isInitialized);
    console.log('👤 Utente corrente:', window.badgeSystem.currentUser?.email);
    console.log('🏷️ Badge attivi:', document.querySelectorAll('.section-badge').length);
};

window.testBadgeSystem = function() {
    console.log('🧪 Test Badge System...');
    
    if (!window.badgeSystem.isInitialized) {
        console.log('❌ Sistema non inizializzato');
        return;
    }
    
    // Aggiungi badge di test
    window.badgeSystem.addBadge('eventi', 5);
    window.badgeSystem.addBadge('chat-generale', 12);
    window.badgeSystem.addBadge('novita', 2);
    
    console.log('✅ Badge di test aggiunti');
    
    // Rimuovi dopo 5 secondi
    setTimeout(() => {
        window.badgeSystem.removeAllBadges();
        console.log('🧹 Badge di test rimossi');
    }, 5000);
};

window.resetBadgeData = function() {
    if (confirm('⚠️ Vuoi resettare tutti i dati dei badge? Questa azione non può essere annullata.')) {
        window.badgeSystem.lastVisitData = { lastLogin: Date.now() };
        window.badgeSystem.saveLastVisitData();
        window.badgeSystem.refreshAllBadges();
        console.log('🔄 Dati badge resettati');
    }
};