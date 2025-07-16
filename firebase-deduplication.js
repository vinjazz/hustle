// ===============================================
// FIREBASE DEDUPLICATION - PREVIENI LETTURE MULTIPLE
// Salva come: firebase-deduplication.js
// ===============================================

// 1. SISTEMA DI DEDUPLICAZIONE RICHIESTE
class FirebaseRequestDeduplicator {
    constructor() {
        this.pendingRequests = new Map();
        this.cache = new Map();
        this.CACHE_DURATION = 30000; // 30 secondi di cache
    }

    async dedupedGet(path, originalGet, reference) {
        // Controlla cache
        const cached = this.getFromCache(path);
        if (cached !== null) {
            console.log(`💾 CACHE HIT: ${path}`);
            window.dataMonitor?.logCacheHit(path);
            return {
                val: () => cached,
                exists: () => true
            };
        }

        // Controlla se c'è già una richiesta pendente
        if (this.pendingRequests.has(path)) {
            console.log(`⏳ DEDUP: Riutilizzo richiesta pendente per ${path}`);
            return this.pendingRequests.get(path);
        }

        // Nuova richiesta
        console.log(`🔍 NUOVA richiesta per: ${path}`);
        const promise = originalGet(reference).then(snapshot => {
            // Salva in cache
            const data = snapshot.val();
            if (data !== null) {
                this.setCache(path, data);
            }
            
            // Rimuovi dalla lista pendenti
            this.pendingRequests.delete(path);
            
            return snapshot;
        }).catch(error => {
            // Rimuovi dalla lista pendenti anche in caso di errore
            this.pendingRequests.delete(path);
            throw error;
        });

        // Salva come pendente
        this.pendingRequests.set(path, promise);
        
        return promise;
    }

    getFromCache(path) {
        const item = this.cache.get(path);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.CACHE_DURATION) {
            this.cache.delete(path);
            return null;
        }
        
        return item.data;
    }

    setCache(path, data) {
        this.cache.set(path, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache Firebase pulita');
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            pendingRequests: this.pendingRequests.size
        };
    }
}

// 2. INIZIALIZZA DEDUPLICATORE
window.firebaseDeduplicator = new FirebaseRequestDeduplicator();

// 3. OVERRIDE GET() CON DEDUPLICAZIONE
function installDeduplication() {
    if (!window.firebaseImports || !window.firebaseImports.get) {
        console.error('❌ Firebase imports non disponibili per deduplicazione');
        return;
    }

    const originalGet = window.firebaseImports.get;
    
    window.firebaseImports.get = async function(reference) {
        const path = reference._path?.pieces_?.join('/') || 'unknown';
        
        // Usa il deduplicatore
        const result = await window.firebaseDeduplicator.dedupedGet(
            path, 
            originalGet, 
            reference
        );
        
        // Log per monitoraggio
        try {
            const dataSize = JSON.stringify(result.val() || {}).length;
            window.dataMonitor?.logRead(path, dataSize);
        } catch (e) {
            window.dataMonitor?.logRead(path, 0);
        }
        
        return result;
    };

    console.log('✅ Deduplicazione Firebase installata');
}

// 4. FIX PER DASHBOARD - PREVIENI CARICAMENTI MULTIPLI
window.fixDashboardMultipleLoads = function() {
    console.log('🔧 Fix caricamenti multipli dashboard...');
    
    // Override loadLatestThreads per prevenire chiamate multiple
    if (window.dashboardManager) {
        const original = window.dashboardManager.loadLatestThreads;
        let loadingThreads = false;
        
        window.dashboardManager.loadLatestThreads = async function() {
            if (loadingThreads) {
                console.log('⏸️ Caricamento thread già in corso, skip');
                return;
            }
            
            loadingThreads = true;
            try {
                // Usa cache se disponibile
                const cached = window.firebaseDeduplicator.getFromCache('dashboard_threads');
                if (cached) {
                    console.log('💾 Uso cache per latest threads');
                    this.displayLatestThreads(cached);
                    return;
                }
                
                // Altrimenti carica normalmente
                await original.call(this);
                
            } finally {
                loadingThreads = false;
            }
        };
    }
};

