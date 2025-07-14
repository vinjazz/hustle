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


if (window.activityTracker) {
    console.log('🔧 Applicando patch compatibilità Activity Tracker...');
    
    // Salva le funzioni originali
    const originalCountNewMessages = window.activityTracker.countNewMessages;
    const originalCountNewThreads = window.activityTracker.countNewThreads;
    const originalCalculateAllBadges = window.activityTracker.calculateAllBadges;
    
    // ✅ PATCH: countNewMessages con gestione errori migliorata
    window.activityTracker.countNewMessages = async function(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'messages');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(messagesRef);
                
                if (snapshot && snapshot.exists()) {
                    // ✅ VERIFICA: Controlla se snapshot ha forEach
                    if (typeof snapshot.forEach === 'function') {
                        snapshot.forEach((childSnapshot) => {
                            try {
                                const message = childSnapshot.val();
                                if (message && message.timestamp > sinceTime && message.authorId !== currentUser?.uid) {
                                    count++;
                                }
                            } catch (childError) {
                                console.warn(`⚠️ Errore processing messaggio child in ${section}:`, childError);
                            }
                        });
                    } else {
                        // ✅ FALLBACK: Se forEach non è disponibile, lavora sui dati direttamente
                        console.warn(`⚠️ Snapshot per ${section} non ha forEach, usando fallback`);
                        const data = snapshot.val();
                        if (data && typeof data === 'object') {
                            Object.keys(data).forEach(key => {
                                try {
                                    const message = data[key];
                                    if (message && message.timestamp > sinceTime && message.authorId !== currentUser?.uid) {
                                        count++;
                                    }
                                } catch (itemError) {
                                    console.warn(`⚠️ Errore processing messaggio ${key}:`, itemError);
                                }
                            });
                        }
                    }
                }
                
                console.log(`💬 Contati ${count} nuovi messaggi in ${section}`);
                
            } catch (error) {
                if (error.code === 'PERMISSION_DENIED') {
                    console.warn(`⚠️ Permessi negati per messaggi ${section}, uso cache locale`);
                } else {
                    console.error(`❌ Errore conteggio messaggi ${section}:`, error);
                }
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'messages', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'messages', sinceTime);
        }
        
        return count;
    };
    
    // ✅ PATCH: countNewThreads con gestione errori migliorata
    window.activityTracker.countNewThreads = async function(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'threads');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(threadsRef);
                
                if (snapshot && snapshot.exists()) {
                    // ✅ VERIFICA: Controlla se snapshot ha forEach
                    if (typeof snapshot.forEach === 'function') {
                        snapshot.forEach((childSnapshot) => {
                            try {
                                const thread = childSnapshot.val();
                                if (thread && thread.createdAt > sinceTime && 
                                    (!thread.status || thread.status === 'approved')) {
                                    count++;
                                }
                            } catch (childError) {
                                console.warn(`⚠️ Errore processing thread child in ${section}:`, childError);
                            }
                        });
                    } else {
                        // ✅ FALLBACK: Se forEach non è disponibile, lavora sui dati direttamente
                        console.warn(`⚠️ Snapshot per ${section} non ha forEach, usando fallback`);
                        const data = snapshot.val();
                        if (data && typeof data === 'object') {
                            Object.keys(data).forEach(key => {
                                try {
                                    const thread = data[key];
                                    if (thread && thread.createdAt > sinceTime && 
                                        (!thread.status || thread.status === 'approved')) {
                                        count++;
                                    }
                                } catch (itemError) {
                                    console.warn(`⚠️ Errore processing thread ${key}:`, itemError);
                                }
                            });
                        }
                    }
                }
                
                console.log(`📝 Contati ${count} nuovi thread in ${section}`);
                
            } catch (error) {
                if (error.code === 'PERMISSION_DENIED') {
                    console.warn(`⚠️ Permessi negati per thread ${section}, uso cache locale`);
                } else {
                    console.error(`❌ Errore conteggio thread ${section}:`, error);
                }
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'threads', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'threads', sinceTime);
        }
        
        return count;
    };
    
    // ✅ PATCH: calculateAllBadges con gestione errori globale
    window.activityTracker.calculateAllBadges = async function() {
        console.log('🔔 Calcolo badge con patch compatibilità...');
        
        const sections = ['eventi', 'oggetti', 'novita', 'associa-clan', 'chat-generale'];
        const userClan = window.getCurrentUserClan();
        
        if (userClan !== 'Nessuno') {
            sections.push('clan-chat', 'clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca');
        }
        
        // Reset conteggi
        this.unreadCounts = {};
        let successCount = 0;
        let errorCount = 0;
        
        // Calcola per ogni sezione con gestione errori individuale
        for (const section of sections) {
            try {
                const count = await this.calculateSectionBadge(section);
                if (count > 0) {
                    this.unreadCounts[section] = count;
                }
                successCount++;
                console.log(`✅ Badge ${section}: ${count}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Errore calcolo badge ${section}:`, error);
                // Continua con la sezione successiva invece di fermarsi
            }
        }
        
        console.log(`📊 Badge calcolati: ${successCount} successi, ${errorCount} errori`);
        console.log('📊 Badge risultanti:', this.unreadCounts);
        
        // Anche se ci sono errori, aggiorna quello che è riuscito
        return this.unreadCounts;
    };
    
    // ✅ NUOVA FUNZIONE: Ripristina funzioni originali
    window.activityTracker.restoreOriginalFunctions = function() {
        console.log('🔄 Ripristino funzioni Activity Tracker originali...');
        this.countNewMessages = originalCountNewMessages;
        this.countNewThreads = originalCountNewThreads;
        this.calculateAllBadges = originalCalculateAllBadges;
        console.log('✅ Funzioni originali ripristinate');
    };
    
    // ✅ NUOVA FUNZIONE: Test compatibilità
    window.activityTracker.testCompatibility = async function() {
        console.log('🧪 Test compatibilità Activity Tracker...');
        
        const testSections = ['eventi', 'chat-generale'];
        let allPassed = true;
        
        for (const section of testSections) {
            try {
                console.log(`🔍 Test sezione: ${section}`);
                
                // Test conteggio messaggi
                if (section.includes('chat')) {
                    const count = await this.countNewMessages(section, Date.now() - 86400000); // 24h fa
                    console.log(`✅ ${section} messaggi: ${count}`);
                } else {
                    const count = await this.countNewThreads(section, Date.now() - 86400000); // 24h fa
                    console.log(`✅ ${section} thread: ${count}`);
                }
                
            } catch (error) {
                console.error(`❌ Test fallito per ${section}:`, error);
                allPassed = false;
            }
        }
        
        if (allPassed) {
            console.log('✅ Tutti i test di compatibilità passati!');
        } else {
            console.warn('⚠️ Alcuni test di compatibilità falliti, verifica la configurazione');
        }
        
        return allPassed;
    };
    
    console.log('✅ Patch Activity Tracker applicata con successo!');
    
    // ✅ ESEGUI TEST AUTOMATICO
    setTimeout(() => {
        if (currentUser && window.activityTracker.testCompatibility) {
            window.activityTracker.testCompatibility();
        }
    }, 3000);
    
} else {
    console.warn('⚠️ Activity Tracker non trovato, patch non applicata');
}

