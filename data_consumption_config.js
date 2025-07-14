// ===============================================
// DATA CONSUMPTION CONFIG & MONITORING
// Sistema per configurare e monitorare il consumo dati
// ===============================================

class DataConsumptionManager {
    constructor() {
        this.config = {
            // Modalità consumo dati
            mode: 'ultra_low', // ultra_low, low, normal, unlimited
            
            // Impostazioni auto-refresh
            autoRefreshEnabled: false,
            autoRefreshInterval: 300000, // 5 minuti (invece di 30 secondi)
            
            // Impostazioni real-time listeners
            realTimeEnabled: false,
            maxConcurrentListeners: 3,
            
            // Impostazioni cache
            cacheEnabled: true,
            cacheMaxAge: 600000, // 10 minuti
            maxCacheSize: 1000, // Max elementi in cache
            
            // Impostazioni batch loading
            batchEnabled: true,
            batchSize: 20,
            maxItemsPerLoad: 50,
            
            // Soglie di consumo
            dailyLimitMB: 50,
            warningThresholdMB: 35,
            
            // Debug e monitoring
            debugMode: false,
            trackConsumption: true,
            logLevel: 'warn' // none, error, warn, info, debug
        };
        
        this.consumption = {
            daily: {
                reads: 0,
                writes: 0,
                estimatedMB: 0,
                lastReset: new Date().toDateString()
            },
            session: {
                reads: 0,
                writes: 0,
                estimatedMB: 0,
                startTime: Date.now()
            },
            history: []
        };
        
        this.listeners = new Map();
        this.cacheSize = 0;
        this.warningShown = false;
    }

    // Inizializza il sistema di gestione consumo
    init() {
        console.log('📊 Inizializzazione Data Consumption Manager...');
        
        // Carica configurazione salvata
        this.loadConfig();
        
        // Carica dati consumo
        this.loadConsumptionData();
        
        // Configura il sistema in base alla modalità
        this.applyConfig();
        
        // Avvia monitoraggio
        this.startMonitoring();
        
        // Setup UI per configurazione
        this.setupConfigUI();
        
        console.log(`✅ Data Consumption Manager inizializzato in modalità: ${this.config.mode}`);
        this.logCurrentStatus();
    }

