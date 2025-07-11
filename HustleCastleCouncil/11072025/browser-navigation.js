// ===============================================
// BROWSER NAVIGATION SYSTEM
// File: browser-navigation.js
// ===============================================

(function() {
    'use strict';
    
    // Variabili del sistema di navigazione
    let navigationStack = [];
    let isNavigating = false;
    
    // Sistema di navigazione browser
    const BrowserNavigation = {
        
        // Inizializza il sistema
        init() {
            console.log('🧭 Inizializzazione browser navigation...');
            
            this.setupInitialState();
            this.bindEvents();
            this.overrideExistingFunctions();
            
            console.log('✅ Browser navigation attivo');
        },
        
        // Configura lo stato iniziale
        setupInitialState() {
            if (!history.state) {
                const initialState = {
                    section: 'home',
                    type: 'section',
                    timestamp: Date.now()
                };
                history.replaceState(initialState, '', '#home');
                navigationStack = [initialState];
            } else {
                navigationStack = history.state.stack || [history.state];
            }
        },
        
        // Bind degli event listeners
        bindEvents() {
            window.addEventListener('popstate', this.handlePopState.bind(this));
            window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
            document.addEventListener('keydown', this.handleHotkeys.bind(this));
        },
        
        // Gestisce il pulsante indietro del browser
        handlePopState(event) {
            if (isNavigating) return;
            
            console.log('🔙 Navigazione browser:', event.state);
            
            if (event.state) {
                isNavigating = true;
                
                try {
                    switch (event.state.type) {
                        case 'section':
                            this.navigateToSection(event.state.section, false);
                            break;
                        case 'thread':
                            this.navigateToThread(event.state.threadId, event.state.section, false);
                            break;
                        default:
                            this.navigateToSection('home', false);
                    }
                    
                    if (event.state.stack) {
                        navigationStack = event.state.stack;
                    }
                    
                } catch (error) {
                    console.error('❌ Errore navigazione:', error);
                    this.navigateToSection('home', false);
                } finally {
                    setTimeout(() => {
                        isNavigating = false;
                    }, 100);
                }
            } else {
                this.navigateToSection('home', false);
            }
        },
        
        // Previene chiusura accidentale
        handleBeforeUnload(event) {
            if (window.currentSection !== 'home' || navigationStack.length > 1) {
                event.preventDefault();
                event.returnValue = 'Sei sicuro di voler uscire dal forum?';
                return event.returnValue;
            }
        },
        
        // Gestisce hotkeys
        handleHotkeys(event) {
            if (event.target.tagName === 'INPUT' || 
                event.target.tagName === 'TEXTAREA' || 
                event.target.contentEditable === 'true') {
                return;
            }
            
            switch (event.key) {
                case 'h':
                case 'H':
                    if (!event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        this.goToHome();
                    }
                    break;
                    
                case 'Escape':
                    event.preventDefault();
                    this.goBack();
                    break;
            }
        },
        
        // Aggiunge stato alla cronologia
        pushState(state) {
            if (isNavigating) return;
            
            navigationStack.push(state);
            
            if (navigationStack.length > 20) {
                navigationStack = navigationStack.slice(-20);
            }
            
            state.stack = [...navigationStack];
            
            let url = '#' + state.section;
            if (state.type === 'thread') {
                url += '/thread/' + state.threadId;
            }
            
            try {
                history.pushState(state, '', url);
                console.log('✅ Stato aggiunto:', state.section);
            } catch (error) {
                console.error('❌ Errore push state:', error);
            }
        },
        
        // Naviga a una sezione
        navigateToSection(sectionKey, updateHistory = true) {
            if (!window.sectionConfig || !window.sectionConfig[sectionKey]) {
                console.warn('⚠️ Sezione non trovata:', sectionKey);
                return;
            }
            
            if (updateHistory && !isNavigating) {
                this.pushState({
                    section: sectionKey,
                    type: 'section',
                    timestamp: Date.now()
                });
            }
            
            // Chiama la funzione originale se esiste
            if (window.originalSwitchSection) {
                window.originalSwitchSection(sectionKey);
            } else if (window.switchSection) {
                // Evita loop infinito temporaneamente disabilitando override
                const temp = window.switchSection;
                window.switchSection = window.originalSwitchSection || (() => {});
                temp(sectionKey);
                window.switchSection = temp;
            }
            
            window.currentSection = sectionKey;
            this.updateUI();
        },
        
        // Naviga a un thread
        async navigateToThread(threadId, section, updateHistory = true) {
            if (updateHistory && !isNavigating) {
                this.pushState({
                    section: section,
                    threadId: threadId,
                    type: 'thread',
                    timestamp: Date.now()
                });
            }
            
            // Chiama la funzione originale se esiste
            if (window.originalOpenThread) {
                await window.originalOpenThread(threadId, section);
            } else if (window.openThread) {
                const temp = window.openThread;
                window.openThread = window.originalOpenThread || (() => {});
                await temp(threadId, section);
                window.openThread = temp;
            }
            
            this.updateUI();
        },
        
        // Torna indietro
        goBack() {
            if (document.getElementById('thread-view')?.style.display === 'flex') {
                this.backToForum();
            } else if (window.currentSection !== 'home') {
                this.goToHome();
            }
        },
        
        // Torna al forum
        backToForum() {
            if (navigationStack.length > 1 && history.length > 1) {
                history.back();
            } else {
                this.backToForumDirect();
            }
        },
        
        // Torna al forum direttamente
        backToForumDirect() {
            const threadView = document.getElementById('thread-view');
            const forumContent = document.getElementById('forum-content');
            const newThreadBtn = document.getElementById('new-thread-btn');
            
            if (threadView) threadView.style.display = 'none';
            if (forumContent) forumContent.style.display = 'block';
            if (newThreadBtn) newThreadBtn.style.display = 'block';
            
            // Pulisci dati thread
            if (window.cleanupCommentImageUpload) {
                window.cleanupCommentImageUpload();
            }
            
            window.currentThread = null;
            window.currentThreadId = null;
            window.currentThreadSection = null;
            
            // Ricarica contenuto
            if (window.currentSection && window.loadThreads) {
                window.loadThreads(window.currentSection);
            }
        },
        
        // Vai alla home
        goToHome() {
            this.navigateToSection('home', true);
        },
        
        // Aggiorna UI
        updateUI() {
            // Aggiorna body attributes
            if (window.currentSection) {
                document.body.setAttribute('data-current-section', window.currentSection);
            }
            
            if (window.currentThreadId) {
                document.body.setAttribute('data-current-thread', window.currentThreadId);
            } else {
                document.body.removeAttribute('data-current-thread');
            }
            
            // Trigger custom event per altri sistemi
            window.dispatchEvent(new CustomEvent('navigationUpdate', {
                detail: {
                    section: window.currentSection,
                    threadId: window.currentThreadId,
                    stack: navigationStack
                }
            }));
        },
        
        // Override delle funzioni esistenti
        overrideExistingFunctions() {
            // Backup funzioni originali
            if (window.switchSection && !window.originalSwitchSection) {
                window.originalSwitchSection = window.switchSection;
                window.switchSection = (sectionKey) => {
                    this.navigateToSection(sectionKey, true);
                };
            }
            
            if (window.openThread && !window.originalOpenThread) {
                window.originalOpenThread = window.openThread;
                window.openThread = (threadId, section) => {
                    this.navigateToThread(threadId, section, true);
                };
            }
            
            if (window.backToForum && !window.originalBackToForum) {
                window.originalBackToForum = window.backToForum;
                window.backToForum = () => {
                    this.backToForum();
                };
            }
        },
        
        // Debug info
        debug() {
            console.log('🔍 Browser Navigation Debug:');
            console.log('- Sezione corrente:', window.currentSection);
            console.log('- Thread corrente:', window.currentThreadId);
            console.log('- Stack navigazione:', navigationStack);
            console.log('- History length:', history.length);
            console.log('- History state:', history.state);
            console.log('- URL corrente:', window.location.href);
            console.log('- Navigando:', isNavigating);
        },
        
        // Mostra toast (funzione utility)
        showToast(message, duration = 3000) {
            const existingToasts = document.querySelectorAll('.nav-toast');
            existingToasts.forEach(toast => toast.remove());
            
            const toast = document.createElement('div');
            toast.className = 'nav-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(22, 33, 62, 0.95);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                z-index: 10000;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 14px;
                max-width: 90%;
                text-align: center;
                opacity: 0;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '1';
            }, 100);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }
    };
    
    // Esporta globalmente
    window.BrowserNavigation = BrowserNavigation;
    
    // Auto-inizializzazione se il DOM è già pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => BrowserNavigation.init(), 1000);
        });
    } else {
        setTimeout(() => BrowserNavigation.init(), 1000);
    }
    
    // Aggiungi funzioni di debug globali
    window.debugNavigation = () => BrowserNavigation.debug();
    window.showNavToast = (msg, duration) => BrowserNavigation.showToast(msg, duration);
    
    console.log('📦 Browser Navigation module caricato');
    
})();