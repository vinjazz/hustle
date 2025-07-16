// ===============================================
// OTTIMIZZAZIONI FIREBASE - RIDUZIONE TRAFFICO DATI
// Crea questo file come: optimizations.js
// ===============================================

// 1. DISABILITA REFRESH AUTOMATICO DASHBOARD
window.dashboardManager.startAutoRefresh = function() {
    console.log('? Auto-refresh dashboard DISABILITATO per risparmiare banda');
    // NON avviare il refresh automatico
};

// 2. IMPLEMENTA CACHE CON TIMESTAMP
class DataCache {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minuti
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }

    set(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clear() {
        this.cache.clear();
    }
}

window.dataCache = new DataCache();

// 3. MONITORAGGIO CONSUMO DATI
class DataUsageMonitor {
    constructor() {
        this.stats = {
            reads: 0,
            writes: 0,
            cacheHits: 0,
            bytesDownloaded: 0,
            startTime: Date.now()
        };
    }
    
    logRead(path, bytes = 0) {
        this.stats.reads++;
        this.stats.bytesDownloaded += bytes;
        console.log(`?? READ: ${path} (${this.formatBytes(bytes)})`);
    }
    
    logWrite(path) {
        this.stats.writes++;
        console.log(`?? WRITE: ${path}`);
    }
    
    logCacheHit(key) {
        this.stats.cacheHits++;
        console.log(`?? CACHE HIT: ${key}`);
    }
    
    formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }
    
    getReport() {
        const duration = (Date.now() - this.stats.startTime) / 1000 / 60;
        return {
            ...this.stats,
            duration: duration.toFixed(2) + ' minuti',
            avgReadsPerMin: (this.stats.reads / duration).toFixed(2),
            totalData: this.formatBytes(this.stats.bytesDownloaded),
            cacheEfficiency: this.stats.reads > 0 ? 
                ((this.stats.cacheHits / (this.stats.reads + this.stats.cacheHits)) * 100).toFixed(2) + '%' : '0%'
        };
    }
}

window.dataMonitor = new DataUsageMonitor();

// 4. FUNZIONE PER DISABILITARE AUTO-REFRESH
window.disableDashboardRefresh = function() {
    if (window.dashboardManager && window.dashboardManager.refreshInterval) {
        clearInterval(window.dashboardManager.refreshInterval);
        window.dashboardManager.refreshInterval = null;
        console.log('? Dashboard auto-refresh FERMATO');
        
        // Aggiungi bottone refresh manuale
        const threadList = document.getElementById('thread-list');
        if (threadList && !document.getElementById('manual-refresh-notice')) {
            const notice = document.createElement('div');
            notice.id = 'manual-refresh-notice';
            notice.style.cssText = `
                background: rgba(52, 152, 219, 0.1);
                border: 1px solid rgba(52, 152, 219, 0.3);
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                text-align: center;
            `;
            notice.innerHTML = `
                <p style="margin: 0 0 10px 0; color: #3498db;">
                    ?? Auto-refresh disabilitato per risparmiare banda
                </p>
                <button onclick="window.dashboardManager.loadDashboard()" 
                        style="background: #3498db; color: white; border: none; 
                               padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                    ?? Aggiorna Manualmente
                </button>
            `;
            threadList.insertBefore(notice, threadList.firstChild);
        }
    }
};

// 5. CLEANUP AGGRESSIVO
window.aggressiveCleanup = function() {
    console.log('?? Pulizia aggressiva listeners...');
    
    // Ferma tutti i listeners
    if (window.forceCleanupAllListeners) {
        window.forceCleanupAllListeners();
    }
    
    // Ferma dashboard refresh
    window.disableDashboardRefresh();
    
    // Pulisci cache se troppo grande
    if (window.dataCache && window.dataCache.cache.size > 50) {
        window.dataCache.clear();
        console.log('??? Cache pulita');
    }
    
    console.log('? Cleanup completato');
};

// 6. ATTIVA OTTIMIZZAZIONI
window.activateOptimizations = function() {
    console.log('?? ATTIVAZIONE OTTIMIZZAZIONI TRAFFICO DATI...');
    
    // Disabilita auto-refresh dashboard
    setTimeout(() => {
        window.disableDashboardRefresh();
    }, 1000);
    
    // Monitora tutte le chiamate get()
    if (window.firebaseImports && window.firebaseImports.get) {
        const originalGet = window.firebaseImports.get;
        window.firebaseImports.get = async function(reference) {
            const path = reference._path?.pieces_?.join('/') || 'unknown';
            console.log(`?? Firebase GET: ${path}`);
            
            const result = await originalGet.apply(this, arguments);
            
            // Stima dimensione
            try {
                const dataSize = JSON.stringify(result.val() || {}).length;
                window.dataMonitor.logRead(path, dataSize);
            } catch (e) {
                window.dataMonitor.logRead(path, 0);
            }
            
            return result;
        };
    }
    
    console.log('? Ottimizzazioni attivate!');
    console.log('?? Usa window.dataMonitor.getReport() per statistiche');
};

// 7. AUTO-ATTIVAZIONE DOPO 3 SECONDI
setTimeout(() => {
    console.log('? Auto-attivazione ottimizzazioni...');
    window.activateOptimizations();
}, 3000);

// 8. REPORT RAPIDO
window.quickReport = function() {
    const report = window.dataMonitor.getReport();
    console.log('?? === REPORT CONSUMO DATI ===');
    console.log(`?? Durata sessione: ${report.duration}`);
    console.log(`?? Letture totali: ${report.reads}`);
    console.log(`?? Dati scaricati: ${report.totalData}`);
    console.log(`?? Efficienza cache: ${report.cacheEfficiency}`);
    console.log(`?? Media letture/min: ${report.avgReadsPerMin}`);
    return report;
};

console.log('? optimizations.js caricato - Ottimizzazioni pronte!');