// ===============================================
// FUNZIONI DI UTILITY E DEBUG
// ===============================================

// Funzione per debug snapshot
window.debugSnapshot = function(snapshot, label = 'Snapshot') {
    console.log(`🔍 DEBUG ${label}:`, {
        hasForEach: typeof snapshot?.forEach === 'function',
        hasVal: typeof snapshot?.val === 'function',
        hasExists: typeof snapshot?.exists === 'function',
        isMock: snapshot?._isMockSnapshot || false,
        type: typeof snapshot,
        value: snapshot?.val ? snapshot.val() : snapshot
    });
};

// Funzione per testare manualmente il sistema badge
window.testBadgeSystem = async function() {
    if (!currentUser) {
        console.log('❌ Utente non loggato, impossibile testare badge');
        return;
    }
    
    if (!window.activityTracker) {
        console.log('❌ Activity Tracker non disponibile');
        return;
    }
    
    console.log('🧪 Test sistema badge iniziato...');
    
    try {
        // Test calcolo badge
        const badges = await window.activityTracker.calculateAllBadges();
        console.log('✅ Badge calcolati:', badges);
        
        // Test aggiornamento UI
        window.activityTracker.updateAllBadges();
        console.log('✅ Badge UI aggiornati');
        
        // Mostra notifica successo
        if (typeof createToast === 'function' && typeof showToast === 'function') {
            const toast = createToast({
                type: 'success',
                title: '🔔 Test Badge Completato',
                message: `Badge calcolati: ${Object.keys(badges).length}`,
                duration: 3000
            });
            showToast(toast);
        }
        
        return badges;
        
    } catch (error) {
        console.error('❌ Test badge fallito:', error);
        
        if (typeof createToast === 'function' && typeof showToast === 'function') {
            const toast = createToast({
                type: 'error',
                title: '❌ Test Badge Fallito',
                message: error.message || 'Errore sconosciuto',
                duration: 4000
            });
            showToast(toast);
        }
        
        return null;
    }
};

