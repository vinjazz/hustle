// ===============================================
// ACTIVITY TRACKER MODULE - Migrato a Supabase
// Firebase Auth + Supabase Data + Polling per Real-time
// ===============================================

class ActivityTracker {
    constructor() {
        this.lastLogoutTime = null;
        this.lastVisitTimes = {};
        this.unreadCounts = {};
        this.updateInterval = null;
        this.isTracking = false;
        this.supabaseClient = null;
        this.pollingInterval = null;
        this.lastPollingUpdate = 0;
    }

    // Inizializza Supabase client
    async initializeSupabase() {
        if (window.supabase && window.supabaseUrl && window.supabaseKey) {
            this.supabaseClient = window.supabase.createClient(window.supabaseUrl, window.supabaseKey);
            console.log('✅ ActivityTracker Supabase inizializzato');
        } else {
            console.warn('⚠️ ActivityTracker: Supabase non disponibile, modalità locale');
        }
    }

    // Inizializza il tracker
    async init() {
        console.log('🔔 Inizializzazione Activity Tracker...');
        
        if (!currentUser) {
            console.log('⚠️ Nessun utente loggato, tracker non inizializzato');
            return;
        }

        // Inizializza Supabase se non già fatto
        if (!this.supabaseClient) {
            await this.initializeSupabase();
        }

        this.isTracking = true;
        
        // Carica ultimo logout e visite precedenti
        await this.loadUserActivityData();
        
        // Calcola badge iniziali
        await this.calculateAllBadges();
        
        // Aggiorna UI
        this.updateAllBadges();
        
        // Setup polling per real-time (sostituisce listener Firebase)
        this.startPolling();
        
        // Setup auto-refresh come backup
        this.startAutoRefresh();
        
        console.log('✅ Activity Tracker inizializzato (modalità Supabase + polling)');
    }

    // Carica dati attività utente - MIGRATO A SUPABASE
    async loadUserActivityData() {
        try {
            // PRIMA: Prova con Supabase
            if (this.supabaseClient) {
                try {
                    const { data, error } = await this.supabaseClient
                        .from('user_activity')
                        .select('*')
                        .eq('user_id', currentUser.uid)
                        .limit(1)
                        .single();

                    if (error) {
                        if (error.code === 'PGRST116') {
                            // Nessun record = primo accesso
                            console.log('🆕 Primo accesso, creando dati attività...');
                            await this.createInitialActivityData();
                            return;
                        }
                        throw error;
                    }
                    
                    if (data) {
                        this.lastLogoutTime = new Date(data.last_logout).getTime();
                        this.lastVisitTimes = data.last_visit_times || {};
                        console.log('✅ Dati attività caricati da Supabase');
                        return;
                    }
                } catch (supabaseError) {
                    console.warn('⚠️ Errore Supabase attività:', supabaseError);
                    // Fallback a localStorage
                }
            }

            // FALLBACK: localStorage
            this.loadFromLocalStorage();
            
        } catch (error) {
            console.error('Errore caricamento dati attività:', error);
            // Fallback sicuro
            this.lastLogoutTime = Date.now();
            this.lastVisitTimes = {};
            this.saveToLocalStorage();
        }
    }

    // Crea dati attività iniziali in Supabase
    async createInitialActivityData() {
        if (!this.supabaseClient) return;

        try {
            this.lastLogoutTime = Date.now();
            this.lastVisitTimes = {};

            const { data, error } = await this.supabaseClient
                .from('user_activity')
                .insert([{
                    user_id: currentUser.uid,
                    last_logout: new Date(this.lastLogoutTime).toISOString(),
                    last_visit_times: this.lastVisitTimes
                }])
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ Dati attività iniziali creati');
        } catch (error) {
            console.error('Errore creazione dati attività:', error);
            // Salva in localStorage come backup
            this.saveToLocalStorage();
        }
    }
    
