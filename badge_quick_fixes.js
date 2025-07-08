// ===============================================
// BADGE SYSTEM QUICK FIXES
// ===============================================

/**
 * Soluzioni rapide per i problemi più comuni del Badge System
 * Aggiungi questo script come ultimo nella catena di caricamento
 */

(function() {
    'use strict';
    
    console.log('🛠️ Badge System Quick Fixes caricato');
    
    // ===============================================
    // 1. FIX PREREQUISITI MANCANTI
    // ===============================================
    
    function fixMissingPrerequisites() {
        // Crea sectionConfig di fallback se mancante
        if (!window.sectionConfig) {
            console.log('🔧 Creazione sectionConfig di fallback...');
            window.sectionConfig = {
                'home': { title: '🏠 Dashboard', type: 'dashboard' },
                'eventi': { title: '📅 Eventi', type: 'forum' },
                'oggetti': { title: '⚔️ Oggetti', type: 'forum' },
                'novita': { title: '🆕 Novità', type: 'forum' },
                'chat-generale': { title: '💬 Chat Generale', type: 'chat' },
                'associa-clan': { title: '🏠 Associa Clan', type: 'forum' },
                'clan-chat': { title: '💬 Chat Clan', type: 'chat' },
                'clan-war': { title: '⚔️ Guerra Clan', type: 'forum' },
                'clan-premi': { title: '🏆 Premi Clan', type: 'forum' },
                'clan-consigli': { title: '💡 Consigli Clan', type: 'forum' },
                'clan-bacheca': { title: '🏰 Bacheca Clan', type: 'forum' }
            };
        }
        
        // Crea getCurrentUserClan di fallback se mancante
        if (!window.getCurrentUserClan) {
            console.log('🔧 Creazione getCurrentUserClan di fallback...');
            window.getCurrentUserClan = function() {
                const clanElement = document.getElementById('currentClan');
                return clanElement ? clanElement.textContent : 'Nessuno';
            };
        }
        
        // Crea updateNavItemBadgeClass se mancante
        if (!window.updateNavItemBadgeClass) {
            console.log('🔧 Creazione updateNavItemBadgeClass di fallback...');
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
        
        // Crea debouncedBadgeUpdate se mancante
        if (!window.debouncedBadgeUpdate) {
            console.log('🔧 Creazione debouncedBadgeUpdate di fallback...');
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
    }
    
    // ===============================================
    // 2. FIX INIZIALIZZAZIONE BADGE SYSTEM
    // ===============================================
    
    function forceInitializeBadgeSystem() {
        if (!window.badgeSystem) {
            console.warn('❌ Badge System non disponibile per inizializzazione forzata');
            return false;
        }
        
        if (window.badgeSystem.isInitialized) {
            console.log('✅ Badge System già inizializzato');
            return true;
        }
        
        console.log('🔧 Inizializzazione forzata Badge System...');
        
        // Simula utente temporaneo se mancante
        let user = window.currentUser;
        if (!user) {
            user = {
                uid: 'temp_user_' + Date.now(),
                email: 'temp@example.com',
                displayName: 'Utente Temporaneo'
            };
            console.log('🤖 Usando utente temporaneo per inizializzazione');
        }
        
        try {
            window.badgeSystem.initialize(user);
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione forzata:', error);
            return false;
        }
    }
    
    // ===============================================
    // 3. FIX INTEGRAZIONE FUNZIONI
    // ===============================================
    
    function forceIntegrationFunctions() {
        console.log('🔧 Verifica e correzione integrazioni...');
        
        let fixed = 0;
        
        // Fix sendMessage
        if (window.sendMessage && !window.sendMessage._badgeIntegrated) {
            const original = window.sendMessage;
            window.sendMessage = function() {
                const result = original.apply(this, arguments);
                if (window.currentSection && window.debouncedBadgeUpdate) {
                    window.debouncedBadgeUpdate(window.currentSection);
                }
                return result;
            };
            window.sendMessage._badgeIntegrated = true;
            fixed++;
        }
        
        // Fix createThread
        if (window.createThread && !window.createThread._badgeIntegrated) {
            const original = window.createThread;
            window.createThread = function() {
                const result = original.apply(this, arguments);
                if (window.currentSection && window.debouncedBadgeUpdate) {
                    window.debouncedBadgeUpdate(window.currentSection);
                }
                return result;
            };
            window.createThread._badgeIntegrated = true;
            fixed++;
        }
        
        // Fix addComment
        if (window.addComment && !window.addComment._badgeIntegrated) {
            const original = window.addComment;
            window.addComment = function() {
                const result = original.apply(this, arguments);
                if (window.currentThreadSection && window.debouncedBadgeUpdate) {
                    window.debouncedBadgeUpdate(window.currentThreadSection);
                }
                return result;
            };
            window.addComment._badgeIntegrated = true;
            fixed++;
        }
        
        console.log(`✅ ${fixed} integrazioni corrette`);
        return fixed;
    }
    
    // ===============================================
    // 4. FIX CSS BADGE
    // ===============================================
    
    function ensureBadgeCSS() {
        // Controlla se i CSS badge esistono
        const existingStyle = document.getElementById('badge-quick-css');
        if (existingStyle) {
            return;
        }
        
        console.log('🎨 Aggiunta CSS badge di emergenza...');
        
        const style = document.createElement('style');
        style.id = 'badge-quick-css';
        style.textContent = `
            .section-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ff4757;
                color: white;
                border-radius: 50%;
                padding: 4px 6px;
                font-size: 11px;
                font-weight: bold;
                min-width: 18px;
                text-align: center;
                z-index: 10;
                line-height: 1;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .section-badge.badge-double-digit {
                border-radius: 10px;
                padding: 4px 8px;
            }
            
            .section-badge.badge-high-count {
                background: #ff3838;
                animation: badge-pulse 2s infinite;
            }
            
            @keyframes badge-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .nav-item {
                position: relative;
            }
            
            .nav-item.has-badge {
                /* Evidenzia nav item con badge */
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // ===============================================
    // 5. FUNZIONI DI RIPARAZIONE GLOBALI
    // ===============================================
    
    window.fixBadgeSystem = function() {
        console.log('🛠️ === RIPARAZIONE BADGE SYSTEM ===');
        
        const steps = [
            { name: 'Prerequisiti', fn: fixMissingPrerequisites },
            { name: 'CSS Badge', fn: ensureBadgeCSS },
            { name: 'Inizializzazione', fn: forceInitializeBadgeSystem },
            { name: 'Integrazioni', fn: forceIntegrationFunctions }
        ];
        
        let successCount = 0;
        
        steps.forEach(step => {
            try {
                console.log(`🔧 Riparazione ${step.name}...`);
                const result = step.fn();
                if (result !== false) {
                    console.log(`✅ ${step.name} riparato`);
                    successCount++;
                } else {
                    console.log(`⚠️ ${step.name} parzialmente riparato`);
                }
            } catch (error) {
                console.error(`❌ Errore riparazione ${step.name}:`, error);
            }
        });
        
        console.log(`\n📊 Riparazione completata: ${successCount}/${steps.length} step riusciti`);
        
        // Test finale
        setTimeout(() => {
            if (window.runBadgeSystemDiagnostic) {
                console.log('\n🔍 Test post-riparazione...');
                window.runBadgeSystemDiagnostic();
            }
        }, 1000);
        
        return successCount;
    };
    
    // ===============================================
    // 6. RIPARAZIONE AUTOMATICA
    // ===============================================
    
    function autoFixIfNeeded() {
        // Aspetta un po' per permettere il caricamento completo
        setTimeout(() => {
            const needsFix = (
                !window.sectionConfig ||
                !window.badgeSystem?.isInitialized ||
                !window.updateNavItemBadgeClass
            );
            
            if (needsFix) {
                console.log('🚨 Problemi rilevati, avvio riparazione automatica...');
                window.fixBadgeSystem();
            } else {
                console.log('✅ Badge System sembra funzionare correttamente');
            }
        }, 2000);
    }
    
    // ===============================================
    // 7. INIZIALIZZAZIONE
    // ===============================================
    
    // Funzioni immediate
    fixMissingPrerequisites();
    ensureBadgeCSS();
    
    // Riparazione automatica ritardata
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoFixIfNeeded);
    } else {
        autoFixIfNeeded();
    }
    
    // Aggiungi marker per il diagnostic
    document._badgeQuickFixesLoaded = true;
    
    console.log('✅ Badge System Quick Fixes inizializzato');
    
})();