// Funzione per verificare lo stato del sistema cache
window.checkCacheSystem = function() {
    console.log('🔍 === STATO SISTEMA CACHE ===');
    
    // Check deduplicatore
    if (window.firebaseDeduplicator) {
        const stats = window.firebaseDeduplicator.getCacheStats();
        console.log('💾 Deduplicatore:', stats);
        
        // Mostra contenuti cache
        console.log('📦 Contenuti cache:');
        window.firebaseDeduplicator.cache.forEach((item, key) => {
            const age = Date.now() - item.timestamp;
            console.log(`  - ${key}: ${age}ms fa`);
        });
    } else {
        console.log('❌ Deduplicatore non trovato');
    }
    
    // Check thread cache
    if (window.threadCache) {
        console.log('🧵 Thread Cache:', {
            sections: window.threadCache.cache.size,
            loading: window.threadCache.isLoading.size
        });
    } else {
        console.log('❌ Thread Cache non trovato');
    }
    
    // Check activity tracker
    if (window.activityTracker) {
        console.log('🔔 Activity Tracker:', {
            tracking: window.activityTracker.isTracking,
            unreadCounts: Object.keys(window.activityTracker.unreadCounts || {}).length
        });
    } else {
        console.log('❌ Activity Tracker non trovato');
    }
};

// Funzione di emergenza per il solo Activity Tracker
window.emergencyFixActivityTracker = function() {
    console.log('🚨 EMERGENCY FIX ACTIVITY TRACKER');
    
    if (!window.activityTracker) {
        console.log('❌ Activity Tracker non trovato');
        return;
    }
    
    try {
        // Ferma il tracker
        window.activityTracker.stopTracking();
        
        // Pulisci i badge
        document.querySelectorAll('.section-badge').forEach(badge => badge.remove());
        
        // Ripristina funzioni originali se disponibili
        if (window.activityTracker.restoreOriginalFunctions) {
            window.activityTracker.restoreOriginalFunctions();
        }
        
        // Riavvia
        setTimeout(() => {
            window.activityTracker.init();
        }, 1000);
        
        console.log('✅ Activity Tracker reimpostato');
        
    } catch (error) {
        console.error('❌ Errore emergency fix:', error);
        console.log('💡 Prova a ricaricare la pagina');
    }
};

console.log('✅ Activity Tracker Patch caricato!');