    // Carica da localStorage
    loadFromLocalStorage() {
        const storageKey = `hc_activity_${currentUser.uid}`;
        const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
        this.lastLogoutTime = data.lastLogout || Date.now();
        this.lastVisitTimes = data.lastVisitTimes || {};
        console.log('✅ Dati attività caricati da localStorage');
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

    // Salva dati attività utente - MIGRATO A SUPABASE
    async saveUserActivityData() {
        if (!currentUser || !this.isTracking) return;
        
        const data = {
            lastLogout: this.lastLogoutTime,
            lastVisitTimes: this.lastVisitTimes
        };
        
        // Salva sempre in localStorage come backup
        this.saveToLocalStorage();
        
        // Prova anche Supabase se disponibile
        if (this.supabaseClient) {
            try {
                const { error } = await this.supabaseClient
                    .from('user_activity')
                    .upsert([{
                        user_id: currentUser.uid,
                        last_logout: new Date(this.lastLogoutTime).toISOString(),
                        last_visit_times: this.lastVisitTimes
                    }], { onConflict: 'user_id' });

                if (error) throw error;
                
                console.log('✅ Attività salvata su Supabase');
            } catch (supabaseError) {
                console.warn('⚠️ Impossibile salvare su Supabase:', supabaseError);
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

    // Conta nuovi messaggi - MIGRATO A SUPABASE
    async countNewMessages(section, sinceTime) {
        let count = 0;
        
        // PRIMA: Prova con Supabase
        if (this.supabaseClient) {
            try {
                const { data, error } = await this.supabaseClient
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('section', section)
                    .gte('created_at', new Date(sinceTime).toISOString())
                    .neq('author_id', currentUser.uid); // Non contare i propri messaggi

                if (error) throw error;
                
                count = data?.length || 0;
                console.log(`📊 Nuovi messaggi ${section} (Supabase): ${count}`);
                return count;
            } catch (supabaseError) {
                console.warn(`⚠️ Errore Supabase messaggi ${section}:`, supabaseError);
                // Fallback a Firebase/localStorage
            }
        }

        // FALLBACK: Firebase o localStorage
        const dataPath = window.getDataPath(section, 'messages');
        if (!dataPath) return 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(messagesRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const message = childSnapshot.val();
                        if (message.timestamp > sinceTime && message.authorId !== currentUser.uid) {
                            count++;
                        }
                    });
                }
                
                console.log(`📊 Nuovi messaggi ${section} (Firebase): ${count}`);
            } catch (error) {
                console.warn(`Errore conteggio messaggi ${section}:`, error);
                count = this.countFromLocalStorage(section, 'messages', sinceTime);
            }
        } else {
            count = this.countFromLocalStorage(section, 'messages', sinceTime);
        }
        
        return count;
    }