    // Carica configurazione da localStorage
    loadConfig() {
        try {
            const savedConfig = localStorage.getItem('hc_data_config');
            if (savedConfig) {
                const parsed = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsed };
                console.log('📂 Configurazione caricata da localStorage');
            }
        } catch (error) {
            console.warn('⚠️ Errore caricamento configurazione:', error);
        }
    }

    // Salva configurazione in localStorage
    saveConfig() {
        try {
            localStorage.setItem('hc_data_config', JSON.stringify(this.config));
            console.log('💾 Configurazione salvata');
        } catch (error) {
            console.error('❌ Errore salvataggio configurazione:', error);
        }
    }

    // Carica dati consumo precedenti
    loadConsumptionData() {
        try {
            const savedConsumption = localStorage.getItem('hc_data_consumption');
            if (savedConsumption) {
                const parsed = JSON.parse(savedConsumption);
                
                // Controlla se è un nuovo giorno
                const today = new Date().toDateString();
                if (parsed.daily && parsed.daily.lastReset === today) {
                    this.consumption.daily = parsed.daily;
                } else {
                    // Salva il giorno precedente nella cronologia
                    if (parsed.daily && parsed.daily.estimatedMB > 0) {
                        this.consumption.history.unshift({
                            date: parsed.daily.lastReset,
                            ...parsed.daily
                        });
                    }
                    // Reset giornaliero
                    this.consumption.daily = {
                        reads: 0,
                        writes: 0,
                        estimatedMB: 0,
                        lastReset: today
                    };
                }
                
                // Mantieni solo ultimi 30 giorni di cronologia
                this.consumption.history = this.consumption.history.slice(0, 30);
                
                console.log('📈 Dati consumo caricati');
            }
        } catch (error) {
            console.warn('⚠️ Errore caricamento dati consumo:', error);
        }
    }

    // Salva dati consumo
    saveConsumptionData() {
        try {
            localStorage.setItem('hc_data_consumption', JSON.stringify({
                daily: this.consumption.daily,
                history: this.consumption.history
            }));
        } catch (error) {
            console.error('❌ Errore salvataggio dati consumo:', error);
        }
    }

    // Applica configurazione al sistema
    applyConfig() {
        console.log(`🔧 Applicando configurazione modalità: ${this.config.mode}`);
        
        // Configura Activity Tracker
        if (window.activityTracker) {
            if (this.config.autoRefreshEnabled) {
                // Riattiva con intervallo configurato
                window.activityTracker.autoRefreshDisabled = false;
                if (window.activityTracker.startAutoRefresh) {
                    window.activityTracker.updateInterval = this.config.autoRefreshInterval;
                }
            } else {
                // Disattiva completamente
                window.activityTracker.autoRefreshDisabled = true;
                if (window.activityTracker.updateInterval) {
                    clearInterval(window.activityTracker.updateInterval);
                    window.activityTracker.updateInterval = null;
                }
            }
        }
        
        // Configura Manual Refresh System
        if (window.manualRefresh) {
            window.manualRefresh.autoRefreshDisabled = !this.config.autoRefreshEnabled;
        }
        
        // Configura global flag
        window.AUTO_LOADING_DISABLED = !this.config.autoRefreshEnabled;
        
        // Applica modalità specifica
        this.applyModeConfig();
    }

    // Applica configurazione per modalità specifica
    applyModeConfig() {
        switch (this.config.mode) {
            case 'ultra_low':
                this.config.autoRefreshEnabled = false;
                this.config.realTimeEnabled = false;
                this.config.batchSize = 10;
                this.config.maxItemsPerLoad = 20;
                this.config.dailyLimitMB = 25;
                console.log('🔥 Modalità ULTRA LOW: Consumo dati minimizzato');
                break;
                
            case 'low':
                this.config.autoRefreshEnabled = false;
                this.config.realTimeEnabled = false;
                this.config.batchSize = 20;
                this.config.maxItemsPerLoad = 50;
                this.config.dailyLimitMB = 100;
                console.log('📱 Modalità LOW: Consumo dati ridotto');
                break;
                
            case 'normal':
                this.config.autoRefreshEnabled = true;
                this.config.autoRefreshInterval = 300000; // 5 minuti
                this.config.realTimeEnabled = false;
                this.config.batchSize = 50;
                this.config.maxItemsPerLoad = 100;
                this.config.dailyLimitMB = 500;
                console.log('⚖️ Modalità NORMAL: Bilanciamento funzionalità/consumo');
                break;
                
            case 'unlimited':
                this.config.autoRefreshEnabled = true;
                this.config.autoRefreshInterval = 30000; // 30 secondi
                this.config.realTimeEnabled = true;
                this.config.batchSize = 100;
                this.config.maxItemsPerLoad = 500;
                this.config.dailyLimitMB = 2000;
                console.log('🚀 Modalità UNLIMITED: Tutte le funzionalità attive');
                break;
        }
        
        this.saveConfig();
    }

    // Traccia operazione Firebase
    trackFirebaseOperation(type, path, estimatedBytes = 1024) {
        if (!this.config.trackConsumption) return;
        
        // Incrementa contatori
        this.consumption.session[type]++;
        this.consumption.daily[type]++;
        
        // Stima consumo in MB (approssimativo)
        const estimatedMB = estimatedBytes / (1024 * 1024);
        this.consumption.session.estimatedMB += estimatedMB;
        this.consumption.daily.estimatedMB += estimatedMB;
        
        // Log se debug attivo
        if (this.config.debugMode && this.config.logLevel === 'debug') {
            console.log(`📊 Firebase ${type}: ${path} (~${estimatedBytes} bytes)`);
        }
        
        // Controlla soglie
        this.checkConsumptionLimits();
        
        // Salva periodicamente
        if ((this.consumption.session.reads + this.consumption.session.writes) % 10 === 0) {
            this.saveConsumptionData();
        }
    }

    // Controlla limiti di consumo
    checkConsumptionLimits() {
        const dailyMB = this.consumption.daily.estimatedMB;
        
        // Warning threshold
        if (dailyMB > this.config.warningThresholdMB && !this.warningShown) {
            this.warningShown = true;
            this.showConsumptionWarning();
        }
        
        // Daily limit
        if (dailyMB > this.config.dailyLimitMB) {
            this.handleDailyLimitExceeded();
        }
    }

    // Mostra warning consumo
    showConsumptionWarning() {
        const dailyMB = Math.round(this.consumption.daily.estimatedMB * 100) / 100;
        const warning = `
            ⚠️ ATTENZIONE CONSUMO DATI
            
            Hai consumato ${dailyMB}MB oggi (soglia: ${this.config.warningThresholdMB}MB)
            
            Vuoi passare a modalità Ultra Low per ridurre i consumi?
        `;
        
        if (confirm(warning)) {
            this.setMode('ultra_low');
        }
        
        // Mostra anche toast
        if (window.manualRefresh) {
            window.manualRefresh.showRefreshNotification(
                `⚠️ Consumo dati: ${dailyMB}MB/${this.config.dailyLimitMB}MB`,
                'warning'
            );
        }
    }

    // Gestisce superamento limite giornaliero
    handleDailyLimitExceeded() {
        const dailyMB = Math.round(this.consumption.daily.estimatedMB * 100) / 100;
        
        console.error(`🚨 LIMITE GIORNALIERO SUPERATO: ${dailyMB}MB/${this.config.dailyLimitMB}MB`);
        
        // Forza modalità ultra low
        this.setMode('ultra_low', true);
        
        // Disattiva tutti gli auto-refresh
        this.emergencyDataSaving();
        
        alert(`🚨 LIMITE DATI SUPERATO!
        
Consumo giornaliero: ${dailyMB}MB
Limite impostato: ${this.config.dailyLimitMB}MB

Il sistema è stato automaticamente impostato in modalità Ultra Low per proteggere il tuo piano dati.`);
    }

    // Risparmio dati di emergenza
    emergencyDataSaving() {
        console.log('🚨 Attivazione risparmio dati di emergenza...');
        
        // Disattiva tutto
        this.config.autoRefreshEnabled = false;
        this.config.realTimeEnabled = false;
        window.AUTO_LOADING_DISABLED = true;
        
        // Pulisci tutti i listeners
        if (window.emergencyCleanup) {
            window.emergencyCleanup();
        }
        
        // Salva configurazione di emergenza
        this.saveConfig();
        
        console.log('✅ Risparmio dati di emergenza attivato');
    }

    // Cambia modalità
    setMode(mode, force = false) {
        const oldMode = this.config.mode;
        this.config.mode = mode;
        
        console.log(`🔄 Cambio modalità: ${oldMode} → ${mode}${force ? ' (forzato)' : ''}`);
        
        this.applyConfig();
        this.updateConfigUI();
        
        // Mostra conferma
        if (!force && window.manualRefresh) {
            window.manualRefresh.showRefreshNotification(
                `Modalità cambiata: ${mode.toUpperCase()}`,
                'success'
            );
        }
    }

    // Avvia monitoraggio
    startMonitoring() {
        // Override funzioni Firebase per tracking
        this.overrideFirebaseFunctions();
        
        // Monitora cache size
        setInterval(() => {
            this.updateCacheMetrics();
        }, 60000); // Ogni minuto
        
        // Reset warning giornaliero
        setInterval(() => {
            const today = new Date().toDateString();
            if (this.consumption.daily.lastReset !== today) {
                this.warningShown = false;
            }
        }, 3600000); // Ogni ora
        
        console.log('📊 Monitoraggio consumo dati avviato');
    }

    // Override funzioni Firebase per tracking
    overrideFirebaseFunctions() {
        if (!window.firebaseImports) return;
        
        const originalGet = window.firebaseImports.get;
        const originalSet = window.firebaseImports.set;
        const originalPush = window.firebaseImports.push;
        const originalUpdate = window.firebaseImports.update;
        
        // Override get (reads)
        if (originalGet) {
            window.firebaseImports.get = async (...args) => {
                const result = await originalGet(...args);
                const path = args[0]?.toString() || 'unknown';
                this.trackFirebaseOperation('reads', path, 2048); // Stima 2KB per read
                return result;
            };
        }
        
        // Override set (writes)
        if (originalSet) {
            window.firebaseImports.set = async (...args) => {
                const result = await originalSet(...args);
                const path = args[0]?.toString() || 'unknown';
                const dataSize = JSON.stringify(args[1] || {}).length;
                this.trackFirebaseOperation('writes', path, dataSize);
                return result;
            };
        }
        
        // Override push (writes)
        if (originalPush) {
            window.firebaseImports.push = async (...args) => {
                const result = await originalPush(...args);
                const path = args[0]?.toString() || 'unknown';
                const dataSize = JSON.stringify(args[1] || {}).length;
                this.trackFirebaseOperation('writes', path, dataSize);
                return result;
            };
        }
        
        // Override update (writes)
        if (originalUpdate) {
            window.firebaseImports.update = async (...args) => {
                const result = await originalUpdate(...args);
                const path = args[0]?.toString() || 'unknown';
                const dataSize = JSON.stringify(args[1] || {}).length;
                this.trackFirebaseOperation('writes', path, dataSize);
                return result;
            };
        }
        
        console.log('🔧 Firebase functions hooked per tracking consumo');
    }

    // Aggiorna metriche cache
    updateCacheMetrics() {
        let totalCacheSize = 0;
        
        // Conta elementi in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('hc_')) {
                const value = localStorage.getItem(key);
                totalCacheSize += value ? value.length : 0;
            }
        }
        
        this.cacheSize = Math.round(totalCacheSize / 1024); // KB
        
        // Pulisci cache se troppo grande
        if (this.cacheSize > this.config.maxCacheSize) {
            this.cleanupCache();
        }
    }

    // Pulizia cache
    cleanupCache() {
        console.log(`🧹 Pulizia cache: ${this.cacheSize}KB > ${this.config.maxCacheSize}KB`);
        
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('hc_') && !key.includes('_config') && !key.includes('_consumption')) {
                keys.push(key);
            }
        }
        
        // Rimuovi i più vecchi
        const toRemove = Math.ceil(keys.length * 0.3); // Rimuovi 30%
        keys.slice(0, toRemove).forEach(key => {
            localStorage.removeItem(key);
        });
        
        this.updateCacheMetrics();
        console.log(`✅ Cache pulita: ${toRemove} elementi rimossi`);
    }

    // Setup UI per configurazione
    setupConfigUI() {
        // Aggiungi pannello configurazione al menu admin
        this.addConfigPanel();
        
        // Aggiungi indicatori consumo al header
        this.addConsumptionIndicators();
    }

    // Aggiungi pannello configurazione
    addConfigPanel() {
        // Questo sarà visibile solo ai superuser
        if (window.getCurrentUserRole && window.getCurrentUserRole() !== 'superuser') {
            return;
        }
        
        // Aggiungi al menu admin se presente
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            const configItem = document.createElement('div');
            configItem.className = 'nav-item';
            configItem.setAttribute('data-section', 'admin-data-config');
            configItem.innerHTML = '<span>📊 Consumo Dati</span>';
            configItem.onclick = () => this.showConfigModal();
            
            adminSection.appendChild(configItem);
        }
    }

    // Aggiungi indicatori consumo
    addConsumptionIndicators() {
        const header = document.querySelector('.header');
        if (!header) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'consumptionIndicator';
        indicator.className = 'consumption-indicator';
        indicator.onclick = () => this.showStatsModal();
        
        this.updateConsumptionIndicator(indicator);
        
        header.appendChild(indicator);
        
        // Aggiorna ogni 30 secondi
        setInterval(() => {
            this.updateConsumptionIndicator(indicator);
        }, 30000);
    }

    // Aggiorna indicatore consumo
    updateConsumptionIndicator(indicator) {
        const dailyMB = Math.round(this.consumption.daily.estimatedMB * 100) / 100;
        const sessionMB = Math.round(this.consumption.session.estimatedMB * 100) / 100;
        const percentage = Math.round((dailyMB / this.config.dailyLimitMB) * 100);
        
        let status = 'low';
        if (percentage > 70) status = 'high';
        else if (percentage > 40) status = 'medium';
        
        indicator.className = `consumption-indicator ${status}`;
        indicator.innerHTML = `
            <div class="consumption-icon">📊</div>
            <div class="consumption-text">
                <div class="consumption-daily">${dailyMB}MB</div>
                <div class="consumption-mode">${this.config.mode}</div>
            </div>
        `;
        indicator.title = `Consumo giornaliero: ${dailyMB}MB/${this.config.dailyLimitMB}MB (${percentage}%)\nSessione: ${sessionMB}MB\nModalità: ${this.config.mode}`;
    }

    // Mostra modal statistiche
    showStatsModal() {
        const modal = this.createStatsModal();
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    // Crea modal statistiche
    createStatsModal() {
        const modal = document.createElement('div');
        modal.className = 'data-stats-modal';
        modal.innerHTML = `
            <div class="data-stats-content">
                <div class="stats-header">
                    <h3>📊 Statistiche Consumo Dati</h3>
                    <button class="stats-close" onclick="this.closest('.data-stats-modal').remove()">×</button>
                </div>
                <div class="stats-body">
                    ${this.generateStatsHTML()}
                </div>
                <div class="stats-actions">
                    <button onclick="dataConsumption.showConfigModal()" class="stats-config-btn">⚙️ Configurazione</button>
                    <button onclick="dataConsumption.exportStats()" class="stats-export-btn">📊 Esporta</button>
                </div>
            </div>
        `;
        
        // Chiudi cliccando fuori
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        return modal;
    }

    // Genera HTML statistiche
    generateStatsHTML() {
        const dailyMB = Math.round(this.consumption.daily.estimatedMB * 100) / 100;
        const sessionMB = Math.round(this.consumption.session.estimatedMB * 100) / 100;
        const sessionHours = Math.round((Date.now() - this.consumption.session.startTime) / 3600000 * 10) / 10;
        
        return `
            <div class="stats-grid">
                <div class="stat-card current">
                    <div class="stat-icon">📅</div>
                    <div class="stat-info">
                        <div class="stat-value">${dailyMB} MB</div>
                        <div class="stat-label">Oggi</div>
                        <div class="stat-detail">${this.consumption.daily.reads} reads, ${this.consumption.daily.writes} writes</div>
                    </div>
                </div>
                
                <div class="stat-card session">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-info">
                        <div class="stat-value">${sessionMB} MB</div>
                        <div class="stat-label">Sessione (${sessionHours}h)</div>
                        <div class="stat-detail">${this.consumption.session.reads} reads, ${this.consumption.session.writes} writes</div>
                    </div>
                </div>
                
                <div class="stat-card cache">
                    <div class="stat-icon">💾</div>
                    <div class="stat-info">
                        <div class="stat-value">${this.cacheSize} KB</div>
                        <div class="stat-label">Cache Locale</div>
                        <div class="stat-detail">Max: ${this.config.maxCacheSize} KB</div>
                    </div>
                </div>
                
                <div class="stat-card mode">
                    <div class="stat-icon">⚙️</div>
                    <div class="stat-info">
                        <div class="stat-value">${this.config.mode.toUpperCase()}</div>
                        <div class="stat-label">Modalità</div>
                        <div class="stat-detail">Limite: ${this.config.dailyLimitMB} MB/giorno</div>
                    </div>
                </div>
            </div>
            
            <div class="stats-chart">
                <h4>📈 Cronologia Ultimi 7 Giorni</h4>
                <div class="chart-container">
                    ${this.generateChartHTML()}
                </div>
            </div>
        `;
    }

    // Genera chart HTML semplice
    generateChartHTML() {
        const last7Days = this.consumption.history.slice(0, 7).reverse();
        const maxMB = Math.max(...last7Days.map(d => d.estimatedMB), this.consumption.daily.estimatedMB);
        
        return last7Days.map(day => {
            const height = maxMB > 0 ? (day.estimatedMB / maxMB) * 100 : 0;
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
            
            return `
                <div class="chart-bar">
                    <div class="bar" style="height: ${height}%" title="${day.estimatedMB.toFixed(2)} MB"></div>
                    <div class="bar-label">${dayName}</div>
                    <div class="bar-value">${day.estimatedMB.toFixed(1)}</div>
                </div>
            `;
        }).join('');
    }

    // Log stato corrente
    logCurrentStatus() {
        if (this.config.logLevel === 'none') return;
        
        const dailyMB = Math.round(this.consumption.daily.estimatedMB * 100) / 100;
        const sessionMB = Math.round(this.consumption.session.estimatedMB * 100) / 100;
        
        console.log(`📊 DATA CONSUMPTION STATUS:
Mode: ${this.config.mode}
Daily: ${dailyMB}MB / ${this.config.dailyLimitMB}MB
Session: ${sessionMB}MB
Cache: ${this.cacheSize}KB
Auto-refresh: ${this.config.autoRefreshEnabled ? 'ON' : 'OFF'}
Real-time: ${this.config.realTimeEnabled ? 'ON' : 'OFF'}`);
    }

    // Aggiorna UI configurazione
    updateConfigUI() {
        const indicator = document.getElementById('consumptionIndicator');
        if (indicator) {
            this.updateConsumptionIndicator(indicator);
        }
    }

    // Ottieni statistiche
    getStats() {
        return {
            config: this.config,
            consumption: this.consumption,
            cacheSize: this.cacheSize,
            warningShown: this.warningShown
        };
    }
}

// Istanza globale
window.dataConsumption = new DataConsumptionManager();

// Funzioni helper globali
window.setDataMode = function(mode) {
    window.dataConsumption.setMode(mode);
};

window.getDataStats = function() {
    return window.dataConsumption.getStats();
};

window.emergencyDataSaving = function() {
    window.dataConsumption.emergencyDataSaving();
};

// Inizializzazione automatica
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.dataConsumption) {
            window.dataConsumption.init();
        }
    }, 4000); // Dopo che tutto è caricato
});

console.log('📊 Data Consumption Manager caricato!');
console.log('💡 Usa window.setDataMode("ultra_low") per modalità risparmio massimo');
console.log('💡 Usa window.getDataStats() per vedere le statistiche');