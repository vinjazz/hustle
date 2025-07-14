// ===============================================
// ACTIVITY TRACKER - VERSIONE DISATTIVATA
// Riduce drasticamente il consumo dati Firebase
// ===============================================

class ActivityTrackerDisabled {
    constructor() {
        this.lastLogoutTime = null;
        this.lastVisitTimes = {};
        this.unreadCounts = {};
        this.updateInterval = null;
        this.isTracking = false;
        this.autoRefreshDisabled = true; // DISATTIVATO per ridurre consumi
        this.realtimeListeners = {};
    }

    // Inizializza il tracker (VERSIONE DISATTIVATA)
    async init() {
        console.log('🔔 Inizializzazione Activity Tracker DISATTIVATO per ridurre consumi...');
        
        if (!currentUser) {
            console.log('⚠️ Nessun utente loggato, tracker non inizializzato');
            return;
        }

        // NON avviare tracking automatico
        this.isTracking = false;
        
        // Carica solo i dati base senza real-time
        await this.loadUserActivityDataBasic();
        
        // NON calcolare badge automaticamente
        // NON aggiornare UI automaticamente
        // NON setup listeners real-time
        // NON setup auto-refresh
        
        console.log('✅ Activity Tracker inizializzato in modalità DISATTIVATA');
        console.log('🚫 Real-time listeners: DISATTIVATI');
        console.log('🚫 Auto-refresh: DISATTIVATO');
        console.log('🚫 Badge automatici: DISATTIVATI');
        console.log('💾 Consumo dati: RIDOTTO DRASTICAMENTE');
    }

    // Carica dati attività utente (versione base)
    async loadUserActivityDataBasic() {
        try {
            // Carica solo da localStorage per evitare chiamate Firebase
            this.loadFromLocalStorage();
            
            console.log('📊 Dati attività caricati da localStorage (modalità risparmio)');
            
        } catch (error) {
            console.error('Errore caricamento dati attività:', error);
            // Fallback sicuro
            this.lastLogoutTime = Date.now();
            this.lastVisitTimes = {};
        }
    }
    
    // Carica da localStorage (SEMPRE - non Firebase)
    loadFromLocalStorage() {
        if (!currentUser) return;
        
        const storageKey = `hc_activity_${currentUser.uid}`;
        const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
        this.lastLogoutTime = data.lastLogout || Date.now();
        this.lastVisitTimes = data.lastVisitTimes || {};
    }
    
