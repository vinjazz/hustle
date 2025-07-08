// ===============================================
// BADGE INTEGRATION - VERSIONE CORRETTA
// ===============================================

/**
 * Sistema di integrazione badge che evita conflitti con script.js
 * Questa versione controlla le duplicazioni e integra in modo sicuro
 */

(function() {
    'use strict';
    
    // Controlla se siamo già stati caricati
    if (window.badgeIntegrationLoaded) {
        console.log('⚠️ Badge Integration già caricato, skip');
        return;
    }
    
    console.log('🏷️ Badge Integration caricamento...');
    
    // ===============================================
    // 1. CONTROLLO PREREQUISITI
    // ===============================================
    
    function checkPrerequisites() {
        // Prerequisiti essenziali (devono esserci)
        const essential = {
            badgeSystem: window.badgeSystem,
            sectionConfig: window.sectionConfig
        };
        
        // Prerequisiti opzionali (possono mancare temporaneamente)
        const optional = {
            currentUser: window.currentUser,
            getCurrentUserClan: window.getCurrentUserClan
        };
        
        const missingEssential = Object.keys(essential).filter(key => !essential[key]);
        const missingOptional = Object.keys(optional).filter(key => !optional[key]);
        
        if (missingEssential.length > 0) {
            console.warn('⚠️ Badge Integration: Prerequisiti essenziali mancanti:', missingEssential);
            return false;
        }
        
        if (missingOptional.length > 0) {
            console.log('🏷️ Badge Integration: Prerequisiti opzionali mancanti (OK per utenti non loggati):', missingOptional);
        }
        
        return true;
    }
    
    // ===============================================
    // 2. UTILITY FUNCTIONS (SOLO SE NON ESISTONO)
    // ===============================================
    
    // Helper per gestire badge CSS - controlla se esiste già
    if (!window.updateNavItemBadgeClass) {
        window.updateNavItemBadgeClass = function(sectionKey, hasBadge) {
            const navItem = document.querySelector(`[data-section="${sectionKey}"]`);
            if (navItem) {
                if (hasBadge) {
                    navItem.classList.add('has-badge');
                } else {
                    navItem.classList.remove('has-badge');
                }
            }
        };
    }
    
    // Debounce per aggiornamenti - usa quello esistente o crea nuovo
    if (!window.debouncedBadgeUpdate) {
        let badgeUpdateTimeout;
        window.debouncedBadgeUpdate = function(sectionKey) {
            clearTimeout(badgeUpdateTimeout);
            badgeUpdateTimeout = setTimeout(() => {
                if (window.badgeSystem && window.badgeSystem.isInitialized) {
                    window.badgeSystem.refreshSectionBadge(sectionKey);
                }
            }, 1000);
        };
    }
    
    // ===============================================
    // 3. ESTENSIONI BADGE SYSTEM
    // ===============================================
    
    function extendBadgeSystem() {
        if (!window.badgeSystem) {
            console.warn('⚠️ Badge System non disponibile per estensione');
            return false;
        }
        
        // Controlla se già esteso
        if (window.badgeSystem._extended) {
            console.log('🏷️ Badge System già esteso, skip');
            return true;
        }
        
        // Salva metodi originali
        const originalAddBadge = window.badgeSystem.addBadge;
        const originalRemoveBadge = window.badgeSystem.removeBadge;
        
        // Estendi addBadge
        window.badgeSystem.addBadge = function(sectionKey, count) {
            originalAddBadge.call(this, sectionKey, count);
            
            // Aggiungi classe CSS
            if (window.updateNavItemBadgeClass) {
                window.updateNavItemBadgeClass(sectionKey, true);
            }
            
            // Aggiungi classi basate sul conteggio
            const badge = document.querySelector(`.section-badge[data-section="${sectionKey}"]`);
            if (badge) {
                badge.classList.remove('badge-double-digit', 'badge-high-count');
                if (count >= 10) {
                    badge.classList.add('badge-double-digit');
                }
                if (count >= 99) {
                    badge.classList.add('badge-high-count');
                }
            }
        };
        
        // Estendi removeBadge
        window.badgeSystem.removeBadge = function(sectionKey) {
            originalRemoveBadge.call(this, sectionKey);
            
            if (window.updateNavItemBadgeClass) {
                window.updateNavItemBadgeClass(sectionKey, false);
            }
        };
        
        // Marca come esteso
        window.badgeSystem._extended = true;
        
        console.log('✅ Badge System esteso con funzionalità UI');
        return true;
    }
    
    // ===============================================
    // 4. INTEGRAZIONE CON SCRIPT.JS ESISTENTE
    // ===============================================
    
    function integrateWithExistingSystem() {
        let integrationsCount = 0;
        
        // Estendi sendMessage se esiste
        if (window.sendMessage && !window.sendMessage._badgeIntegrated) {
            const originalSendMessage = window.sendMessage;
            window.sendMessage = function() {
                const result = originalSendMessage.apply(this, arguments);
                
                // Aggiorna badge della sezione corrente
                if (window.currentSection && window.debouncedBadgeUpdate) {
                    window.debouncedBadgeUpdate(window.currentSection);
                }
                
                return result;
            };
            window.sendMessage._badgeIntegrated = true;
            integrationsCount++;
        }
        
        // Estendi createThread se esiste
        if (window.createThread && !window.createThread._badgeIntegrated) {
            const originalCreateThread = window.createThread;
            window.createThread = function() {
                const result = originalCreateThread.apply(this, arguments);
                
                // Aggiorna badge della sezione corrente
                if (window.currentSection && window.debouncedBadgeUpdate) {
                    window.debouncedBadgeUpdate(window.currentSection);
                }
                
                return result;
            };
            window.createThread._badgeIntegrated = true;
            integrationsCount++;
        }
        
        // Estendi addComment se esiste
        if (window.addComment && !window.addComment._badgeIntegrated) {
            const originalAddComment = window.addComment;
            window.addComment = function() {
                const result = originalAddComment.apply(this, arguments);
                
                // Aggiorna badge della sezione del thread corrente
                if (window.currentThreadSection && window.debouncedBadgeUpdate) {
                    window.debouncedBadgeUpdate(window.currentThreadSection);
                }
                
                return result;
            };
            window.addComment._badgeIntegrated = true;
            integrationsCount++;
        }
        
        console.log(`✅ Integrazione con sistema esistente completata (${integrationsCount} funzioni integrate)`);
        return integrationsCount;
    }
    
    // ===============================================
    // 5. OBSERVER PER MODIFICHE DOM
    // ===============================================
    
    function setupDOMObserver() {
        // Observer per rilevare nuovi nav items
        if (!window.navObserver) {
            window.navObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && 
                            node.classList && node.classList.contains('nav-item')) {
                            
                            const sectionKey = node.getAttribute('data-section');
                            if (sectionKey && window.badgeSystem && window.badgeSystem.isInitialized) {
                                setTimeout(() => {
                                    window.badgeSystem.refreshSectionBadge(sectionKey);
                                }, 100);
                            }
                        }
                    });
                });
            });
            
            // Avvia osservazione
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                window.navObserver.observe(sidebar, {
                    childList: true,
                    subtree: true
                });
                console.log('✅ DOM Observer configurato');
            }
        }
    }
    
    // ===============================================
    // 6. FUNZIONI DI UTILITÀ GLOBALI
    // ===============================================
    
    // Funzioni di test e debug
    window.showTestBadges = function() {
        if (!window.badgeSystem) {
            console.log('❌ Badge system non disponibile');
            return;
        }
        
        const testBadges = {
            'eventi': 3,
            'chat-generale': 15,
            'novita': 1,
            'clan-chat': 8,
            'clan-war': 2
        };
        
        Object.entries(testBadges).forEach(([section, count]) => {
            window.badgeSystem.addBadge(section, count);
        });
        
        console.log('🧪 Badge di test mostrati');
        
        // Rimuovi dopo 10 secondi
        setTimeout(() => {
            Object.keys(testBadges).forEach(section => {
                window.badgeSystem.removeBadge(section);
            });
            console.log('🧹 Badge di test rimossi');
        }, 10000);
    };
    
    window.forceBadgeRefresh = function() {
        if (window.badgeSystem && window.badgeSystem.isInitialized) {
            window.badgeSystem.refreshAllBadges();
            console.log('🔄 Badge aggiornati forzatamente');
        } else {
            console.log('❌ Badge system non inizializzato');
        }
    };
    
    window.resetVisitTracking = function() {
        if (!confirm('⚠️ Vuoi resettare il tracking delle visite? Tutti i badge riappariranno.')) {
            return;
        }
        
        if (window.badgeSystem && window.badgeSystem.isInitialized) {
            window.badgeSystem.lastVisitData = { lastLogin: Date.now() };
            window.badgeSystem.saveLastVisitData();
            window.badgeSystem.refreshAllBadges();
            console.log('🔄 Tracking visite resettato');
        }
    };
    
    // ===============================================
    // 7. INIZIALIZZAZIONE
    // ===============================================
    
    let initializationAttempts = 0;
    const MAX_INIT_ATTEMPTS = 5;
    
    function initializeBadgeIntegration() {
        console.log('🏷️ Inizializzazione Badge Integration...');
        
        initializationAttempts++;
        
        // Controlla prerequisiti
        if (!checkPrerequisites()) {
            if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                console.log(`⚠️ Prerequisiti non soddisfatti, riprovo tra 2 secondi... (tentativo ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);
                setTimeout(initializeBadgeIntegration, 2000);
            } else {
                console.log('⚠️ Raggiunto limite tentativi di inizializzazione. Badge Integration funzionerà parzialmente.');
                // Inizializza comunque quello che può
                partialInitialization();
            }
            return;
        }
        
        // Inizializzazione completa
        fullInitialization();
    }
    
    function partialInitialization() {
        console.log('🏷️ Inizializzazione parziale Badge Integration...');
        
        // Setup solo le funzioni di base che non dipendono dall'utente
        setupDOMObserver();
        
        // Aspetta l'evento userLoggedIn per completare l'inizializzazione
        console.log('🏷️ Badge Integration in modalità standby, in attesa del login utente');
        window.badgeIntegrationLoaded = true;
    }
    
    function fullInitialization() {
        console.log('🏷️ Inizializzazione completa Badge Integration...');
        
        // Estendi badge system
        extendBadgeSystem();
        
        // Integra con sistema esistente
        integrateWithExistingSystem();
        
        // Setup observer
        setupDOMObserver();
        
        console.log('✅ Badge Integration inizializzato completamente');
        window.badgeIntegrationLoaded = true;
    }
    
    // ===============================================
    // 8. GESTIONE EVENTI
    // ===============================================
    
    // Inizializza quando tutto è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBadgeIntegration);
    } else {
        // DOM già caricato
        setTimeout(initializeBadgeIntegration, 1000);
    }
    
    // Gestione eventi utente
    document.addEventListener('userLoggedIn', (event) => {
        console.log('🏷️ Badge Integration: Utente loggato');
        
        // Se abbiamo fatto solo inizializzazione parziale, completala ora
        if (window.badgeIntegrationLoaded && initializationAttempts >= MAX_INIT_ATTEMPTS) {
            console.log('🏷️ Completamento inizializzazione Badge Integration post-login...');
            extendBadgeSystem();
            integrateWithExistingSystem();
        }
        
        // Inizializza badge system se necessario
        setTimeout(() => {
            if (window.badgeSystem && !window.badgeSystem.isInitialized) {
                window.badgeSystem.initialize(event.detail.user);
            }
        }, 1000);
    });
    
    document.addEventListener('userLoggedOut', () => {
        console.log('🏷️ Badge Integration: Utente disconnesso');
        if (window.badgeSystem) {
            window.badgeSystem.cleanup();
        }
    });
    
    document.addEventListener('sectionChanged', (event) => {
        const sectionKey = event.detail.sectionKey;
        if (window.badgeSystem && window.badgeSystem.isInitialized) {
            window.badgeSystem.markSectionAsVisited(sectionKey);
        }
    });
    
    // ===============================================
    // 9. DEBUG E UTILITÀ
    // ===============================================
    
    window.debugBadgeIntegration = function() {
        console.log('🏷️ === DEBUG BADGE INTEGRATION ===');
        console.log('🔧 Integration caricata:', window.badgeIntegrationLoaded);
        console.log('🔧 Tentativi inizializzazione:', initializationAttempts);
        console.log('🔧 Badge System disponibile:', !!window.badgeSystem);
        console.log('🔧 Badge System inizializzato:', window.badgeSystem?.isInitialized);
        console.log('🔧 Badge System esteso:', window.badgeSystem?._extended);
        console.log('🏷️ Badge nel DOM:', document.querySelectorAll('.section-badge').length);
        console.log('📊 Nav items con badge:', document.querySelectorAll('.nav-item.has-badge').length);
        
        // Verifica prerequisiti
        console.log('📋 Prerequisiti:');
        console.log('  - sectionConfig:', !!window.sectionConfig);
        console.log('  - currentUser:', !!window.currentUser);
        console.log('  - getCurrentUserClan:', !!window.getCurrentUserClan);
        console.log('  - badgeSystem:', !!window.badgeSystem);
        
        // Verifica integrazioni
        console.log('🔗 Integrazioni funzioni:');
        console.log('  - sendMessage integrata:', !!window.sendMessage?._badgeIntegrated);
        console.log('  - createThread integrata:', !!window.createThread?._badgeIntegrated);
        console.log('  - addComment integrata:', !!window.addComment?._badgeIntegrated);
        
        if (window.badgeSystem && window.badgeSystem.isInitialized) {
            const stats = window.badgeSystem.getStats();
            console.log('📈 Statistiche badge:', stats);
        }
        
        // Test elementi DOM
        const requiredElements = [
            '[data-section="eventi"]', 
            '[data-section="chat-generale"]', 
            '.sidebar',
            '.nav-item'
        ];
        
        console.log('🎯 Elementi DOM:');
        requiredElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`  - ${selector}:`, elements.length > 0 ? `✅ ${elements.length} trovati` : '❌ Non trovato');
        });
        
        // Suggerimenti
        if (!window.currentUser) {
            console.log('💡 Suggerimento: Badge Integration funzionerà completamente dopo il login utente');
        }
        
        if (!window.sectionConfig) {
            console.log('⚠️ Attenzione: sectionConfig non trovato - controlla l\'ordine di caricamento degli script');
        }
    };
    
    // Auto-debug in sviluppo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            window.debugBadgeIntegration();
        }, 3000);
    }
    
    console.log('🏷️ Badge Integration Module caricato');
    
})();