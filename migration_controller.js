// ===============================================
// MIGRATION CONTROLLER - Gestione migrazione a Supabase
// ===============================================

class MigrationController {
    constructor() {
        this.features = {
            supabaseNotifications: true,     // Notifiche su Supabase
            realtimeBadges: true,           // Badge real-time
            activityTracker: true,          // Activity tracker nuovo
            statusIndicator: true,          // Indicatore stato
            fallbackLocalStorage: true     // Fallback localStorage
        };
        
        this.migrationStatus = {
            notifications: 'pending',      // pending, success, error, fallback
            activityTracker: 'pending',
            realtime: 'pending'
        };
        
        this.errors = [];
        this.metrics = {
            startTime: Date.now(),
            notificationsLoaded: 0,
            badgesUpdated: 0,
            realtimeEvents: 0,
            errors: 0
        };
    }

    // Inizializza la migrazione
    async init() {
        console.log('🚀 Avvio migrazione a Supabase Real-time...');
        
        try {
            // 1. Verifica prerequisiti
            await this.checkPrerequisites();
            
            // 2. Migra notifiche
            if (this.features.supabaseNotifications) {
                await this.migrateNotifications();
            }
            
            // 3. Avvia Activity Tracker
            if (this.features.activityTracker) {
                await this.initializeActivityTracker();
            }
            
            // 4. Setup indicatori stato
            if (this.features.statusIndicator) {
                await this.setupStatusIndicator();
            }
            
            // 5. Verifica funzionamento
            await this.verifyMigration();
            
            console.log('✅ Migrazione completata con successo!');
            this.logMigrationResults();
            
        } catch (error) {
            console.error('❌ Errore durante la migrazione:', error);
            this.handleMigrationError(error);
        }
    }

    // Verifica prerequisiti
    async checkPrerequisites() {
        const checks = {
            supabase: !!window.supabase,
            supabaseUrl: !!window.supabaseUrl,
            supabaseKey: !!window.supabaseKey,
            currentUser: !!currentUser
        };
        
        console.log('🔍 Verifica prerequisiti:', checks);
        
        if (!checks.supabase) {
            throw new Error('Supabase client non disponibile');
        }
        
        if (!checks.currentUser) {
            console.warn('⚠️ Nessun utente loggato, migrazione parziale');
        }
        
        return checks;
    }

    // Migra sistema notifiche
    async migrateNotifications() {
        try {
            console.log('📧 Migrazione notifiche...');
            this.migrationStatus.notifications = 'pending';
            
            if (currentUser && typeof loadNotifications === 'function') {
                loadNotifications();
                this.migrationStatus.notifications = 'success';
                this.metrics.notificationsLoaded++;
                console.log('✅ Notifiche migrate su Supabase');
            } else {
                this.migrationStatus.notifications = 'fallback';
                console.log('⚠️ Notifiche in modalità fallback');
            }
            
        } catch (error) {
            this.migrationStatus.notifications = 'error';
            this.errors.push({ component: 'notifications', error: error.message });
            console.error('❌ Errore migrazione notifiche:', error);
            
            // Fallback a localStorage
            if (this.features.fallbackLocalStorage) {
                console.log('🔄 Fallback notifiche localStorage...');
                this.migrationStatus.notifications = 'fallback';
            }
        }
    }

    // Inizializza Activity Tracker
    async initializeActivityTracker() {
        try {
            console.log('🔔 Inizializzazione Activity Tracker...');
            this.migrationStatus.activityTracker = 'pending';
            
            if (window.activityTracker && typeof window.activityTracker.init === 'function') {
                await window.activityTracker.init();
                this.migrationStatus.activityTracker = 'success';
                console.log('✅ Activity Tracker inizializzato');
            } else {
                throw new Error('Activity Tracker non disponibile');
            }
            
        } catch (error) {
            this.migrationStatus.activityTracker = 'error';
            this.errors.push({ component: 'activityTracker', error: error.message });
            console.error('❌ Errore Activity Tracker:', error);
            
            // Fallback a sistema badge semplice
            this.setupFallbackBadges();
        }
    }

    // Setup indicatori stato
    async setupStatusIndicator() {
        try {
            console.log('📊 Setup indicatori stato...');
            
            if (window.realtimeStatusIndicator && typeof window.realtimeStatusIndicator.init === 'function') {
                window.realtimeStatusIndicator.init();
                console.log('✅ Indicatori stato configurati');
            } else {
                console.warn('⚠️ Indicatori stato non disponibili');
            }
            
        } catch (error) {
            console.error('❌ Errore indicatori stato:', error);
            this.errors.push({ component: 'statusIndicator', error: error.message });
        }
    }

    // Verifica funzionamento migrazione
    async verifyMigration() {
        console.log('🔍 Verifica migrazione...');
        
        const tests = {
            supabaseConnection: await this.testSupabaseConnection(),
            notificationsWorking: await this.testNotifications(),
            badgesWorking: await this.testBadges(),
            realtimeWorking: await this.testRealtime()
        };
        
        console.log('📋 Risultati test:', tests);
        
        // Se troppi errori, considera rollback
        const failedTests = Object.values(tests).filter(result => !result).length;
        
        if (failedTests > 2) {
            console.warn('⚠️ Troppi test falliti, considerare rollback');
            this.suggestRollback();
        } else if (failedTests > 0) {
            console.log('⚠️ Alcuni test falliti, modalità ibrida');
        } else {
            console.log('✅ Tutti i test superati!');
        }
        
        return tests;
    }

    // Test connessione Supabase
    async testSupabaseConnection() {
        try {
            if (!window.supabase) return false;
            
            const { data, error } = await window.supabase
                .from('users')
                .select('uid')
                .limit(1);
                
            return !error;
        } catch (error) {
            console.error('Test Supabase fallito:', error);
            return false;
        }
    }