// 5. FIX PER LISTENERS DUPLICATI
window.cleanupDuplicateListeners = function() {
    console.log('🧹 Pulizia listeners duplicati...');
    
    // Trova e rimuovi listeners duplicati
    const activeListeners = new Set();
    
    // Per i thread listeners
    if (window.threadListeners) {
        Object.keys(window.threadListeners).forEach(key => {
            const listener = window.threadListeners[key];
            const id = `${listener.path}_thread`;
            
            if (activeListeners.has(id)) {
                console.log(`🔥 Rimuovo listener duplicato: ${id}`);
                if (listener.callback) {
                    const ref = window.firebaseImports.ref(window.firebaseDatabase, listener.path);
                    window.firebaseImports.off(ref, listener.callback);
                }
                delete window.threadListeners[key];
            } else {
                activeListeners.add(id);
            }
        });
    }
    
    // Per i message listeners
    if (window.messageListeners) {
        Object.keys(window.messageListeners).forEach(key => {
            const listener = window.messageListeners[key];
            const id = `${listener.path}_message`;
            
            if (activeListeners.has(id)) {
                console.log(`🔥 Rimuovo listener duplicato: ${id}`);
                if (listener.callback) {
                    const ref = window.firebaseImports.ref(window.firebaseDatabase, listener.path);
                    window.firebaseImports.off(ref, listener.callback);
                }
                delete window.messageListeners[key];
            } else {
                activeListeners.add(id);
            }
        });
    }
    
    console.log(`✅ Listeners attivi ora: ${activeListeners.size}`);
};

// 6. MONITORA CHIAMATE DUPLICATE
window.monitorDuplicateCalls = function() {
    const callLog = new Map();
    const checkInterval = 1000; // 1 secondo
    
    // Override temporaneo per monitoraggio
    const originalGet = window.firebaseImports.get;
    
    window.firebaseImports.get = function(reference) {
        const path = reference._path?.pieces_?.join('/') || 'unknown';
        const now = Date.now();
        
        // Controlla se è una chiamata duplicata
        if (callLog.has(path)) {
            const lastCall = callLog.get(path);
            if (now - lastCall < checkInterval) {
                console.warn(`⚠️ CHIAMATA DUPLICATA RILEVATA: ${path} (${now - lastCall}ms dall'ultima)`);
            }
        }
        
        callLog.set(path, now);
        
        // Pulisci vecchie entries
        if (callLog.size > 100) {
            const oldestAllowed = now - 60000; // 1 minuto
            for (const [key, time] of callLog) {
                if (time < oldestAllowed) {
                    callLog.delete(key);
                }
            }
        }
        
        return originalGet.apply(this, arguments);
    };
    
    console.log('👁️ Monitoraggio chiamate duplicate attivato');
};

// 7. REPORT DETTAGLIATO
window.deduplicationReport = function() {
    const stats = window.firebaseDeduplicator.getCacheStats();
    const report = window.dataMonitor?.getReport() || {};
    
    console.log('📊 === REPORT DEDUPLICAZIONE ===');
    console.log(`💾 Elementi in cache: ${stats.size}`);
    console.log(`⏳ Richieste pendenti: ${stats.pendingRequests}`);
    console.log(`📖 Letture totali: ${report.reads || 0}`);
    console.log(`💾 Cache hits: ${report.cacheHits || 0}`);
    
    if (report.reads > 0 && report.cacheHits > 0) {
        const saved = ((report.cacheHits / (report.reads + report.cacheHits)) * 100).toFixed(2);
        console.log(`💰 Risparmio banda: ${saved}%`);
    }
    
    return {
        cache: stats,
        monitor: report
    };
};

// 8. ATTIVAZIONE AUTOMATICA
setTimeout(() => {
    console.log('🚀 Attivazione sistema anti-duplicazione...');
    
    // Installa deduplicazione
    installDeduplication();
    
    // Fix dashboard
    window.fixDashboardMultipleLoads();
    
    // Pulisci listeners duplicati
    window.cleanupDuplicateListeners();
    
    // Attiva monitoraggio (opzionale, solo per debug)
    // window.monitorDuplicateCalls();
    
    console.log('✅ Sistema anti-duplicazione attivo!');
    console.log('📊 Usa window.deduplicationReport() per statistiche');
}, 2000);

// 9. FUNZIONE DI EMERGENZA
window.emergencyStopAll = function() {
    console.log('🚨 STOP EMERGENZA ATTIVATO!');
    
    // Ferma tutti i listeners
    if (window.forceCleanupAllListeners) {
        window.forceCleanupAllListeners();
    }
    
    // Pulisci cache
    window.firebaseDeduplicator.clearCache();
    
    // Ferma dashboard
    if (window.dashboardManager && window.dashboardManager.cleanup) {
        window.dashboardManager.cleanup();
    }
    
    console.log('✅ Tutto fermato. Ricarica la pagina per ripartire.');
};

console.log('✅ firebase-deduplication.js caricato!');