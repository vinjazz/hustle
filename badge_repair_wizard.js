// ===============================================
// BADGE SYSTEM REPAIR WIZARD
// ===============================================

/**
 * Wizard completo per riparare e ottimizzare il Badge System
 * Analizza problemi specifici e applica soluzioni mirate
 */

(function() {
    'use strict';
    
    console.log('%c🧙‍♂️ Badge System Repair Wizard avviato', 'color: #9b59b6; font-weight: bold; font-size: 16px;');
    
    const RepairWizard = {
        issues: [],
        fixes: [],
        
        // ===============================================
        // DIAGNOSI AVANZATA
        // ===============================================
        
        runAdvancedDiagnostic() {
            console.log('\n🔍 === DIAGNOSI AVANZATA ===');
            this.issues = [];
            
            this.checkScriptLoading();
            this.checkPrerequisites();
            this.checkInitialization();
            this.checkUserState();
            this.checkDOMStructure();
            this.checkEventListeners();
            this.checkFunctionIntegrations();
            
            return this.generateReport();
        },
        
        checkScriptLoading() {
            console.log('\n📦 Controllo caricamento script...');
            
            const scripts = {
                'Badge System': {
                    check: () => !!window.badgeSystem,
                    severity: 'critical'
                },
                'Badge Integration': {
                    check: () => !!window.badgeIntegrationLoaded,
                    severity: 'high'
                },
                'Section Config': {
                    check: () => !!window.sectionConfig,
                    severity: 'critical'
                },
                'Quick Fixes': {
                    check: () => !!document._badgeQuickFixesLoaded,
                    severity: 'medium'
                }
            };
            
            Object.entries(scripts).forEach(([name, config]) => {
                const isLoaded = config.check();
                if (!isLoaded) {
                    this.issues.push({
                        type: 'script',
                        severity: config.severity,
                        name: name,
                        message: `Script ${name} non caricato`,
                        fix: `Verifica che ${name} sia incluso nell'HTML`
                    });
                }
                console.log(`${isLoaded ? '✅' : '❌'} ${name}: ${isLoaded ? 'Caricato' : 'MANCANTE'}`);
            });
        },
        
        checkPrerequisites() {
            console.log('\n📋 Controllo prerequisiti dettagliato...');
            
            const prerequisites = {
                'window.sectionConfig': {
                    check: () => !!window.sectionConfig && Object.keys(window.sectionConfig).length > 0,
                    fix: 'createSectionConfig'
                },
                'window.getCurrentUserClan': {
                    check: () => typeof window.getCurrentUserClan === 'function',
                    fix: 'createGetCurrentUserClan'
                },
                'window.updateNavItemBadgeClass': {
                    check: () => typeof window.updateNavItemBadgeClass === 'function',
                    fix: 'createUpdateNavItemBadgeClass'
                },
                'window.debouncedBadgeUpdate': {
                    check: () => typeof window.debouncedBadgeUpdate === 'function',
                    fix: 'createDebouncedBadgeUpdate'
                }
            };
            
            Object.entries(prerequisites).forEach(([name, config]) => {
                const exists = config.check();
                if (!exists) {
                    this.issues.push({
                        type: 'prerequisite',
                        severity: 'high',
                        name: name,
                        message: `Prerequisito ${name} mancante`,
                        fix: config.fix
                    });
                }
                console.log(`${exists ? '✅' : '❌'} ${name}: ${exists ? 'OK' : 'MANCANTE'}`);
            });
        },
        
        checkInitialization() {
            console.log('\n🚀 Controllo inizializzazione...');
            
            const initChecks = {
                'Badge System inizializzato': {
                    check: () => window.badgeSystem?.isInitialized,
                    fix: 'initializeBadgeSystem'
                },
                'Badge System esteso': {
                    check: () => window.badgeSystem?._extended,
                    fix: 'extendBadgeSystem'
                },
                'Event listeners attivi': {
                    check: () => document._badgeEventListenersActive,
                    fix: 'setupEventListeners'
                }
            };
            
            Object.entries(initChecks).forEach(([name, config]) => {
                const isOk = config.check();
                if (!isOk) {
                    this.issues.push({
                        type: 'initialization',
                        severity: 'medium',
                        name: name,
                        message: `${name} non completato`,
                        fix: config.fix
                    });
                }
                console.log(`${isOk ? '✅' : '❌'} ${name}: ${isOk ? 'OK' : 'DA FARE'}`);
            });
        },
        
        checkUserState() {
            console.log('\n👤 Controllo stato utente...');
            
            const hasUser = !!window.currentUser;
            const userClan = hasUser ? (window.getCurrentUserClan ? window.getCurrentUserClan() : 'Sconosciuto') : 'N/A';
            
            console.log(`${hasUser ? '✅' : '⚠️'} Utente corrente: ${hasUser ? window.currentUser.email : 'Non loggato'}`);
            console.log(`${userClan !== 'Sconosciuto' ? '✅' : '⚠️'} Clan utente: ${userClan}`);
            
            if (!hasUser) {
                this.issues.push({
                    type: 'user',
                    severity: 'low',
                    name: 'Utente non loggato',
                    message: 'Badge System funziona meglio con utente loggato',
                    fix: 'loginUser'
                });
            }
        },
        
        checkDOMStructure() {
            console.log('\n🎯 Controllo struttura DOM...');
            
            const domElements = {
                'Sidebar': '.sidebar',
                'Nav items': '.nav-item',
                'Navigation sections': '[data-section]'
            };
            
            Object.entries(domElements).forEach(([name, selector]) => {
                const elements = document.querySelectorAll(selector);
                const count = elements.length;
                const isOk = count > 0;
                
                if (!isOk) {
                    this.issues.push({
                        type: 'dom',
                        severity: 'high',
                        name: name,
                        message: `${name} non trovato (${selector})`,
                        fix: 'checkHTML'
                    });
                }
                
                console.log(`${isOk ? '✅' : '❌'} ${name}: ${count} elementi`);
            });
        },
        
        checkEventListeners() {
            console.log('\n👂 Controllo event listeners...');
            
            const events = ['userLoggedIn', 'userLoggedOut', 'sectionChanged'];
            
            events.forEach(eventType => {
                // Non possiamo verificare direttamente i listeners, ma possiamo verificare se sono stati configurati
                const hasListeners = document._badgeEventListenersActive || window.badgeIntegrationLoaded;
                console.log(`${hasListeners ? '✅' : '❌'} Event listener ${eventType}: ${hasListeners ? 'Configurato' : 'DA CONFIGURARE'}`);
            });
        },
        
        checkFunctionIntegrations() {
            console.log('\n🔗 Controllo integrazioni funzioni...');
            
            const integrations = {
                'sendMessage': window.sendMessage?._badgeIntegrated,
                'createThread': window.createThread?._badgeIntegrated,
                'addComment': window.addComment?._badgeIntegrated
            };
            
            Object.entries(integrations).forEach(([name, isIntegrated]) => {
                const functionExists = !!window[name];
                console.log(`${functionExists ? '✅' : '⚠️'} ${name}: ${functionExists ? (isIntegrated ? 'Integrata' : 'Esistente ma non integrata') : 'Non trovata'}`);
                
                if (functionExists && !isIntegrated) {
                    this.issues.push({
                        type: 'integration',
                        severity: 'medium',
                        name: name,
                        message: `Funzione ${name} non integrata con badge system`,
                        fix: `integrate${name.charAt(0).toUpperCase() + name.slice(1)}`
                    });
                }
            });
        },
        
        // ===============================================
        // GENERAZIONE REPORT
        // ===============================================
        
        generateReport() {
            const critical = this.issues.filter(i => i.severity === 'critical').length;
            const high = this.issues.filter(i => i.severity === 'high').length;
            const medium = this.issues.filter(i => i.severity === 'medium').length;
            const low = this.issues.filter(i => i.severity === 'low').length;
            
            console.log('\n📊 === REPORT DIAGNOSI ===');
            console.log(`🔴 Problemi critici: ${critical}`);
            console.log(`🟠 Problemi gravi: ${high}`);
            console.log(`🟡 Problemi medi: ${medium}`);
            console.log(`🟢 Problemi minori: ${low}`);
            
            const totalIssues = this.issues.length;
            let status;
            
            if (critical > 0) {
                status = 'NON_FUNZIONANTE';
                console.log('%c❌ Sistema Badge NON FUNZIONANTE', 'color: #e74c3c; font-weight: bold;');
            } else if (high > 0 || medium > 2) {
                status = 'PARZIALMENTE_FUNZIONANTE';
                console.log('%c⚠️ Sistema Badge PARZIALMENTE FUNZIONANTE', 'color: #f39c12; font-weight: bold;');
            } else {
                status = 'FUNZIONANTE';
                console.log('%c✅ Sistema Badge FUNZIONANTE', 'color: #27ae60; font-weight: bold;');
            }
            
            if (totalIssues > 0) {
                console.log('\n🔧 === PROBLEMI TROVATI ===');
                this.issues.forEach((issue, index) => {
                    const icon = issue.severity === 'critical' ? '🔴' : 
                               issue.severity === 'high' ? '🟠' : 
                               issue.severity === 'medium' ? '🟡' : '🟢';
                    console.log(`${icon} ${index + 1}. ${issue.message}`);
                });
            }
            
            return { status, issues: this.issues, totalIssues };
        },
        
        // ===============================================
        // RIPARAZIONI AUTOMATICHE
        // ===============================================
        
        async applyAllFixes() {
            console.log('\n🛠️ === APPLICAZIONE RIPARAZIONI ===');
            
            this.fixes = [];
            let fixedCount = 0;
            
            for (const issue of this.issues) {
                try {
                    console.log(`🔧 Riparando: ${issue.message}...`);
                    
                    const result = await this.applyFix(issue);
                    if (result) {
                        this.fixes.push({ issue: issue.name, status: 'success' });
                        fixedCount++;
                        console.log(`✅ ${issue.name} riparato`);
                    } else {
                        this.fixes.push({ issue: issue.name, status: 'failed' });
                        console.log(`❌ ${issue.name} non riparato`);
                    }
                    
                    // Piccola pausa tra le riparazioni
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`❌ Errore riparando ${issue.name}:`, error);
                    this.fixes.push({ issue: issue.name, status: 'error', error: error.message });
                }
            }
            
            console.log(`\n📊 Riparazioni completate: ${fixedCount}/${this.issues.length}`);
            
            // Re-test dopo le riparazioni
            setTimeout(() => {
                console.log('\n🔍 Re-test post-riparazione...');
                this.runAdvancedDiagnostic();
            }, 1000);
            
            return { fixedCount, totalIssues: this.issues.length };
        },
        
        async applyFix(issue) {
            switch (issue.fix) {
                case 'createSectionConfig':
                    return this.createSectionConfig();
                    
                case 'createGetCurrentUserClan':
                    return this.createGetCurrentUserClan();
                    
                case 'createUpdateNavItemBadgeClass':
                    return this.createUpdateNavItemBadgeClass();
                    
                case 'createDebouncedBadgeUpdate':
                    return this.createDebouncedBadgeUpdate();
                    
                case 'initializeBadgeSystem':
                    return this.initializeBadgeSystem();
                    
                case 'extendBadgeSystem':
                    return this.extendBadgeSystem();
                    
                case 'setupEventListeners':
                    return this.setupEventListeners();
                    
                case 'integrateSendMessage':
                    return this.integrateSendMessage();
                    
                case 'integrateCreateThread':
                    return this.integrateCreateThread();
                    
                case 'integrateAddComment':
                    return this.integrateAddComment();
                    
                default:
                    console.log(`⚠️ Fix non implementato: ${issue.fix}`);
                    return false;
            }
        },
        
        // ===============================================
        // IMPLEMENTAZIONI FIX SPECIFICI
        // ===============================================
        
        createSectionConfig() {
            if (window.sectionConfig) return true;
            
            window.sectionConfig = {
                'home': { title: '🏠 Dashboard', type: 'dashboard' },
                'eventi': { title: '📅 Eventi', type: 'forum' },
                'oggetti': { title: '⚔️ Oggetti', type: 'forum' },
                'novita': { title: '🆕 Novità', type: 'forum' },
                'salotto': { title: '🏰 Salotto', type: 'forum' },
                'chat-generale': { title: '💬 Chat Generale', type: 'chat' },
                'associa-clan': { title: '🏠 Associa Clan', type: 'forum' },
                'clan-chat': { title: '💬 Chat Clan', type: 'chat' },
                'clan-war': { title: '⚔️ Guerra Clan', type: 'forum' },
                'clan-premi': { title: '🏆 Premi Clan', type: 'forum' },
                'clan-consigli': { title: '💡 Consigli Clan', type: 'forum' },
                'clan-bacheca': { title: '🏰 Bacheca Clan', type: 'forum' }
            };
            
            return true;
        },
        
        createGetCurrentUserClan() {
            if (window.getCurrentUserClan) return true;
            
            window.getCurrentUserClan = function() {
                const clanElement = document.getElementById('currentClan');
                if (clanElement) {
                    return clanElement.textContent || 'Nessuno';
                }
                
                // Fallback: controlla currentUserData
                if (window.currentUserData && window.currentUserData.clan) {
                    return window.currentUserData.clan;
                }
                
                return 'Nessuno';
            };
            
            return true;
        },
        
        createUpdateNavItemBadgeClass() {
            if (window.updateNavItemBadgeClass) return true;
            
            window.updateNavItemBadgeClass = function(sectionKey, hasBadge) {
                const navItem = document.querySelector(`[data-section="${sectionKey}"]`);
                if (navItem) {
                    if (hasBadge) {
                        navItem.classList.add('has-badge');
                    } else {
                        navItem.classList.remove('has-badge');
                    }
                    return true;
                }
                return false;
            };
            
            return true;
        },
        
        createDebouncedBadgeUpdate() {
            if (window.debouncedBadgeUpdate) return true;
            
            let badgeUpdateTimeout;
            window.debouncedBadgeUpdate = function(sectionKey) {
                clearTimeout(badgeUpdateTimeout);
                badgeUpdateTimeout = setTimeout(() => {
                    if (window.badgeSystem && window.badgeSystem.isInitialized) {
                        window.badgeSystem.refreshSectionBadge(sectionKey);
                    }
                }, 1000);
            };
            
            return true;
        },
        
        initializeBadgeSystem() {
            if (!window.badgeSystem) return false;
            if (window.badgeSystem.isInitialized) return true;
            
            // Crea utente temporaneo se necessario
            let user = window.currentUser;
            if (!user) {
                user = {
                    uid: 'temp_user_repair',
                    email: 'temp@repair.local',
                    displayName: 'Utente Temporaneo'
                };
            }
            
            try {
                window.badgeSystem.initialize(user);
                return true;
            } catch (error) {
                console.error('Errore inizializzazione Badge System:', error);
                return false;
            }
        },
        
        extendBadgeSystem() {
            if (!window.badgeSystem) return false;
            if (window.badgeSystem._extended) return true;
            
            try {
                const originalAddBadge = window.badgeSystem.addBadge;
                const originalRemoveBadge = window.badgeSystem.removeBadge;
                
                window.badgeSystem.addBadge = function(sectionKey, count) {
                    originalAddBadge.call(this, sectionKey, count);
                    if (window.updateNavItemBadgeClass) {
                        window.updateNavItemBadgeClass(sectionKey, true);
                    }
                };
                
                window.badgeSystem.removeBadge = function(sectionKey) {
                    originalRemoveBadge.call(this, sectionKey);
                    if (window.updateNavItemBadgeClass) {
                        window.updateNavItemBadgeClass(sectionKey, false);
                    }
                };
                
                window.badgeSystem._extended = true;
                return true;
            } catch (error) {
                console.error('Errore estensione Badge System:', error);
                return false;
            }
        },
        
        setupEventListeners() {
            if (document._badgeEventListenersActive) return true;
            
            try {
                // Event listener per login utente
                document.addEventListener('userLoggedIn', (event) => {
                    if (window.badgeSystem && !window.badgeSystem.isInitialized) {
                        setTimeout(() => {
                            window.badgeSystem.initialize(event.detail.user);
                        }, 1000);
                    }
                });
                
                // Event listener per logout utente
                document.addEventListener('userLoggedOut', () => {
                    if (window.badgeSystem) {
                        window.badgeSystem.cleanup();
                    }
                });
                
                // Event listener per cambio sezione
                document.addEventListener('sectionChanged', (event) => {
                    if (window.badgeSystem && window.badgeSystem.isInitialized) {
                        window.badgeSystem.markSectionAsVisited(event.detail.sectionKey);
                    }
                });
                
                document._badgeEventListenersActive = true;
                return true;
            } catch (error) {
                console.error('Errore setup event listeners:', error);
                return false;
            }
        },
        
        integrateSendMessage() {
            if (!window.sendMessage || window.sendMessage._badgeIntegrated) return true;
            
            try {
                const original = window.sendMessage;
                window.sendMessage = function() {
                    const result = original.apply(this, arguments);
                    if (window.currentSection && window.debouncedBadgeUpdate) {
                        window.debouncedBadgeUpdate(window.currentSection);
                    }
                    return result;
                };
                window.sendMessage._badgeIntegrated = true;
                return true;
            } catch (error) {
                console.error('Errore integrazione sendMessage:', error);
                return false;
            }
        },
        
        integrateCreateThread() {
            if (!window.createThread || window.createThread._badgeIntegrated) return true;
            
            try {
                const original = window.createThread;
                window.createThread = function() {
                    const result = original.apply(this, arguments);
                    if (window.currentSection && window.debouncedBadgeUpdate) {
                        window.debouncedBadgeUpdate(window.currentSection);
                    }
                    return result;
                };
                window.createThread._badgeIntegrated = true;
                return true;
            } catch (error) {
                console.error('Errore integrazione createThread:', error);
                return false;
            }
        },
        
        integrateAddComment() {
            if (!window.addComment || window.addComment._badgeIntegrated) return true;
            
            try {
                const original = window.addComment;
                window.addComment = function() {
                    const result = original.apply(this, arguments);
                    if (window.currentThreadSection && window.debouncedBadgeUpdate) {
                        window.debouncedBadgeUpdate(window.currentThreadSection);
                    }
                    return result;
                };
                window.addComment._badgeIntegrated = true;
                return true;
            } catch (error) {
                console.error('Errore integrazione addComment:', error);
                return false;
            }
        }
    };
    
    // ===============================================
    // API GLOBALI
    // ===============================================
    
    window.BadgeRepairWizard = RepairWizard;
    
    window.repairBadgeSystem = function() {
        console.log('%c🧙‍♂️ Avvio Wizard di Riparazione Badge System', 'color: #9b59b6; font-weight: bold;');
        
        const diagnostic = RepairWizard.runAdvancedDiagnostic();
        
        if (diagnostic.totalIssues > 0) {
            console.log('\n🔧 Applicando riparazioni...');
            return RepairWizard.applyAllFixes();
        } else {
            console.log('\n✅ Nessuna riparazione necessaria!');
            return Promise.resolve({ fixedCount: 0, totalIssues: 0 });
        }
    };
    
    window.diagnoseBadgeSystem = function() {
        return RepairWizard.runAdvancedDiagnostic();
    };
    
    // ===============================================
    // AUTO-ESECUZIONE
    // ===============================================
    
    // Esegui diagnosi automatica in sviluppo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            console.log('🔍 Auto-diagnosi Badge System...');
            const result = RepairWizard.runAdvancedDiagnostic();
            
            if (result.totalIssues > 0) {
                console.log(`\n💡 Trovati ${result.totalIssues} problemi. Esegui repairBadgeSystem() per riparare automaticamente.`);
            }
        }, 2000);
    }
    
    console.log('🧙‍♂️ Badge Repair Wizard caricato');
    console.log('📋 Comandi disponibili:');
    console.log('  - repairBadgeSystem() - Diagnosi e riparazione automatica');
    console.log('  - diagnoseBadgeSystem() - Solo diagnosi dettagliata');
    
})();