    // Test notifiche
    async testNotifications() {
        try {
            return Array.isArray(notificationsData) && 
                   typeof loadNotifications === 'function';
        } catch (error) {
            return false;
        }
    }

    // Test badge
    async testBadges() {
        try {
            return window.activityTracker && 
                   window.activityTracker.isTracking &&
                   window.activityTracker.subscriptions &&
                   window.activityTracker.subscriptions.size > 0;
        } catch (error) {
            return false;
        }
    }

    // Test real-time
    async testRealtime() {
        try {
            if (!window.activityTracker || !window.activityTracker.subscriptions) {
                return false;
            }
            
            const connectedChannels = Array.from(window.activityTracker.subscriptions.values())
                .filter(channel => channel.state === 'joined').length;
                
            return connectedChannels > 0;
        } catch (error) {
            return false;
        }
    }

    // Setup badge fallback
    setupFallbackBadges() {
        console.log('🔄 Setup badge fallback...');
        
        // Badge semplici senza real-time
        if (typeof window.markSectionAsVisited === 'function') {
            const originalSwitchSection = window.switchSection;
            window.switchSection = function(sectionKey) {
                if (currentSection && currentSection !== sectionKey) {
                    window.markSectionAsVisited(currentSection);
                }
                return originalSwitchSection.call(this, sectionKey);
            };
        }
    }

    // Gestione errori migrazione
    handleMigrationError(error) {
        this.metrics.errors++;
        this.errors.push({ component: 'general', error: error.message, timestamp: Date.now() });
        
        // Fallback completo a sistema precedente
        console.log('🔄 Attivazione fallback completo...');
        
        // Disabilita tutte le feature Supabase
        this.features.supabaseNotifications = false;
        this.features.realtimeBadges = false;
        this.features.activityTracker = false;
        
        // Usa localStorage per tutto
        this.setupLocalStorageFallback();
    }

    // Setup fallback localStorage
    setupLocalStorageFallback() {
        console.log('💾 Setup fallback localStorage...');
        
        // Override funzioni per usare localStorage
        if (typeof loadNotifications === 'function') {
            const storageKey = `hc_notifications_${currentUser?.uid}`;
            const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
            notificationsData = notifications.slice(0, 20);
            updateNotificationsUI();
        }
        
        // Disabilita indicatori real-time
        if (window.realtimeStatusIndicator) {
            window.realtimeStatusIndicator.updateStatus('disconnected', 'Modalità offline');
        }
    }

    // Suggerisce rollback
    suggestRollback() {
        console.warn('🚨 Suggerito rollback a sistema precedente');
        
        if (window.createToast && window.showToast) {
            const toast = window.createToast({
                type: 'warning',
                title: '⚠️ Problemi Real-time',
                message: 'Alcuni problemi rilevati. Sistema in modalità fallback.',
                duration: 8000,
                actions: [{
                    text: 'Debug Info',
                    action: () => this.showDebugInfo()
                }]
            });
            window.showToast(toast);
        }
    }

    // Mostra info debug
    showDebugInfo() {
        console.group('🔍 Migration Debug Info');
        console.log('Features:', this.features);
        console.log('Status:', this.migrationStatus);
        console.log('Metrics:', this.metrics);
        console.log('Errors:', this.errors);
        console.groupEnd();
        
        // Copia negli appunti per supporto
        const debugData = {
            features: this.features,
            status: this.migrationStatus,
            metrics: this.metrics,
            errors: this.errors,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
                .then(() => console.log('✅ Debug info copiato negli appunti'))
                .catch(err => console.warn('⚠️ Impossibile copiare debug info:', err));
        }
    }

    // Log risultati migrazione
    logMigrationResults() {
        const duration = Date.now() - this.metrics.startTime;
        
        console.group('📊 Risultati Migrazione Supabase');
        console.log(`⏱️ Durata: ${duration}ms`);
        console.log(`📧 Notifiche: ${this.migrationStatus.notifications}`);
        console.log(`🔔 Activity Tracker: ${this.migrationStatus.activityTracker}`);
        console.log(`📡 Real-time: ${this.migrationStatus.realtime}`);
        console.log(`❌ Errori: ${this.errors.length}`);
        console.log(`📊 Metriche:`, this.metrics);
        console.groupEnd();
        
        // Salva metriche per analytics
        this.saveMetrics();
    }

    // Salva metriche
    saveMetrics() {
        const metricsData = {
            ...this.metrics,
            migrationStatus: this.migrationStatus,
            duration: Date.now() - this.metrics.startTime,
            errorsCount: this.errors.length,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('hc_migration_metrics', JSON.stringify(metricsData));
    }

    // Pulisci migrazione
    cleanup() {
        this.errors = [];
        this.migrationStatus = {
            notifications: 'pending',
            activityTracker: 'pending', 
            realtime: 'pending'
        };
    }
}

// Istanza globale
window.migrationController = new MigrationController();

// Auto-inizializzazione quando l'utente fa login
const originalHandleUserLogin = window.handleUserLogin;
if (originalHandleUserLogin) {
    window.handleUserLogin = async function(user) {
        await originalHandleUserLogin.call(this, user);
        
        // Avvia migrazione dopo login
        setTimeout(async () => {
            try {
                await window.migrationController.init();
            } catch (error) {
                console.error('Errore migrazione post-login:', error);
            }
        }, 1000);
    };
}

// Debug commands globali
window.checkMigrationStatus = function() {
    window.migrationController.showDebugInfo();
};

window.retryMigration = async function() {
    console.log('🔄 Retry migrazione...');
    window.migrationController.cleanup();
    await window.migrationController.init();
};

console.log('✅ Migration Controller caricato!');