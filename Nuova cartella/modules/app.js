// app.js - Modulo principale dell'applicazione

window.App = {
    // Stato dell'applicazione
    isInitialized: false,
    currentSection: 'home',
    connectionStatus: false,
    
    /**
     * Inizializza l'applicazione
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inizializzazione applicazione Hustle Castle Forum...');
        
        try {
            // Verifica dipendenze
            this.checkDependencies();
            
            // Inizializza storage locale se necessario
            if (!window.useFirebase) {
                Utils.initializeLocalStorage();
            }
            
            // Inizializza moduli in ordine
            await this.initializeModules();
            
            // Setup monitoraggio connessione
            this.setupConnectionMonitoring();
            
            // Carica sezione iniziale
            this.switchSection('home');
            
            this.isInitialized = true;
            console.log('✅ Applicazione inizializzata con successo!');
            
        } catch (error) {
            console.error('❌ Errore durante l\'inizializzazione:', error);
            this.handleInitializationError(error);
        }
    },

    /**
     * Verifica che tutte le dipendenze siano caricate
     */
    checkDependencies() {
        const requiredModules = ['Utils', 'UI', 'Auth', 'Chat', 'Forum', 'Admin', 'Notifications'];
        const missingModules = requiredModules.filter(module => !window[module]);
        
        if (missingModules.length > 0) {
            throw new Error(`Moduli mancanti: ${missingModules.join(', ')}`);
        }
        
        console.log('✅ Tutte le dipendenze sono caricate');
    },

    /**
     * Inizializza tutti i moduli
     */
    async initializeModules() {
        console.log('🔧 Inizializzazione moduli...');
        
        // Inizializza in ordine di dipendenza
        UI.initialize();
        Auth.initialize();
        Chat.initialize();
        Forum.initialize();
        Admin.initialize();
        
        // Le notifiche verranno inizializzate dopo il login
        console.log('✅ Moduli inizializzati');
    },

    /**
     * Setup monitoraggio connessione
     */
    setupConnectionMonitoring() {
        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            // Monitora connessione Firebase
            const { ref, onValue } = window.firebaseImports;
            const connectedRef = ref(window.firebaseDatabase, '.info/connected');
            
            onValue(connectedRef, (snapshot) => {
                this.connectionStatus = snapshot.val() === true;
                UI.updateConnectionStatus(this.connectionStatus);
            });
        } else {
            // Modalità locale - sempre connesso
            this.connectionStatus = true;
            UI.updateConnectionStatus(this.connectionStatus);
        }
        
        // Monitora connessione internet
        window.addEventListener('online', () => {
            console.log('🌐 Connessione internet ripristinata');
            UI.showToast('Connessione ripristinata', 'success');
        });
        
        window.addEventListener('offline', () => {
            console.log('🌐 Connessione internet persa');
            UI.showToast('Connessione persa - modalità offline', 'warning');
        });
    },

    /**
     * Gestisce errori di inizializzazione
     */
    handleInitializationError(error) {
        console.error('Errore critico:', error);
        
        const errorMessage = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); color: white; display: flex; align-items: center; justify-content: center; z-index: 9999;">
                <div style="background: #2c3e50; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
                    <h2 style="color: #e74c3c; margin-bottom: 20px;">❌ Errore di Inizializzazione</h2>
                    <p style="margin-bottom: 20px;">Si è verificato un errore durante l'avvio dell'applicazione:</p>
                    <code style="background: #34495e; padding: 10px; border-radius: 5px; display: block; margin-bottom: 20px;">${error.message}</code>
                    <button onclick="location.reload()" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        🔄 Ricarica Pagina
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorMessage);
    },

    /**
     * Cambia sezione dell'applicazione
     */
    switchSection(sectionKey) {
        console.log(`🔄 Cambio sezione: ${this.currentSection} → ${sectionKey}`);
        
        // Verifica che la sezione esista
        if (!window.SECTION_CONFIG[sectionKey]) {
            console.error(`Sezione non trovata: ${sectionKey}`);
            return;
        }
        
        const section = window.SECTION_CONFIG[sectionKey];
        
        // Verifica accesso alla sezione
        if (!Utils.canAccessSection(sectionKey)) {
            this.handleAccessDenied(sectionKey);
            return;
        }
        
        // Pulisci sezione precedente
        this.cleanupCurrentSection();
        
        // Aggiorna stato
        this.currentSection = sectionKey;
        
        // Aggiorna header
        UI.updateSectionHeader(section.title, section.description);
        
        // Aggiorna navigazione
        UI.updateActiveNavigation(sectionKey);
        
        // Carica contenuto della sezione
        this.loadSectionContent(sectionKey, section);
        
        // Dispatch evento per notifiche
        document.dispatchEvent(new CustomEvent('sectionChanged', {
            detail: { section: sectionKey }
        }));
        
        // Aggiorna URL hash se supportato
        if (window.history && window.history.pushState) {
            window.history.pushState({ section: sectionKey }, '', `#${sectionKey}`);
        }
    },

    /**
     * Gestisce accesso negato a una sezione
     */
    handleAccessDenied(sectionKey) {
        if (sectionKey.startsWith('clan-')) {
            if (sectionKey === 'clan-moderation' && !Utils.isClanModerator()) {
                UI.showError('Solo i moderatori del clan possono accedere a questa sezione!');
            } else {
                UI.showError('Devi appartenere a un clan per accedere a questa sezione!');
            }
        } else if (sectionKey.startsWith('admin-')) {
            UI.showError('Non hai i permessi per accedere a questa sezione!');
        } else {
            UI.showError('Non hai i permessi per accedere a questa sezione!');
        }
    },

    /**
     * Carica contenuto della sezione
     */
    loadSectionContent(sectionKey, section) {
        // Mostra il tipo di contenuto appropriato
        UI.showContent(section.type);
        
        // Carica contenuto specifico
        switch (section.type) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'forum':
                Forum.loadThreads(sectionKey);
                break;
            case 'chat':
                Chat.loadMessages(sectionKey);
                break;
            case 'admin':
            case 'clan-admin':
                Admin.loadContent(sectionKey);
                break;
        }
    },

    /**
     * Pulisci sezione corrente
     */
    cleanupCurrentSection() {
        // I vari moduli gestiscono la loro pulizia automaticamente
        // attraverso i loro cleanup listeners
    },

    /**
     * Carica dashboard
     */
    loadDashboard() {
        console.log('🏠 Caricamento dashboard...');
        
        const threadList = document.getElementById('thread-list');
        if (!threadList) return;
        
        // Se l'utente non è ancora loggato, mostra messaggio di caricamento
        if (!window.currentUser) {
            threadList.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #666;">
                    <div style="font-size: 64px; margin-bottom: 20px;">⏳</div>
                    <h2 style="color: #8B4513; margin-bottom: 10px;">Caricamento Dashboard...</h2>
                    <p>Preparazione della tua area personale</p>
                </div>
            `;
            return;
        }
        
        const userName = window.currentUser.displayName || 'Guerriero';
        const userClan = Utils.getCurrentUserClan();
        const userRole = Utils.getCurrentUserRole();
        
        let welcomeMessage = this.getWelcomeMessage();
        let roleDisplay = this.getRoleDisplay(userRole);

        threadList.innerHTML = `
            <div style="display: grid; gap: 25px;">
                <!-- Welcome Section -->
                ${this.createWelcomeSection(welcomeMessage, userName, roleDisplay, userClan)}

                <!-- Quick Navigation -->
                ${this.createQuickNavigation()}

                <!-- Stats and Tips Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    ${this.createForumStats()}
                    ${this.createQuickTips()}
                </div>

                <!-- Quick Actions & Tips -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    ${this.createQuickActions(userClan)}
                    ${this.createDailyTipSection()}
                </div>

                <!-- Community Highlights -->
                ${this.createCommunityHighlights()}
            </div>
        `;

        // Aggiungi stili hover
        this.addDashboardStyles();

        // Carica consiglio del giorno
        setTimeout(() => this.loadDailyTip(), 300);
    },

    /**
     * Ottieni messaggio di benvenuto basato sull'ora
     */
    getWelcomeMessage() {
        const currentHour = new Date().getHours();
        if (currentHour < 12) return '🌅 Buongiorno';
        if (currentHour < 18) return '☀️ Buon pomeriggio';
        return '🌙 Buonasera';
    },

    /**
     * Ottieni display del ruolo
     */
    getRoleDisplay(userRole) {
        switch (userRole) {
            case window.USER_ROLES.SUPERUSER:
                return '<span class="user-role role-superuser">👑 SUPER ADMIN</span>';
            case window.USER_ROLES.CLAN_MOD:
                return '<span class="user-role role-moderator">🛡️ MODERATORE</span>';
            default:
                return '<span class="user-role role-user">⚔️ GUERRIERO</span>';
        }
    },

    /**
     * Crea sezione di benvenuto
     */
    createWelcomeSection(welcomeMessage, userName, roleDisplay, userClan) {
        return `
            <div style="background: linear-gradient(135deg, rgba(218, 165, 32, 0.1) 0%, rgba(244, 164, 96, 0.1) 100%); border-radius: 15px; padding: 25px; border: 2px solid rgba(218, 165, 32, 0.3); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -20px; right: -20px; font-size: 80px; opacity: 0.1;">🏰</div>
                <h2 style="color: #8B4513; margin-bottom: 15px; font-size: 28px;">
                    ${welcomeMessage}, ${userName}! ${roleDisplay}
                </h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                    Benvenuto nel forum ufficiale di Hustle Castle! Qui puoi discutere strategie, 
                    condividere esperienze e rimanere aggiornato sugli ultimi eventi del gioco.
                </p>
                ${userClan !== 'Nessuno' ? `
                    <div style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #3498db;">
                        <strong style="color: #3498db;">🏰 Clan: ${userClan}</strong>
                        <p style="color: #666; font-size: 14px; margin-top: 5px;">Accedi alle sezioni dedicate del tuo clan dal menu laterale</p>
                    </div>
                ` : `
                    <div style="background: rgba(255, 193, 7, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <strong style="color: #e68900;">⚠️ Non hai un clan</strong>
                        <p style="color: #666; font-size: 14px; margin-top: 5px;">Unisciti a un clan per accedere a funzionalità esclusive!</p>
                    </div>
                `}
            </div>
        `;
    },

    /**
     * Crea navigazione rapida
     */
    createQuickNavigation() {
        return `
            <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">
                <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>🧭</span> Navigazione Rapida
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div class="dashboard-card" onclick="App.switchSection('eventi')" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 10px;">📅</div>
                        <h4 style="margin-bottom: 8px;">Eventi</h4>
                        <p style="font-size: 12px; opacity: 0.9;">Scopri eventi in corso</p>
                    </div>
                    <div class="dashboard-card" onclick="App.switchSection('oggetti')" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 10px;">⚔️</div>
                        <h4 style="margin-bottom: 8px;">Oggetti</h4>
                        <p style="font-size: 12px; opacity: 0.9;">Guide su armi e armature</p>
                    </div>
                    <div class="dashboard-card" onclick="App.switchSection('novita')" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 10px;">🆕</div>
                        <h4 style="margin-bottom: 8px;">Novità</h4>
                        <p style="font-size: 12px; opacity: 0.9;">Ultimi aggiornamenti</p>
                    </div>
                    <div class="dashboard-card" onclick="App.switchSection('chat-generale')" style="background: linear-gradient(135deg, #27ae60, #229954); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 10px;">💬</div>
                        <h4 style="margin-bottom: 8px;">Chat</h4>
                        <p style="font-size: 12px; opacity: 0.9;">Chiacchiera con la community</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Crea statistiche forum
     */
    createForumStats() {
        const stats = Utils.getForumStats();
        return `
            <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">
                <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>📊</span> Statistiche Forum
                </h3>
                <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">
                        <span style="color: #666;">📝 Thread Totali</span>
                        <strong style="color: #8B4513;">${stats.totalThreads}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">
                        <span style="color: #666;">💬 Messaggi Chat</span>
                        <strong style="color: #8B4513;">${stats.totalMessages}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">
                        <span style="color: #666;">👥 Utenti Registrati</span>
                        <strong style="color: #8B4513;">${stats.totalUsers}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">
                        <span style="color: #666;">🏰 Clan Attivi</span>
                        <strong style="color: #8B4513;">${stats.totalClans}</strong>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Crea suggerimenti rapidi
     */
    createQuickTips() {
        return `
            <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">
                <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>💡</span> Suggerimenti Rapidi
                </h3>
                <div style="display: grid; gap: 12px;">
                    <div style="padding: 12px; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border-left: 4px solid #2ecc71;">
                        <strong style="color: #27ae60; font-size: 14px;">🎯 Partecipa alle Discussioni</strong>
                        <p style="color: #666; font-size: 12px; margin-top: 4px;">Condividi le tue strategie nella sezione Eventi</p>
                    </div>
                    <div style="padding: 12px; background: rgba(52, 152, 219, 0.1); border-radius: 8px; border-left: 4px solid #3498db;">
                        <strong style="color: #2980b9; font-size: 14px;">🏰 Unisciti a un Clan</strong>
                        <p style="color: #666; font-size: 12px; margin-top: 4px;">Accedi a chat e funzionalità esclusive</p>
                    </div>
                    <div style="padding: 12px; background: rgba(155, 89, 182, 0.1); border-radius: 8px; border-left: 4px solid #9b59b6;">
                        <strong style="color: #8e44ad; font-size: 14px;">⚔️ Condividi Equipaggiamenti</strong>
                        <p style="color: #666; font-size: 12px; margin-top: 4px;">Mostra le tue armi leggendarie!</p>
                    </div>
                    <div style="padding: 12px; background: rgba(230, 126, 34, 0.1); border-radius: 8px; border-left: 4px solid #e67e22;">
                        <strong style="color: #d68910; font-size: 14px;">📢 Rimani Aggiornato</strong>
                        <p style="color: #666; font-size: 12px; margin-top: 4px;">Controlla regolarmente le Novità</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Crea azioni rapide
     */
    createQuickActions(userClan) {
        return `
            <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">
                <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>⚡</span> Azioni Rapide
                </h3>
                <div style="display: grid; gap: 12px;">
                    <button onclick="App.switchSection('eventi')" class="quick-action-btn" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">📅</span>
                        <span>Controlla Eventi Attuali</span>
                    </button>
                    <button onclick="App.switchSection('chat-generale')" class="quick-action-btn" style="background: linear-gradient(135deg, #27ae60, #229954); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">💬</span>
                        <span>Inizia una Conversazione</span>
                    </button>
                    <button onclick="Forum.showThreadCreationModal()" class="quick-action-btn" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">✍️</span>
                        <span>Crea Nuovo Thread</span>
                    </button>
                    ${userClan !== 'Nessuno' ? `
                        <button onclick="App.switchSection('clan-chat')" class="quick-action-btn" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">🏰</span>
                            <span>Chat del Clan</span>
                        </button>
                    ` : `
                        <button onclick="alert('Unisciti a un clan per accedere a questa funzionalità!')" class="quick-action-btn" style="background: linear-gradient(135deg, #95a5a6, #7f8c8d); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px; opacity: 0.6;">
                            <span style="font-size: 20px;">🔒</span>
                            <span>Chat del Clan (Locked)</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Crea sezione consiglio del giorno
     */
    createDailyTipSection() {
        return `
            <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">
                <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>🎯</span> Consiglio del Giorno
                </h3>
                <div id="daily-tip" style="padding: 20px; background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(155, 89, 182, 0.1)); border-radius: 10px; border-left: 4px solid #3498db;">
                    <!-- Il consiglio verrà inserito qui -->
                </div>
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="App.loadDailyTip()" style="background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; color: #3498db; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.3s ease;">
                        🔄 Nuovo Consiglio
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Crea sezione community highlights
     */
    createCommunityHighlights() {
        return `
            <div style="background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(39, 174, 96, 0.1)); border-radius: 15px; padding: 25px; border: 2px solid #27ae60;">
                <h3 style="color: #27ae60; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>🌟</span> In Evidenza nella Community
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid rgba(39, 174, 96, 0.3);">
                        <div style="font-size: 48px; margin-bottom: 10px;">🔥</div>
                        <h4 style="color: #27ae60; margin-bottom: 8px;">Thread Più Visto</h4>
                        <p style="font-size: 12px; color: #666;">Guide alle Gemme Leggendarie</p>
                        <p style="font-size: 11px; color: #999;">445 visualizzazioni</p>
                    </div>
                    <div style="text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid rgba(39, 174, 96, 0.3);">
                        <div style="font-size: 48px; margin-bottom: 10px;">👑</div>
                        <h4 style="color: #27ae60; margin-bottom: 8px;">Utente del Mese</h4>
                        <p style="font-size: 12px; color: #666;">ProPlayer123</p>
                        <p style="font-size: 11px; color: #999;">67 contributi</p>
                    </div>
                    <div style="text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid rgba(39, 174, 96, 0.3);">
                        <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
                        <h4 style="color: #27ae60; margin-bottom: 8px;">Clan Più Attivo</h4>
                        <p style="font-size: 12px; color: #666;">Draghi Rossi</p>
                        <p style="font-size: 11px; color: #999;">25 membri attivi</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Aggiungi stili dashboard
     */
    addDashboardStyles() {
        if (!document.querySelector('#dashboard-styles')) {
            const style = document.createElement('style');
            style.id = 'dashboard-styles';
            style.textContent = `
                .dashboard-card:hover {
                    transform: translateY(-5px) scale(1.02);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }
                .quick-action-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }
                @media (max-width: 768px) {
                    div[style*="grid-template-columns: 1fr 1fr"] {
                        grid-template-columns: 1fr !important;
                    }
                    div[style*="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))"] {
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },

    /**
     * Carica consiglio del giorno
     */
    loadDailyTip() {
        const tipContainer = document.getElementById('daily-tip');
        if (!tipContainer) return;

        const tip = Utils.getDailyTip();

        tipContainer.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="font-size: 32px; flex-shrink: 0;">${tip.icon}</div>
                <div>
                    <h4 style="color: #3498db; margin: 0 0 8px 0; font-size: 16px;">${tip.title}</h4>
                    <p style="color: #666; margin: 0; line-height: 1.5; font-size: 14px;">${tip.content}</p>
                </div>
            </div>
        `;
    },

    /**
     * Gestisce navigazione browser (back/forward)
     */
    handleBrowserNavigation() {
        window.addEventListener('popstate', (event) => {
            const section = event.state?.section || 'home';
            if (section !== this.currentSection) {
                this.switchSection(section);
            }
        });

        // Gestisci hash iniziale
        if (window.location.hash) {
            const section = window.location.hash.slice(1);
            if (window.SECTION_CONFIG[section]) {
                setTimeout(() => this.switchSection(section), 500);
            }
        }
    },

    /**
     * Gestione performance e ottimizzazioni
     */
    setupPerformanceOptimizations() {
        // Lazy loading per immagini
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });

            // Osserva tutte le immagini con data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Throttle per scroll events
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) return;
            
            scrollTimeout = setTimeout(() => {
                // Gestisci eventi scroll qui se necessario
                scrollTimeout = null;
            }, 16); // ~60fps
        }, { passive: true });
    },

    /**
     * Gestione errori globali
     */
    setupErrorHandling() {
        // Gestione errori JavaScript non catturati
        window.addEventListener('error', (event) => {
            console.error('Errore JavaScript:', event.error);
            
            // In produzione, potresti voler inviare errori a un servizio di tracking
            // this.reportError(event.error);
            
            // Mostra messaggio user-friendly solo per errori critici
            if (event.error && event.error.stack && event.error.stack.includes('firebase')) {
                UI.showToast('Problema di connessione temporaneo', 'warning', 5000);
            }
        });

        // Gestione errori Promise non catturate
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise rejection non gestita:', event.reason);
            
            // Previeni il log nel console del browser
            event.preventDefault();
            
            // Gestisci errori Firebase specifici
            if (event.reason && event.reason.code) {
                const errorMessage = Utils.getErrorMessage(event.reason);
                UI.showToast(errorMessage, 'error', 5000);
            }
        });
    },

    /**
     * Salva stato applicazione (per recovery dopo refresh)
     */
    saveAppState() {
        try {
            const state = {
                currentSection: this.currentSection,
                timestamp: Date.now()
            };
            
            sessionStorage.setItem('hc_app_state', JSON.stringify(state));
        } catch (error) {
            console.warn('Impossibile salvare stato app:', error);
        }
    },

    /**
     * Ripristina stato applicazione
     */
    restoreAppState() {
        try {
            const savedState = sessionStorage.getItem('hc_app_state');
            if (!savedState) return;
            
            const state = JSON.parse(savedState);
            
            // Verifica che lo stato non sia troppo vecchio (max 1 ora)
            if (Date.now() - state.timestamp > 3600000) {
                sessionStorage.removeItem('hc_app_state');
                return;
            }
            
            // Ripristina sezione solo se valida e accessibile
            if (state.currentSection && 
                window.SECTION_CONFIG[state.currentSection] && 
                Utils.canAccessSection(state.currentSection)) {
                setTimeout(() => this.switchSection(state.currentSection), 100);
            }
        } catch (error) {
            console.warn('Impossibile ripristinare stato app:', error);
            sessionStorage.removeItem('hc_app_state');
        }
    },

    /**
     * Cleanup dell'applicazione
     */
    cleanup() {
        console.log('🧹 Pulizia applicazione...');
        
        // Salva stato prima di chiudere
        this.saveAppState();
        
        // Cleanup moduli
        if (Notifications.isInitialized) Notifications.cleanup();
        if (Chat.isInitialized) Chat.cleanup();
        if (Forum.isInitialized) Forum.cleanup();
        if (Admin.isInitialized) Admin.cleanup();
        if (UI.isInitialized) UI.cleanup();
        
        this.isInitialized = false;
        console.log('✅ Applicazione pulita');
    },

    /**
     * Restart dell'applicazione
     */
    async restart() {
        console.log('🔄 Riavvio applicazione...');
        
        this.cleanup();
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.initialize();
        
        console.log('✅ Applicazione riavviata');
    }
};

// Setup event listeners per ciclo di vita applicazione
window.addEventListener('beforeunload', () => {
    App.saveAppState();
});

window.addEventListener('load', () => {
    // Setup ottimizzazioni performance
    App.setupPerformanceOptimizations();
    
    // Setup gestione errori
    App.setupErrorHandling();
    
    // Setup navigazione browser
    App.handleBrowserNavigation();
    
    // Ripristina stato se possibile
    App.restoreAppState();
});

// Expose App globally
window.App = App;

console.log('🚀 App module loaded');