    // Salva in localStorage (SEMPRE - non Firebase)
    saveToLocalStorage() {
        if (!currentUser) return;
        
        const storageKey = `hc_activity_${currentUser.uid}`;
        const data = {
            lastLogout: this.lastLogoutTime,
            lastVisitTimes: this.lastVisitTimes
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
    }

    // Salva dati attività utente (SOLO localStorage)
    async saveUserActivityData() {
        if (!currentUser || !this.isTracking) return;
        
        // Salva SOLO in localStorage per ridurre consumo Firebase
        this.saveToLocalStorage();
        
        console.log('✅ Attività salvata solo in localStorage (modalità risparmio)');
    }

    // METODI DISATTIVATI per ridurre consumi

    // Badge calculation DISATTIVATO
    async calculateAllBadges() {
        console.log('🚫 calculateAllBadges DISATTIVATO per ridurre consumi');
        // Non calcolare badge automaticamente
        this.unreadCounts = {};
    }

    async calculateSectionBadge(section) {
        console.log('🚫 calculateSectionBadge DISATTIVATO per ridurre consumi');
        return 0;
    }

    async countNewMessages(section, sinceTime) {
        console.log('🚫 countNewMessages DISATTIVATO per ridurre consumi');
        return 0;
    }

    async countNewThreads(section, sinceTime) {
        console.log('🚫 countNewThreads DISATTIVATO per ridurre consumi');
        return 0;
    }

    // UI Updates DISATTIVATI
    updateAllBadges() {
        console.log('🚫 updateAllBadges DISATTIVATO per ridurre consumi');
        // Rimuovi tutti i badge per indicare che il sistema è disattivato
        document.querySelectorAll('.section-badge').forEach(badge => badge.remove());
    }

    addBadgeToSection(section, count, isNewContent = false) {
        console.log('🚫 addBadgeToSection DISATTIVATO per ridurre consumi');
        // Non aggiungere badge
    }

    // Real-time listeners DISATTIVATI
    setupRealtimeListeners() {
        console.log('🚫 Real-time listeners DISATTIVATI per ridurre consumi Firebase');
        // NON configurare listeners real-time
    }

    setupSectionListener(section) {
        console.log('🚫 setupSectionListener DISATTIVATO per ridurre consumi');
        // NON configurare listeners
    }

    checkForNewContent(section, snapshot) {
        console.log('🚫 checkForNewContent DISATTIVATO per ridurre consumi');
        // NON controllare nuovo contenuto in real-time
    }

    removeRealtimeListeners() {
        console.log('🔧 removeRealtimeListeners (nessun listener da rimuovere)');
        // Nessun listener da rimuovere perché non sono stati creati
        this.realtimeListeners = {};
    }

    // Auto-refresh DISATTIVATO
    startAutoRefresh() {
        console.log('🚫 Auto-refresh DISATTIVATO per ridurre consumi Firebase');
        // NON avviare auto-refresh ogni 30 secondi
        
        // Pulisci eventuali interval esistenti
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async refreshBadges() {
        console.log('🚫 refreshBadges DISATTIVATO per ridurre consumi');
        // NON refreshare badge automaticamente
    }

    async updateSectionBadge(section) {
        console.log('🚫 updateSectionBadge DISATTIVATO per ridurre consumi');
        // NON aggiornare badge automaticamente
    }

    async handleNewContent(section, contentType) {
        console.log('🚫 handleNewContent DISATTIVATO per ridurre consumi');
        // NON gestire nuovo contenuto automaticamente
    }

    // METODI MANUALI per refresh su richiesta

    // Calcola badge MANUALMENTE (solo quando richiesto)
    async calculateBadgesManual() {
        console.log('🔄 Calcolo manuale badge...');
        
        if (!currentUser) {
            console.log('⚠️ Nessun utente per calcolo badge');
            return;
        }

        const sections = ['eventi', 'oggetti', 'novita', 'associa-clan', 'chat-generale'];
        const userClan = window.getCurrentUserClan();
        
        if (userClan !== 'Nessuno') {
            sections.push('clan-chat', 'clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca');
        }
        
        // Reset conteggi
        this.unreadCounts = {};
        
        // Calcola per ogni sezione (MANUALMENTE)
        for (const section of sections) {
            try {
                const count = await this.calculateSectionBadgeManual(section);
                if (count > 0) {
                    this.unreadCounts[section] = count;
                }
            } catch (error) {
                console.warn(`Errore calcolo badge ${section}:`, error);
            }
        }
        
        console.log('📊 Badge calcolati manualmente:', this.unreadCounts);
        
        // Aggiorna UI
        this.updateAllBadgesManual();
        
        return this.unreadCounts;
    }

    // Calcola badge per sezione (MANUALMENTE)
    async calculateSectionBadgeManual(section) {
        try {
            const sectionConfig = window.sectionConfig[section];
            if (!sectionConfig) return 0;
            
            // Determina il timestamp di riferimento
            const referenceTime = this.lastVisitTimes[section] || this.lastLogoutTime;
            
            if (sectionConfig.type === 'chat') {
                // Per le chat, conta i messaggi
                return await this.countNewMessagesManual(section, referenceTime);
            } else if (sectionConfig.type === 'forum') {
                // Per i forum, conta i thread
                return await this.countNewThreadsManual(section, referenceTime);
            }
            
            return 0;
        } catch (error) {
            console.error(`Errore calcolo badge per ${section}:`, error);
            return 0;
        }
    }

    // Conta nuovi messaggi (MANUALMENTE - single read)
    async countNewMessagesManual(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'messages');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                
                // SINGLE READ - nessun listener
                const snapshot = await get(messagesRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const message = childSnapshot.val();
                        // Non contare i propri messaggi
                        if (message.timestamp > sinceTime && message.authorId !== currentUser.uid) {
                            count++;
                        }
                    });
                }
                
