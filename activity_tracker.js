// ===============================================
// ACTIVITY TRACKER MODULE - Sistema Badge Novità
// ===============================================

class ActivityTracker {
    constructor() {
        this.lastLogoutTime = null;
        this.lastVisitTimes = {};
        this.unreadCounts = {};
        this.updateInterval = null;
        this.isTracking = false;
    }

    // Inizializza il tracker
    async init() {
        console.log('🔔 Inizializzazione Activity Tracker...');
        
        if (!currentUser) {
            console.log('⚠️ Nessun utente loggato, tracker non inizializzato');
            return;
        }

        this.isTracking = true;
        
        // Carica ultimo logout e visite precedenti
        await this.loadUserActivityData();
        
        // Calcola badge iniziali
        await this.calculateAllBadges();
        
        // Aggiorna UI
        this.updateAllBadges();
        
        // Setup listeners real-time
        this.setupRealtimeListeners();
        
        // Setup auto-refresh ogni 30 secondi (come backup)
        this.startAutoRefresh();
        
        // Mostra info modalità
        if (!window.useFirebase || !window.firebaseDatabase || !window.getFirebaseReady()) {
            console.log('✅ Activity Tracker inizializzato (modalità locale - refresh ogni 30s)');
        } else {
            console.log('✅ Activity Tracker inizializzato con real-time');
        }
    }

    // Carica dati attività utente
    async loadUserActivityData() {
        try {
            if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
                try {
                    const { ref, get } = window.firebaseImports;
                    // Prova prima a caricare da users/${userId}/activity (più sicuro)
                    const userActivityRef = ref(window.firebaseDatabase, `users/${currentUser.uid}/activity`);
                    const snapshot = await get(userActivityRef);
                    
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        this.lastLogoutTime = data.lastLogout || Date.now();
                        this.lastVisitTimes = data.lastVisitTimes || {};
                    } else {
                        // Prima volta, imposta timestamp corrente
                        this.lastLogoutTime = Date.now();
                        this.lastVisitTimes = {};
                    }
                } catch (firebaseError) {
                    console.warn('⚠️ Accesso Firebase negato, uso fallback locale:', firebaseError.message);
                    // Fallback to localStorage
                    this.loadFromLocalStorage();
                }
            } else {
                // Modalità locale
                this.loadFromLocalStorage();
            }
            