    // Conta nuovi thread - MIGRATO A SUPABASE
    async countNewThreads(section, sinceTime) {
        let count = 0;
        
        // PRIMA: Prova con Supabase
        if (this.supabaseClient) {
            try {
                const { data, error } = await this.supabaseClient
                    .from('threads')
                    .select('id', { count: 'exact', head: true })
                    .eq('section', section)
                    .gte('created_at', new Date(sinceTime).toISOString())
                    .in('status', ['approved', null]);

                if (error) throw error;
                
                count = data?.length || 0;
                console.log(`📊 Nuovi thread ${section} (Supabase): ${count}`);
                return count;
            } catch (supabaseError) {
                console.warn(`⚠️ Errore Supabase thread ${section}:`, supabaseError);
                // Fallback a Firebase/localStorage
            }
        }

        // FALLBACK: Firebase o localStorage
        const dataPath = window.getDataPath(section, 'threads');
        if (!dataPath) return 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(threadsRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const thread = childSnapshot.val();
                        if (thread.createdAt > sinceTime && 
                            (!thread.status || thread.status === 'approved')) {
                            count++;
                        }
                    });
                }
                
                console.log(`📊 Nuovi thread ${section} (Firebase): ${count}`);
            } catch (error) {
                console.warn(`Errore conteggio thread ${section}:`, error);
                count = this.countFromLocalStorage(section, 'threads', sinceTime);
            }
        } else {
            count = this.countFromLocalStorage(section, 'threads', sinceTime);
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

    // Avvia polling per simulare real-time
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Polling ogni 30 secondi (molto più efficiente dei listener Firebase)
        this.pollingInterval = setInterval(() => {
            if (this.isTracking && currentUser) {
                this.pollForUpdates();
            }
        }, 30000);
        
        console.log('📡 Polling avviato (30s interval)');
    }

    // Polling per aggiornamenti
    async pollForUpdates() {
        const now = Date.now();
        
        // Evita polling troppo frequente
        if (now - this.lastPollingUpdate < 25000) {
            return;
        }
        
        this.lastPollingUpdate = now;
        
        try {
            // Aggiorna solo sezioni non correnti
            const sectionsToUpdate = Object.keys(window.sectionConfig).filter(section => {
                return section !== window.getCurrentSection() && 
                       (!this.lastVisitTimes[section] || 
                        Date.now() - this.lastVisitTimes[section] > 60000);
            });
            
            let hasUpdates = false;
            
            for (const section of sectionsToUpdate) {
                const oldCount = this.unreadCounts[section] || 0;
                const newCount = await this.calculateSectionBadge(section);
                
                if (newCount !== oldCount) {
                    hasUpdates = true;
                    
                    if (newCount > 0) {
                        this.unreadCounts[section] = newCount;
                        this.addBadgeToSection(section, newCount, true);
                        
                        // Mostra notifica solo se il conteggio è aumentato
                        if (newCount > oldCount) {
                            this.showNewContentToast(section, newCount - oldCount);
                        }
                    } else {
                        delete this.unreadCounts[section];
                        this.removeBadgeFromSection(section);
                    }
                }
            }
            
            if (hasUpdates) {
                console.log('🔄 Aggiornamenti rilevati dal polling');
            }
            
        } catch (error) {
            console.error('Errore polling aggiornamenti:', error);
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

    // Rimuovi badge da una sezione
    removeBadgeFromSection(section) {
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (!navItem) return;
        
        const badge = navItem.querySelector('.section-badge');
        if (badge) {
            badge.remove();
        }
    }

    // Segna una sezione come visitata
    async markSectionAsVisited(section) {
        if (!this.isTracking) return;
        
        console.log(`✅ Sezione ${section} marcata come visitata`);
        
        // Aggiorna timestamp ultima visita
        this.lastVisitTimes[section] = Date.now();
        
        // Rimuovi badge per questa sezione
        delete this.unreadCounts[section];
        this.removeBadgeFromSection(section);
        
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
            this.removeBadgeFromSection(section);
        }
    }

    // Gestisci nuovo contenuto
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
        }, 60000); // Ogni minuto (ridotto da 30s)
    }

    // Refresh badge
    async refreshBadges() {
        console.log('🔄 Refresh badge...');
        
        // Ricalcola per sezioni non correnti
        const sectionsToUpdate = Object.keys(window.sectionConfig).filter(section => {
            return section !== window.getCurrentSection() && 
                   (!this.lastVisitTimes[section] || 
                    Date.now() - this.lastVisitTimes[section] > 120000); // 2 minuti
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
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
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
        this.lastPollingUpdate = 0;
    }

    // Mostra toast per nuovo contenuto
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

    // Funzione per debug
    debugStatus() {
        console.log('🔍 Activity Tracker Status:');
        console.log('- Tracking attivo:', this.isTracking);
        console.log('- Supabase disponibile:', !!this.supabaseClient);
        console.log('- Polling attivo:', !!this.pollingInterval);
        console.log('- Badge attuali:', this.unreadCounts);
        console.log('- Ultimo polling:', new Date(this.lastPollingUpdate).toLocaleString());
        console.log('- Ultime visite:', this.lastVisitTimes);
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

// Funzione per refresh manuale badge
window.refreshBadgesManually = async function() {
    if (window.activityTracker && window.activityTracker.isTracking) {
        const btn = document.getElementById('refresh-badges-btn');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<div class="refresh-spinner"></div><span>Aggiornando...</span>';
            btn.disabled = true;
            
            try {
                await window.activityTracker.calculateAllBadges();
                window.activityTracker.updateAllBadges();
                
                // Feedback positivo
                btn.innerHTML = '<span class="refresh-icon">✅</span><span>Aggiornati</span>';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }, 1500);
            } catch (error) {
                console.error('Errore refresh badge:', error);
                btn.innerHTML = '<span class="refresh-icon">❌</span><span>Errore</span>';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }, 1500);
            }
        }
    }
};

// Debug globale
window.debugActivityTracker = function() {
    if (window.activityTracker) {
        window.activityTracker.debugStatus();
    }
};

console.log('✅ Activity Tracker con Supabase caricato!');