                console.log(`📖 Contati ${count} nuovi messaggi in ${section} (single read)`);
            } catch (error) {
                console.warn(`⚠️ Errore conteggio messaggi ${section}:`, error);
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'messages', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'messages', sinceTime);
        }
        
        return count;
    }

    // Conta nuovi thread (MANUALMENTE - single read)
    async countNewThreadsManual(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'threads');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                
                // SINGLE READ - nessun listener
                const snapshot = await get(threadsRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const thread = childSnapshot.val();
                        // Conta solo thread approvati creati dopo il riferimento
                        if (thread.createdAt > sinceTime && 
                            (!thread.status || thread.status === 'approved')) {
                            count++;
                        }
                    });
                }
                
                console.log(`📖 Contati ${count} nuovi thread in ${section} (single read)`);
            } catch (error) {
                console.warn(`⚠️ Errore conteggio thread ${section}:`, error);
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'threads', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'threads', sinceTime);
        }
        
        return count;
    }
    
    // Conta da localStorage (invariato)
    countFromLocalStorage(section, dataType, sinceTime) {
        const dataPath = window.getDataPath(section, dataType);
        if (!dataPath) return 0;
        
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (dataType === 'messages') {
            return items.filter(msg => 
                msg.timestamp > sinceTime && 
                msg.authorId !== currentUser.uid
            ).length;
        } else {
            return items.filter(thread => 
                thread.createdAt > sinceTime && 
                (!thread.status || thread.status === 'approved')
            ).length;
        }
    }

    // Aggiorna badge UI (MANUALMENTE)
    updateAllBadgesManual() {
        console.log('🔄 Aggiornamento manuale badge UI...');
        
        // Rimuovi tutti i badge esistenti
        document.querySelectorAll('.section-badge').forEach(badge => badge.remove());
        
        // Aggiungi nuovi badge
        for (const [section, count] of Object.entries(this.unreadCounts)) {
            if (count > 0) {
                this.addBadgeToSectionManual(section, count);
            }
        }
        
        console.log('✅ Badge UI aggiornati manualmente');
    }

    // Aggiungi badge a sezione (MANUALMENTE)
    addBadgeToSectionManual(section, count) {
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (!navItem) return;
        
        // Rimuovi badge esistente se presente
        const existingBadge = navItem.querySelector('.section-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Crea nuovo badge
        const badge = document.createElement('span');
        badge.className = 'section-badge manual-badge';
        badge.textContent = count > 99 ? '99+' : count;
        badge.title = 'Badge calcolato manualmente';
        
        // Aggiungi al nav item
        navItem.appendChild(badge);
    }

    // METODI FUNZIONANTI (non disattivati)

    // Segna sezione come visitata (funziona)
    async markSectionAsVisited(section) {
        console.log(`✅ Sezione ${section} marcata come visitata`);
        
        // Aggiorna timestamp ultima visita
        this.lastVisitTimes[section] = Date.now();
        
        // Rimuovi badge per questa sezione
        delete this.unreadCounts[section];
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (navItem) {
            const badge = navItem.querySelector('.section-badge');
            if (badge) {
                badge.remove();
            }
        }
        
        // Salva dati aggiornati (solo localStorage)
        await this.saveUserActivityData();
    }

    // Registra logout (funziona)
    async recordLogout() {
        console.log('👋 Registrando logout...');
        
        this.lastLogoutTime = Date.now();
        await this.saveUserActivityData();
        
        // Ferma tracking
        this.stopTracking();
    }

    // Ferma tracking (funziona)
    stopTracking() {
        this.isTracking = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Non ci sono real-time listeners da rimuovere
        this.removeRealtimeListeners();
        
        // Rimuovi tutti i badge
        document.querySelectorAll('.section-badge').forEach(badge => badge.remove());
        
        console.log('🛑 Activity Tracker fermato (modalità risparmio)');
    }

    // Pulisci tutto (funziona)
    cleanup() {
        this.stopTracking();
        this.lastLogoutTime = null;
        this.lastVisitTimes = {};
        this.unreadCounts = {};
    }

    // Toast disattivato per ridurre UI clutter
    showNewContentToast(section, count) {
        console.log('🚫 Toast nuovo contenuto DISATTIVATO per ridurre distrazioni');
        // NON mostrare toast automatici
    }

    // METODI PUBBLICI per refresh manuale

    // Refresh badge manuale (da chiamare nei bottoni)
    async refreshBadgesManual() {
        console.log('🔄 Refresh manuale badge richiesto...');
        
        try {
            const badges = await this.calculateBadgesManual();
            
            // Mostra risultato
            const badgeCount = Object.keys(badges).length;
            const totalUnread = Object.values(badges).reduce((sum, count) => sum + count, 0);
            
            console.log(`✅ Badge refresh completato: ${badgeCount} sezioni con ${totalUnread} elementi non letti`);
            
            return {
                success: true,
                badges: badges,
                sectionsWithBadges: badgeCount,
                totalUnread: totalUnread
            };
            
        } catch (error) {
            console.error('❌ Errore refresh badge manuale:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Stato del tracker
    getStatus() {
        return {
            isTracking: this.isTracking,
            autoRefreshDisabled: this.autoRefreshDisabled,
            realTimeDisabled: true,
            consumptionReduced: true,
            lastLogoutTime: this.lastLogoutTime,
            visitedSections: Object.keys(this.lastVisitTimes).length,
            activeBadges: Object.keys(this.unreadCounts).length
        };
    }
}

// Sostituisci l'istanza globale con la versione disattivata
if (window.activityTracker) {
    // Pulisci il tracker precedente
    window.activityTracker.cleanup();
}

// Crea nuova istanza disattivata
window.activityTracker = new ActivityTrackerDisabled();

// Mantieni le funzioni helper globali
window.markSectionAsVisited = async function(section) {
    if (window.activityTracker) {
        await window.activityTracker.markSectionAsVisited(section);
    }
};

window.handleNewContent = async function(section, contentType) {
    console.log(`🚫 handleNewContent DISATTIVATO per ${section}/${contentType} (riduzione consumi)`);
    // NON gestire automaticamente
};

// Funzione per refresh manuale badge (da usare nei bottoni)
window.refreshBadgesManual = async function() {
    if (window.activityTracker && window.activityTracker.refreshBadgesManual) {
        return await window.activityTracker.refreshBadgesManual();
    }
    return { success: false, error: 'Activity tracker non disponibile' };
};

// Funzione per ottenere stato tracker
window.getActivityTrackerStatus = function() {
    if (window.activityTracker && window.activityTracker.getStatus) {
        return window.activityTracker.getStatus();
    }
    return { error: 'Activity tracker non disponibile' };
};

console.log('🚫 Activity Tracker DISATTIVATO caricato - Consumi Firebase ridotti drasticamente!');
console.log('📊 Real-time listeners: DISATTIVATI');
console.log('🔄 Auto-refresh: DISATTIVATO');
console.log('🔔 Badge automatici: DISATTIVATI');
console.log('💾 Modalità: Solo localStorage + refresh manuali');
console.log('💡 Usa window.refreshBadgesManual() per aggiornare badge manualmente');