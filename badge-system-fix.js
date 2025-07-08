// ===============================================
// BADGE SYSTEM FIX - CORREZIONE INIZIALIZZAZIONE
// ===============================================

(function() {
    'use strict';
    
    console.log('🔧 Badge System Fix caricato');
    
    // ===============================================
    // 1. ASSICURA CHE L'EVENTO userLoggedIn VENGA EMESSO
    // ===============================================
    
    // Intercetta onAuthStateChanged per garantire l'evento
    function ensureUserLoggedInEvent() {
        if (!window.firebaseAuth) return;
        
        const { onAuthStateChanged } = window.firebaseImports || {};
        if (!onAuthStateChanged) return;
        
        // Aggiungi listener per stato auth
        onAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
                console.log('🔧 Fix: Utente autenticato rilevato');
                
                // Aspetta che i dati utente siano caricati
                setTimeout(() => {
                    // Emetti evento userLoggedIn se non già emesso
                    const event = new CustomEvent('userLoggedIn', {
                        detail: { user: user }
                    });
                    document.dispatchEvent(event);
                    console.log('🔧 Fix: Evento userLoggedIn emesso manualmente');
                    
                    // Forza inizializzazione badge system
                    forceInitializeBadgeSystem(user);
                }, 2000);
            }
        });
    }
    
    // ===============================================
    // 2. FORZA INIZIALIZZAZIONE BADGE SYSTEM
    // ===============================================
    
    function forceInitializeBadgeSystem(user) {
        if (!window.badgeSystem) {
            console.error('❌ Badge System non trovato!');
            return;
        }
        
        if (window.badgeSystem.isInitialized) {
            console.log('✅ Badge System già inizializzato');
            // Forza refresh comunque
            window.badgeSystem.refreshAllBadges();
            return;
        }
        
        console.log('🔧 Forzando inizializzazione Badge System...');
        
        // Assicura che currentUser sia disponibile
        if (!window.currentUser && user) {
            window.currentUser = user;
        }
        
        // Inizializza
        window.badgeSystem.initialize(user || window.currentUser).then(() => {
            console.log('✅ Badge System inizializzato con successo');
            
            // Test immediato con badge fittizi
            setTimeout(() => {
                testBadgeVisibility();
            }, 1000);
        }).catch(error => {
            console.error('❌ Errore inizializzazione Badge System:', error);
        });
    }
    
    // ===============================================
    // 3. CREA SECTION CONFIG SE MANCANTE
    // ===============================================
    
    function ensureSectionConfig() {
        if (!window.sectionConfig) {
            console.log('🔧 Creazione sectionConfig...');
            window.sectionConfig = {
                'home': { title: '🏠 Dashboard', type: 'dashboard' },
                'eventi': { title: '📅 Eventi', type: 'forum', showNewThread: true },
                'oggetti': { title: '⚔️ Oggetti', type: 'forum', showNewThread: true },
                'novita': { title: '🆕 Novità', type: 'forum', showNewThread: true },
                'chat-generale': { title: '💬 Chat Generale', type: 'chat' },
                'associa-clan': { title: '🏠 Associa Clan', type: 'forum', showNewThread: true },
                'clan-chat': { title: '💬 Chat Clan', type: 'chat' },
                'clan-war': { title: '⚔️ Guerra', type: 'forum', showNewThread: true },
                'clan-premi': { title: '🏆 Premi', type: 'forum', showNewThread: true },
                'clan-consigli': { title: '💡 Consigli', type: 'forum', showNewThread: true },
                'clan-bacheca': { title: '🏰 Bacheca', type: 'forum', showNewThread: true },
                'clan-moderation': { title: '🛡️ Moderazione', type: 'forum' },
                'admin-users': { title: '👥 Gestione Utenti', type: 'admin' },
                'admin-clans': { title: '🏰 Gestione Clan', type: 'admin' }
            };
        }
    }
    
    // ===============================================
    // 4. TEST VISIBILITÀ BADGE
    // ===============================================
    
    function testBadgeVisibility() {
        console.log('🧪 Test visibilità badge...');
        
        // Aggiungi badge di test a diverse sezioni
        const testSections = ['eventi', 'chat-generale', 'novita'];
        
        testSections.forEach((section, index) => {
            const count = (index + 1) * 3;
            
            // Verifica che il nav item esista
            const navItem = document.querySelector(`[data-section="${section}"]`);
            if (!navItem) {
                console.error(`❌ Nav item non trovato per sezione: ${section}`);
                return;
            }
            
            // Aggiungi badge
            if (window.badgeSystem && window.badgeSystem.addBadge) {
                window.badgeSystem.addBadge(section, count);
                console.log(`✅ Badge aggiunto a ${section}: ${count}`);
            }
        });
        
        // Verifica presenza badge nel DOM
        setTimeout(() => {
            const badges = document.querySelectorAll('.section-badge');
            console.log(`🏷️ Badge trovati nel DOM: ${badges.length}`);
            
            if (badges.length === 0) {
                console.error('❌ Nessun badge visibile! Verifico CSS...');
                checkBadgeCSS();
            } else {
                console.log('✅ Badge visibili correttamente');
            }
        }, 500);
    }
    
    // ===============================================
    // 5. VERIFICA CSS BADGE
    // ===============================================
    
    function checkBadgeCSS() {
        // Verifica che il CSS dei badge sia caricato
        const badgeCSS = document.querySelector('link[href*="badge_manager.css"]');
        if (!badgeCSS) {
            console.error('❌ CSS badge_manager.css non trovato!');
            injectEmergencyCSS();
        } else {
            console.log('✅ CSS badge trovato');
            
            // Verifica che sia effettivamente caricato
            const testBadge = document.createElement('span');
            testBadge.className = 'section-badge';
            document.body.appendChild(testBadge);
            
            const styles = window.getComputedStyle(testBadge);
            if (styles.position !== 'absolute') {
                console.error('❌ CSS badge non applicato correttamente!');
                injectEmergencyCSS();
            }
            
            document.body.removeChild(testBadge);
        }
    }
    
    // ===============================================
    // 6. CSS DI EMERGENZA
    // ===============================================
    
    function injectEmergencyCSS() {
        console.log('💉 Iniezione CSS di emergenza...');
        
        const style = document.createElement('style');
        style.id = 'badge-emergency-css';
        style.textContent = `
            .nav-item {
                position: relative !important;
            }
            
            .section-badge {
                position: absolute !important;
                top: 8px !important;
                right: 8px !important;
                background: #ff4757 !important;
                color: white !important;
                font-size: 11px !important;
                font-weight: bold !important;
                padding: 2px 6px !important;
                border-radius: 10px !important;
                min-width: 18px !important;
                text-align: center !important;
                z-index: 100 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                line-height: 1 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
            }
            
            .section-badge.badge-double-digit {
                padding: 2px 8px !important;
            }
            
            @keyframes badge-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
            
            .section-badge {
                animation: badge-pulse 2s ease-in-out infinite;
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ CSS di emergenza iniettato');
    }
    
    // ===============================================
    // 7. MONITOR CONTINUO
    // ===============================================
    
    function setupContinuousMonitoring() {
        // Controlla periodicamente lo stato del badge system
        let checkCount = 0;
        const maxChecks = 10;
        
        const checkInterval = setInterval(() => {
            checkCount++;
            
            if (window.badgeSystem && window.badgeSystem.isInitialized) {
                console.log('✅ Badge System attivo e funzionante');
                clearInterval(checkInterval);
                return;
            }
            
            if (checkCount >= maxChecks) {
                console.error('❌ Badge System non si inizializza dopo 10 tentativi');
                clearInterval(checkInterval);
                
                // Ultimo tentativo forzato
                if (window.currentUser) {
                    forceInitializeBadgeSystem(window.currentUser);
                }
                return;
            }
            
            console.log(`⏳ Tentativo ${checkCount}/${maxChecks} di verifica Badge System...`);
            
            // Se c'è un utente ma il sistema non è inizializzato, forza
            if (window.currentUser && window.badgeSystem && !window.badgeSystem.isInitialized) {
                forceInitializeBadgeSystem(window.currentUser);
            }
            
        }, 2000);
    }
    
    // ===============================================
    // 8. FUNZIONE MANUALE DI FIX
    // ===============================================
    
    window.fixBadgesManually = function() {
        console.log('🔧 === FIX MANUALE BADGE SYSTEM ===');
        
        // 1. Assicura prerequisiti
        ensureSectionConfig();
        
        // 2. Verifica/inietta CSS
        checkBadgeCSS();
        
        // 3. Forza inizializzazione
        if (window.currentUser || window.firebaseAuth?.currentUser) {
            forceInitializeBadgeSystem(window.currentUser || window.firebaseAuth.currentUser);
        } else {
            console.error('❌ Nessun utente loggato!');
        }
        
        // 4. Test dopo 2 secondi
        setTimeout(() => {
            testBadgeVisibility();
        }, 2000);
    };
    
    // ===============================================
    // 9. INIZIALIZZAZIONE
    // ===============================================
    
    function init() {
        console.log('🚀 Inizializzazione Badge System Fix...');
        
        // Assicura prerequisiti base
        ensureSectionConfig();
        
        // Setup listener per auth state
        ensureUserLoggedInEvent();
        
        // Avvia monitoring
        setupContinuousMonitoring();
        
        // Se utente già loggato, inizializza subito
        setTimeout(() => {
            if (window.currentUser) {
                console.log('👤 Utente già presente, inizializzo badge...');
                forceInitializeBadgeSystem(window.currentUser);
            }
        }, 1000);
    }
    
    // Avvia quando DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ===============================================
    // 10. COMANDI CONSOLE UTILI
    // ===============================================
    
    console.log(`
🛠️ === COMANDI FIX BADGE DISPONIBILI ===
- fixBadgesManually() : Fix manuale completo
- runBadgeSystemDiagnostic() : Diagnostica completa
- showTestBadges() : Mostra badge di test
- debugBadgeIntegration() : Debug dettagliato
    `);
    
})();