            console.log('📊 Dati attività caricati:', {
                lastLogout: new Date(this.lastLogoutTime).toLocaleString(),
                visitedSections: Object.keys(this.lastVisitTimes)
            });
            
        } catch (error) {
            console.error('Errore caricamento dati attività:', error);
            // Fallback sicuro
            this.lastLogoutTime = Date.now();
            this.lastVisitTimes = {};
            // Salva in locale come backup
            this.saveToLocalStorage();
        }
    }
    
    // Carica da localStorage
    loadFromLocalStorage() {
        const storageKey = `hc_activity_${currentUser.uid}`;
        const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
        this.lastLogoutTime = data.lastLogout || Date.now();
        this.lastVisitTimes = data.lastVisitTimes || {};
    }
    
    // Salva in localStorage
    saveToLocalStorage() {
        const storageKey = `hc_activity_${currentUser.uid}`;
        const data = {
            lastLogout: this.lastLogoutTime,
            lastVisitTimes: this.lastVisitTimes
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
    }

    // Salva dati attività utente
    async saveUserActivityData() {
        if (!currentUser || !this.isTracking) return;
        
        const data = {
            lastLogout: this.lastLogoutTime,
            lastVisitTimes: this.lastVisitTimes
        };
        
        // Salva sempre in localStorage come backup
        this.saveToLocalStorage();
        
        // Prova anche Firebase se disponibile
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, set } = window.firebaseImports;
                // Prova a salvare in users/${userId}/activity
                const userActivityRef = ref(window.firebaseDatabase, `users/${currentUser.uid}/activity`);
                await set(userActivityRef, data);
                console.log('✅ Attività salvata su Firebase');
            } catch (firebaseError) {
                console.warn('⚠️ Impossibile salvare su Firebase, usando solo localStorage:', firebaseError.message);
            }
        }
    }

    // Calcola tutti i badge
    async calculateAllBadges() {
        const sections = ['eventi', 'oggetti', 'novita', 'associa-clan', 'chat-generale'];
        const userClan = window.getCurrentUserClan();
        
        if (userClan !== 'Nessuno') {
            sections.push('clan-chat', 'clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca');
        }
        
        // Reset conteggi
        this.unreadCounts = {};
        
        // Calcola per ogni sezione
        for (const section of sections) {
            const count = await this.calculateSectionBadge(section);
            if (count > 0) {
                this.unreadCounts[section] = count;
            }
        }
        
        console.log('📊 Badge calcolati:', this.unreadCounts);
    }

    // Calcola badge per una sezione specifica
    async calculateSectionBadge(section) {
        try {
            const sectionConfig = window.sectionConfig[section];
            if (!sectionConfig) return 0;
            
            // Determina il timestamp di riferimento
            const referenceTime = this.lastVisitTimes[section] || this.lastLogoutTime;
            
            if (sectionConfig.type === 'chat') {
                // Per le chat, conta i messaggi
                return await this.countNewMessages(section, referenceTime);
            } else if (sectionConfig.type === 'forum') {
                // Per i forum, conta i thread
                return await this.countNewThreads(section, referenceTime);
            }
            
            return 0;
        } catch (error) {
            console.error(`Errore calcolo badge per ${section}:`, error);
            return 0;
        }
    }

    // Conta nuovi messaggi
    async countNewMessages(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'messages');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
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
            } catch (error) {
                if (error.code === 'PERMISSION_DENIED') {
                    console.warn(`⚠️ Permessi negati per messaggi ${section}, uso cache locale`);
                } else {
                    console.error(`Errore conteggio messaggi ${section}:`, error);
                }
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'messages', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'messages', sinceTime);
        }
        
        return count;
    }

    // Conta nuovi thread
    async countNewThreads(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'threads');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const threadsRef = ref(window.firebaseDatabase, dataPath);
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
            } catch (error) {
                if (error.code === 'PERMISSION_DENIED') {
                    console.warn(`⚠️ Permessi negati per thread ${section}, uso cache locale`);
                } else {
                    console.error(`Errore conteggio thread ${section}:`, error);
                }
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'threads', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'threads', sinceTime);
        }
        
        return count;
    }
    
    // Conta da localStorage
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

    // Aggiorna tutti i badge nell'UI
    updateAllBadges() {
        // Rimuovi tutti i badge esistenti
        document.querySelectorAll('.section-badge').forEach(badge => badge.remove());
        
        // Aggiungi nuovi badge
        for (const [section, count] of Object.entries(this.unreadCounts)) {
            if (count > 0) {
                this.addBadgeToSection(section, count);
            }
        }
    }

    // Aggiungi badge a una sezione
    addBadgeToSection(section, count, isNewContent = false) {
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (!navItem) return;
        
        // Rimuovi badge esistente se presente
        const existingBadge = navItem.querySelector('.section-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Crea nuovo badge
        const badge = document.createElement('span');
        badge.className = 'section-badge';
        if (isNewContent) {
            badge.classList.add('new-content');
            // Rimuovi la classe dopo l'animazione
            setTimeout(() => {
                badge.classList.remove('new-content');
            }, 1000);
        }
        badge.textContent = count > 99 ? '99+' : count;
        
        // Aggiungi al nav item
        navItem.appendChild(badge);
    }

    // Segna una sezione come visitata
    async markSectionAsVisited(section) {
        if (!this.isTracking) return;
        
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
        
        // Salva dati aggiornati
        await this.saveUserActivityData();
    }

    // Aggiorna badge per una sezione specifica
    async updateSectionBadge(section) {
        if (!this.isTracking) return;
        
        const count = await this.calculateSectionBadge(section);
        
        if (count > 0) {
            this.unreadCounts[section] = count;
            this.addBadgeToSection(section, count);
        } else {
            delete this.unreadCounts[section];
            const navItem = document.querySelector(`[data-section="${section}"]`);
            if (navItem) {
                const badge = navItem.querySelector('.section-badge');
                if (badge) {
                    badge.remove();
                }
            }
        }
    }

    // Gestisci nuovo contenuto in tempo reale
    async handleNewContent(section, contentType) {
        if (!this.isTracking) return;
        
        // Se l'utente non è nella sezione, aggiorna il badge
        if (window.getCurrentSection() !== section) {
            await this.updateSectionBadge(section);
        }
    }

    // Registra logout
    async recordLogout() {
        console.log('👋 Registrando logout...');
        
        this.lastLogoutTime = Date.now();
        await this.saveUserActivityData();
        
        // Ferma tracking
        this.stopTracking();
    }

    // Avvia auto-refresh
    startAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            if (this.isTracking && currentUser) {
                this.refreshBadges();
            }
        }, 30000); // Ogni 30 secondi
    }

    // Refresh badge (per contenuti real-time)
    async refreshBadges() {
        console.log('🔄 Refresh badge...');
        
        // Ricalcola solo per sezioni non visitate recentemente
        const sectionsToUpdate = Object.keys(window.sectionConfig).filter(section => {
            return section !== window.getCurrentSection() && 
                   (!this.lastVisitTimes[section] || 
                    Date.now() - this.lastVisitTimes[section] > 60000); // Più di 1 minuto
        });
        
        for (const section of sectionsToUpdate) {
            await this.updateSectionBadge(section);
        }
    }

    // Ferma tracking
    stopTracking() {
        this.isTracking = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Rimuovi listeners real-time
        this.removeRealtimeListeners();
        
        // Rimuovi tutti i badge
        document.querySelectorAll('.section-badge').forEach(badge => badge.remove());
        
        console.log('🛑 Activity Tracker fermato');
    }

    // Pulisci tutto
    cleanup() {
        this.stopTracking();
        this.lastLogoutTime = null;
        this.lastVisitTimes = {};
        this.unreadCounts = {};
    }

    // Setup listeners real-time per Firebase
    setupRealtimeListeners() {
        if (!window.useFirebase || !window.firebaseDatabase || !window.getFirebaseReady()) {
            console.log('⚠️ Real-time non disponibile in modalità locale');
            return;
        }

        console.log('🔥 Setup listeners real-time...');
        
        this.realtimeListeners = {};
        
        // Monitora tutte le sezioni
        const sections = ['eventi', 'oggetti', 'novita', 'associa-clan', 'chat-generale'];
        const userClan = window.getCurrentUserClan();
        
        if (userClan !== 'Nessuno') {
            sections.push('clan-chat', 'clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca');
        }
        
        sections.forEach(section => {
            this.setupSectionListener(section);
        });
    }

    // Setup listener per una sezione specifica
    setupSectionListener(section) {
        const sectionConfig = window.sectionConfig[section];
        if (!sectionConfig) return;
        
        const dataType = sectionConfig.type === 'chat' ? 'messages' : 'threads';
        const dataPath = window.getDataPath(section, dataType);
        if (!dataPath) return;
        
        try {
            const { ref, onValue } = window.firebaseImports;
            const dataRef = ref(window.firebaseDatabase, dataPath);
            
            // Listener per nuovi contenuti con gestione errori
            const callback = onValue(dataRef, 
                (snapshot) => {
                    // Se non siamo in questa sezione, controlla per nuovi contenuti
                    if (window.getCurrentSection() !== section && this.isTracking) {
                        this.checkForNewContent(section, snapshot);
                    }
                },
                (error) => {
                    if (error.code === 'PERMISSION_DENIED') {
                        console.warn(`⚠️ Permessi negati per ${section}, listener disabilitato`);
                    } else {
                        console.error(`Errore listener ${section}:`, error);
                    }
                }
            );
            
            // Salva riferimento per pulizia
            this.realtimeListeners[section] = { ref: dataRef, callback };
            
            console.log(`📡 Listener real-time attivo per ${section}`);
            
        } catch (error) {
            console.error(`Errore setup listener ${section}:`, error);
        }
    }

    // Controlla per nuovi contenuti
    checkForNewContent(section, snapshot) {
        if (!snapshot.exists()) return;
        
        const referenceTime = this.lastVisitTimes[section] || this.lastLogoutTime;
        let newCount = 0;
        
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            
            // Per messaggi
            if (item.timestamp && item.timestamp > referenceTime && item.authorId !== currentUser.uid) {
                newCount++;
            }
            // Per thread
            else if (item.createdAt && item.createdAt > referenceTime && (!item.status || item.status === 'approved')) {
                newCount++;
            }
        });
        
        // Aggiorna badge se ci sono novità
        if (newCount > 0 && this.unreadCounts[section] !== newCount) {
            console.log(`🆕 Nuovi contenuti in ${section}: ${newCount}`);
            this.unreadCounts[section] = newCount;
            this.addBadgeToSection(section, newCount, true); // true = nuovo contenuto real-time
            
            // Mostra notifica toast opzionale
            this.showNewContentToast(section, newCount);
        }
    }

    // Rimuovi listeners real-time
    removeRealtimeListeners() {
        if (!this.realtimeListeners) return;
        
        const { off } = window.firebaseImports || {};
        if (!off) return;
        
        Object.entries(this.realtimeListeners).forEach(([section, listener]) => {
            if (listener.ref && listener.callback) {
                off(listener.ref, listener.callback);
                console.log(`📡 Listener real-time rimosso per ${section}`);
            }
        });
        
        this.realtimeListeners = {};
    }

    // Mostra toast per nuovo contenuto (opzionale)
    showNewContentToast(section, count) {
        const sectionName = window.sectionConfig[section]?.title || section;
        const message = count === 1 ? 
            `Nuovo contenuto in ${sectionName}` : 
            `${count} nuovi contenuti in ${sectionName}`;
        
        // Se esiste la funzione showToast del sistema notifiche
        if (window.createToast && window.showToast) {
            const toast = window.createToast({
                type: 'info',
                title: '🆕 Novità!',
                message: message,
                duration: 3000,
                actions: [{
                    text: 'Vai',
                    action: () => window.switchSection(section)
                }]
            });
            window.showToast(toast);
        }
    }
}

// Istanza globale
window.activityTracker = new ActivityTracker();

// Esporta funzioni helper globali
window.markSectionAsVisited = async function(section) {
    if (window.activityTracker) {
        await window.activityTracker.markSectionAsVisited(section);
    }
};

window.handleNewContent = async function(section, contentType) {
    if (window.activityTracker) {
        await window.activityTracker.handleNewContent(section, contentType);
    }
};

console.log('✅ Activity Tracker Module caricato');