// ===============================================
// NAVIGATION SYSTEM INITIALIZER
// File: navigation-init.js
// ===============================================

(function() {
    'use strict';
    
    // Sistema di inizializzazione della navigazione
    const NavigationInitializer = {
        
        // Configurazione predefinita
        config: {
            enableMobileFeatures: true,      // Abilita breadcrumb e gesti mobile
            enableDebugMode: false,          // Abilita logging dettagliato
            autoDetectMobile: true,          // Auto-rileva dispositivi mobile
            initDelay: 1000,                 // Delay inizializzazione (ms)
            mobileBreakpoint: 768,           // Breakpoint per mobile (px)
            enableVibration: true,           // Abilita feedback vibrazione
            enableGestures: true,            // Abilita gesti swipe
            toastDuration: 3000             // Durata toast predefinita (ms)
        },
        
        // Stato di inizializzazione
        state: {
            initialized: false,
            browserNavReady: false,
            mobileNavReady: false,
            isMobile: false
        },
        
        // Inizializza tutto il sistema
        async init(userConfig = {}) {
            if (this.state.initialized) {
                console.log('⚠️ Navigation system già inizializzato');
                return;
            }
            
            // Merge configurazione utente
            Object.assign(this.config, userConfig);
            
            this.log('🚀 Inizializzazione Navigation System...');
            this.log('📋 Configurazione:', this.config);
            
            // Rileva ambiente
            this.detectEnvironment();
            
            // Attendi che il DOM sia pronto
            await this.waitForDOM();
            
            // Attendi che le dipendenze del forum siano caricate
            await this.waitForForumReady();
            
            // Inizializza componenti
            await this.initializeBrowserNavigation();
            
            if (this.config.enableMobileFeatures) {
                await this.initializeMobileNavigation();
            }
            
            // Setup globali
            this.setupGlobalFunctions();
            this.setupEventListeners();
            
            this.state.initialized = true;
            
            this.log('✅ Navigation System completamente inizializzato!');
            this.showWelcomeMessage();
        },
        
        // Rileva ambiente di esecuzione
        detectEnvironment() {
            this.state.isMobile = this.config.autoDetectMobile ? 
                window.innerWidth <= this.config.mobileBreakpoint : false;
            
            this.log('📱 Ambiente rilevato:', {
                isMobile: this.state.isMobile,
                screenWidth: window.innerWidth,
                touchSupported: 'ontouchstart' in window,
                vibrationSupported: !!navigator.vibrate,
                userAgent: navigator.userAgent
            });
        },
        
        // Attende che il DOM sia pronto
        waitForDOM() {
            return new Promise((resolve) => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
        },
        
        // Attende che il forum sia pronto
        waitForForumReady() {
            return new Promise((resolve) => {
                const checkReady = () => {
                    // Verifica che le funzioni base del forum esistano
                    if (window.currentSection !== undefined && 
                        window.sectionConfig && 
                        document.getElementById('forum-content')) {
                        
                        this.log('🏰 Forum pronto per integrazione navigazione');
                        resolve();
                    } else {
                        this.log('⏳ Attendo che il forum sia pronto...');
                        setTimeout(checkReady, 500);
                    }
                };
                
                setTimeout(checkReady, this.config.initDelay);
            });
        },
        
        // Inizializza navigazione browser
        async initializeBrowserNavigation() {
            try {
                if (window.BrowserNavigation) {
                    // BrowserNavigation si inizializza automaticamente
                    this.state.browserNavReady = true;
                    this.log('✅ Browser Navigation pronto');
                } else {
                    this.log('❌ BrowserNavigation non trovato - verifica che browser-navigation.js sia caricato');
                }
            } catch (error) {
                this.log('❌ Errore inizializzazione Browser Navigation:', error);
            }
        },
        
        // Inizializza navigazione mobile
        async initializeMobileNavigation() {
            try {
                if (window.MobileNavigation) {
                    // Configura MobileNavigation
                    window.MobileNavigation.configure({
                        vibrationEnabled: this.config.enableVibration,
                        gesturesEnabled: this.config.enableGestures
                    });
                    
                    this.state.mobileNavReady = true;
                    this.log('✅ Mobile Navigation pronto');
                } else {
                    this.log('⚠️ MobileNavigation non trovato - alcune funzionalità mobile non saranno disponibili');
                }
            } catch (error) {
                this.log('❌ Errore inizializzazione Mobile Navigation:', error);
            }
        },
        
        // Setup funzioni globali
        setupGlobalFunctions() {
            // Funzioni di debug
            window.debugNavSystem = () => this.debug();
            window.configureNavSystem = (config) => this.configure(config);
            window.restartNavSystem = () => this.restart();
            
            // Shortcut per azioni comuni
            window.navGoHome = () => this.goHome();
            window.navGoBack = () => this.goBack();
            window.navShowToast = (msg, duration) => this.showToast(msg, duration);
            
            this.log('🔧 Funzioni globali configurate');
        },
        
        // Setup event listeners globali
        setupEventListeners() {
            // Listener per cambi di orientamento/resize
            window.addEventListener('resize', this.handleResize.bind(this));
            window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
            
            // Listener per errori JavaScript
            window.addEventListener('error', this.handleError.bind(this));
            
            this.log('👂 Event listeners configurati');
        },
        
        // Gestisce resize finestra
        handleResize() {
            const wasIsMobile = this.state.isMobile;
            this.detectEnvironment();
            
            if (wasIsMobile !== this.state.isMobile) {
                this.log('📱 Cambio modalità:', this.state.isMobile ? 'Desktop → Mobile' : 'Mobile → Desktop');
                
                // Notifica i moduli del cambio
                if (window.MobileNavigation) {
                    window.MobileNavigation.updateUI();
                }
            }
        },
        
        // Gestisce cambio orientamento
        handleOrientationChange() {
            setTimeout(() => {
                this.handleResize();
            }, 500); // Delay per permettere al browser di aggiornare le dimensioni
        },
        
        // Gestisce errori JavaScript
        handleError(event) {
            if (event.error && event.error.message.includes('navigation')) {
                this.log('❌ Errore navigazione catturato:', event.error);
                
                // Tentativo di recovery automatico
                setTimeout(() => {
                    this.attemptRecovery();
                }, 1000);
            }
        },
        
        // Tentativo di recupero automatico
        attemptRecovery() {
            this.log('🔄 Tentativo di recupero sistema navigazione...');
            
            try {
                // Verifica stato componenti
                if (!this.state.browserNavReady && window.BrowserNavigation) {
                    window.BrowserNavigation.init();
                    this.state.browserNavReady = true;
                }
                
                if (!this.state.mobileNavReady && window.MobileNavigation) {
                    window.MobileNavigation.init();
                    this.state.mobileNavReady = true;
                }
                
                this.log('✅ Recupero completato');
                
            } catch (error) {
                this.log('❌ Recupero fallito:', error);
            }
        },
        
        // Azioni di navigazione
        goHome() {
            if (window.BrowserNavigation) {
                window.BrowserNavigation.goToHome();
            } else {
                // Fallback
                if (window.switchSection) {
                    window.switchSection('home');
                }
            }
        },
        
        goBack() {
            if (window.BrowserNavigation) {
                window.BrowserNavigation.goBack();
            } else {
                // Fallback
                if (window.backToForum) {
                    window.backToForum();
                }
            }
        },
        
        showToast(message, duration = this.config.toastDuration) {
            if (window.BrowserNavigation?.showToast) {
                window.BrowserNavigation.showToast(message, duration);
            } else if (window.MobileNavigation?.showToast) {
                window.MobileNavigation.showToast(message, duration);
            } else {
                // Fallback con alert per debug
                if (this.config.enableDebugMode) {
                    alert(message);
                }
            }
        },
        
        // Configurazione runtime
        configure(newConfig) {
            const oldConfig = { ...this.config };
            Object.assign(this.config, newConfig);
            
            this.log('⚙️ Configurazione aggiornata:', {
                old: oldConfig,
                new: this.config
            });
            
            // Aggiorna configurazioni dei moduli
            if (window.MobileNavigation && this.config.enableMobileFeatures) {
                window.MobileNavigation.configure({
                    vibrationEnabled: this.config.enableVibration,
                    gesturesEnabled: this.config.enableGestures
                });
            }
        },
        
        // Riavvio del sistema
        async restart() {
            this.log('🔄 Riavvio Navigation System...');
            
            this.state.initialized = false;
            this.state.browserNavReady = false;
            this.state.mobileNavReady = false;
            
            await this.init(this.config);
        },
        
        // Debug completo
        debug() {
            console.group('🔍 Navigation System Debug');
            
            console.log('📋 Configurazione:', this.config);
            console.log('📊 Stato:', this.state);
            console.log('🌐 Ambiente:', {
                userAgent: navigator.userAgent,
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                touchSupport: 'ontouchstart' in window,
                vibrationSupport: !!navigator.vibrate
            });
            
            if (window.BrowserNavigation) {
                console.log('🧭 Browser Navigation:', 'Disponibile');
                if (window.debugNavigation) window.debugNavigation();
            } else {
                console.log('🧭 Browser Navigation:', 'Non disponibile');
            }
            
            if (window.MobileNavigation) {
                console.log('📱 Mobile Navigation:', 'Disponibile');
                if (window.debugMobileNav) window.debugMobileNav();
            } else {
                console.log('📱 Mobile Navigation:', 'Non disponibile');
            }
            
            console.log('🏰 Forum State:', {
                currentSection: window.currentSection,
                currentThread: window.currentThreadId,
                sectionConfig: !!window.sectionConfig
            });
            
            console.groupEnd();
        },
        
        // Messaggio di benvenuto
        showWelcomeMessage() {
            if (!this.config.enableDebugMode) return;
            
            console.group('🎉 Navigation System Ready!');
            console.log('✅ Browser navigation:', this.state.browserNavReady ? 'Attivo' : 'Non disponibile');
            console.log('✅ Mobile features:', this.state.mobileNavReady ? 'Attivo' : 'Non disponibile');
            console.log('🎯 Modalità:', this.state.isMobile ? 'Mobile' : 'Desktop');
            console.log('');
            console.log('🔧 Funzioni disponibili:');
            console.log('  - debugNavSystem() - Debug completo');
            console.log('  - navGoHome() - Vai alla home');
            console.log('  - navGoBack() - Torna indietro');
            console.log('  - navShowToast(msg) - Mostra toast');
            console.log('');
            console.log('⌨️ Hotkeys (Desktop):');
            console.log('  - H - Vai alla home');
            console.log('  - Escape - Torna indietro');
            console.log('');
            console.log('👆 Gesti (Mobile):');
            console.log('  - Swipe da sinistra - Torna indietro');
            console.log('  - Pulsante indietro Android - Naviga nell\'app');
            console.groupEnd();
        },
        
        // Logging condizionale
        log(...args) {
            if (this.config.enableDebugMode) {
                console.log('[NavigationSystem]', ...args);
            }
        }
    };
    
    // Esporta globalmente
    window.NavigationSystem = NavigationInitializer;
    
    // Auto-inizializzazione con configurazione predefinita
    const autoInit = () => {
        // Cerca configurazione globale
        const globalConfig = window.navigationConfig || {};
        
        // Inizializza automaticamente se non disabilitato
        if (globalConfig.autoInit !== false) {
            NavigationInitializer.init(globalConfig);
        }
    };
    
    // Avvia quando tutto è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        setTimeout(autoInit, 100);
    }
    
    console.log('📦 Navigation System Initializer caricato');
    
})();