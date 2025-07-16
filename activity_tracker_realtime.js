// ===============================================
// ACTIVITY TRACKER MODULE - Supabase Real-time
// Firebase Auth + Supabase Data + Real-time Listeners
// ===============================================

class ActivityTracker {
    constructor() {
        this.lastLogoutTime = null;
        this.lastVisitTimes = {};
        this.unreadCounts = {};
        this.isTracking = false;
        this.supabaseClient = null;
        
        // Gestione subscriptions real-time
        this.subscriptions = new Map();
        this.channelCounter = 0;
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
        console.log('🔔 Inizializzazione Activity Tracker Real-time...');
        
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
        
        // Setup listener real-time per tutte le sezioni
        await this.setupRealTimeListeners();
        
        console.log('✅ Activity Tracker inizializzato (modalità Real-time Supabase)');
    }

    // Setup listener real-time per threads e messages
    async setupRealTimeListeners() {
        if (!this.supabaseClient) {
            console.log('⚠️ Supabase non disponibile per listener real-time');
            if (window.realtimeStatusIndicator) {
                window.realtimeStatusIndicator.updateStatus('error', 'Supabase non disponibile');
            }
            return;
        }

        try {
            // Aggiorna stato
            if (window.realtimeStatusIndicator) {
                window.realtimeStatusIndicator.updateStatus('connecting', 'Configurando listener...');
            }

            // Listener per threads
            const threadsChannel = this.supabaseClient
                .channel(`threads_changes_${++this.channelCounter}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'threads'
                    },
                    (payload) => this.handleThreadChange(payload)
                )
                .subscribe((status) => {
                    console.log(`📡 Threads channel status: ${status}`);
                    this.updateConnectionStatus();
                });

            this.subscriptions.set('threads', threadsChannel);

            // Listener per messages
            const messagesChannel = this.supabaseClient
                .channel(`messages_changes_${++this.channelCounter}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'messages'
                    },
                    (payload) => this.handleMessageChange(payload)
                )
                .subscribe((status) => {
                    console.log(`📡 Messages channel status: ${status}`);
                    this.updateConnectionStatus();
                });

            this.subscriptions.set('messages', messagesChannel);

            // Aspetta che entrambi i canali siano connessi
            setTimeout(() => {
                this.updateConnectionStatus();
            }, 2000);

            console.log('✅ Listener real-time configurati per threads e messages');
            
        } catch (error) {
            console.error('❌ Errore setup listener real-time:', error);
            if (window.realtimeStatusIndicator) {
                window.realtimeStatusIndicator.updateStatus('error', 'Errore configurazione listener');
            }
        }
    }

    // Aggiorna stato connessione
    updateConnectionStatus() {
        if (!window.realtimeStatusIndicator) return;

        const connectedChannels = Array.from(this.subscriptions.values()).filter(
            channel => channel.state === 'joined'
        ).length;

        const totalChannels = this.subscriptions.size;

        if (connectedChannels === 0 && totalChannels > 0) {
            window.realtimeStatusIndicator.updateStatus('connecting', 'Connessione in corso...');
        } else if (connectedChannels === totalChannels && totalChannels > 0) {
            window.realtimeStatusIndicator.updateStatus('connected', `${connectedChannels} canali attivi`);
        } else if (connectedChannels < totalChannels) {
            window.realtimeStatusIndicator.updateStatus('connecting', `${connectedChannels}/${totalChannels} canali`);
        } else {
            window.realtimeStatusIndicator.updateStatus('disconnected', 'Nessun canale attivo');
        }
    }

    // Gestisce cambiamenti ai threads
    async handleThreadChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        console.log(`🔄 Thread ${eventType}:`, newRecord || oldRecord);
        
        if (eventType === 'INSERT' && newRecord) {
            // Nuovo thread creato
            const section = newRecord.section;
            
            // Se non è l'autore e non è nella sezione corrente
            if (newRecord.author_id !== currentUser.uid && 
                window.getCurrentSection() !== section) {
                await this.updateSectionBadge(section);
            }
            
        } else if (eventType === 'UPDATE' && newRecord) {
            // Thread aggiornato (es. approvato)
            const section = newRecord.section;
            
            if (window.getCurrentSection() !== section) {
                await this.updateSectionBadge(section);
            }
        }
    }

    // Gestisce cambiamenti ai messages
    async handleMessageChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        console.log(`🔄 Message ${eventType}:`, newRecord || oldRecord);
        
        if (eventType === 'INSERT' && newRecord) {
            // Nuovo messaggio
            const section = newRecord.section;
            
            // Se non è l'autore e non è nella sezione corrente
            if (newRecord.author_id !== currentUser.uid && 
                window.getCurrentSection() !== section) {
                await this.updateSectionBadge(section);
                
                // Mostra notifica per nuovo contenuto
                this.showNewContentToast(section, 1);
            }
        }
    }

    // Carica dati attività utente
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

    // Salva dati attività utente
    async saveUserActivityData() {
        if (!currentUser || !this.isTracking) return;
        
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

    // Conta nuovi messaggi
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
                    .neq('author_id', currentUser.uid);

                if (error) throw error;
                
                count = data?.length || 0;
                console.log(`📊 Nuovi messaggi ${section} (Supabase): ${count}`);
                return count;
            } catch (supabaseError) {
                console.warn(`⚠️ Errore Supabase messaggi ${section}:`, supabaseError);
            }
        }

        // FALLBACK: Firebase o localStorage
        count = this.countFromLocalStorage(section, 'messages', sinceTime);
        return count;
    }

    // Conta nuovi thread
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
            }
        }

        // FALLBACK: localStorage
        count = this.countFromLocalStorage(section, 'threads', sinceTime);
        return count;
    }
    
    // Conta da localStorage (fallback)
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
            const oldCount = this.unreadCounts[section] || 0;
            this.unreadCounts[section] = count;
            
            // Mostra con animazione se è nuovo contenuto
            const isNewContent = count > oldCount;
            this.addBadgeToSection(section, count, isNewContent);
        } else {
            delete this.unreadCounts[section];
            this.removeBadgeFromSection(section);
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

    // Ferma tracking
    stopTracking() {
        this.isTracking = false;
        
        // Aggiorna stato
        if (window.realtimeStatusIndicator) {
            window.realtimeStatusIndicator.updateStatus('disconnected', 'Tracking fermato');
        }
        
        // Chiudi tutte le subscriptions real-time
        for (const [name, subscription] of this.subscriptions) {
            try {
                subscription.unsubscribe();
                console.log(`✅ Subscription ${name} chiusa`);
            } catch (error) {
                console.warn(`⚠️ Errore chiusura subscription ${name}:`, error);
            }
        }
        this.subscriptions.clear();
        
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
        
        // Reset indicatore stato
        if (window.realtimeStatusIndicator) {
            window.realtimeStatusIndicator.updateStatus('disconnected', 'Cleanup completato');
        }
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
        console.log('- Subscriptions attive:', this.subscriptions.size);
        console.log('- Badge attuali:', this.unreadCounts);
        console.log('- Ultime visite:', this.lastVisitTimes);
        console.log('- Subscriptions:', Array.from(this.subscriptions.keys()));
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

// Debug globale
window.debugActivityTracker = function() {
    if (window.activityTracker) {
        window.activityTracker.debugStatus();
    }
};

console.log('✅ Activity Tracker Real-time con Supabase caricato!');