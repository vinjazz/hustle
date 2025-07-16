// ===============================================
// FIREBASE DEDUPLICATION FIX - COMPATIBILITÀ SNAPSHOT
// Sostituisci il contenuto di firebase-deduplication.js
// ===============================================

// 1. SISTEMA DI DEDUPLICAZIONE RICHIESTE CON MOCK SNAPSHOT
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
            
            // ✅ CORREZIONE: Restituisci un oggetto che simula Firebase snapshot
            return this.createMockSnapshot(cached);
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

    // ✅ NUOVA FUNZIONE: Crea un mock snapshot compatibile con Firebase
    createMockSnapshot(data) {
        const mockSnapshot = {
            val: () => data,
            exists: () => data !== null && data !== undefined,
            
            // ✅ CORREZIONE PRINCIPALE: Implementa forEach per compatibilità
            forEach: (callback) => {
                if (!data || typeof data !== 'object') {
                    return false;
                }
                
                // Simula il comportamento di Firebase snapshot.forEach
                Object.keys(data).forEach(key => {
                    const childData = data[key];
                    
                    // Crea un mock child snapshot
                    const childSnapshot = {
                        key: key,
                        val: () => childData,
                        exists: () => childData !== null && childData !== undefined
                    };
                    
                    // Chiama il callback con il child snapshot
                    callback(childSnapshot);
                });
                
                return true;
            },
            
            // ✅ AGGIUNGI: Altri metodi che potrebbero essere necessari
            hasChild: (path) => {
                return data && typeof data === 'object' && data.hasOwnProperty(path);
            },
            
            child: (path) => {
                const childData = data && typeof data === 'object' ? data[path] : null;
                return this.createMockSnapshot(childData);
            },
            
            size: data && typeof data === 'object' ? Object.keys(data).length : 0,
            
            // Proprietà per debug
            _isMockSnapshot: true,
            _cachedData: data
        };
        
        return mockSnapshot;
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

// 3. OVERRIDE GET() CON DEDUPLICAZIONE CORRETTA
function installDeduplication() {
    if (!window.firebaseImports || !window.firebaseImports.get) {
        console.error('❌ Firebase imports non disponibili per deduplicazione');
        return;
    }

    const originalGet = window.firebaseImports.get;
    
    window.firebaseImports.get = async function(reference) {
        const path = reference._path?.pieces_?.join('/') || 'unknown';
        
        // Usa il deduplicatore con mock snapshot
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
        
        // ✅ DEBUG: Log del tipo di snapshot
        if (result._isMockSnapshot) {
            console.log(`📦 Restituito mock snapshot per: ${path}`);
        } else {
            console.log(`🔥 Restituito snapshot Firebase reale per: ${path}`);
        }
        
        return result;
    };

    console.log('✅ Deduplicazione Firebase installata con supporto snapshot');
}

// 4. FIX PER DASHBOARD - PREVIENI CARICAMENTI MULTIPLI (AGGIORNATO)
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
                    // ✅ CORREZIONE: Crea mock snapshot per cache
                    const mockSnapshot = window.firebaseDeduplicator.createMockSnapshot(cached);
                    this.displayLatestThreads(mockSnapshot);
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

// 5. FIX SPECIFICO PER ACTIVITY TRACKER
window.fixActivityTrackerCompatibility = function() {
    console.log('🔧 Fix compatibilità Activity Tracker...');
    
    if (!window.activityTracker) {
        console.warn('⚠️ Activity Tracker non trovato');
        return;
    }
    
    // Override delle funzioni che usano snapshot.forEach
    const originalCountNewMessages = window.activityTracker.countNewMessages;
    const originalCountNewThreads = window.activityTracker.countNewThreads;
    
    // ✅ CORREZIONE: countNewMessages con verifica mock snapshot
    window.activityTracker.countNewMessages = async function(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'messages');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(messagesRef);
                
                if (snapshot.exists()) {
                    // ✅ VERIFICA: Se è un mock snapshot o uno reale
                    if (snapshot._isMockSnapshot) {
                        console.log(`📦 Usando mock snapshot per messaggi ${section}`);
                    }
                    
                    // Entrambi i tipi supportano forEach ora
                    snapshot.forEach((childSnapshot) => {
                        const message = childSnapshot.val();
                        // Non contare i propri messaggi
                        if (message.timestamp > sinceTime && message.authorId !== currentUser.uid) {
                            count++;
                        }
                    });
                }
            } catch (error) {
                if (error.code === 'PERMISSION_DENIED') {
                    console.warn(`⚠️ Permessi negati per messaggi ${section}, uso cache locale`);
                } else {
                    console.error(`Errore conteggio messaggi ${section}:`, error);
                }
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'messages', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'messages', sinceTime);
        }
        
        return count;
    };
    
    // ✅ CORREZIONE: countNewThreads con verifica mock snapshot
    window.activityTracker.countNewThreads = async function(section, sinceTime) {
        const dataPath = window.getDataPath(section, 'threads');
        if (!dataPath) return 0;
        
        let count = 0;
        
        if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
            try {
                const { ref, get } = window.firebaseImports;
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(threadsRef);
                
                if (snapshot.exists()) {
                    // ✅ VERIFICA: Se è un mock snapshot o uno reale
                    if (snapshot._isMockSnapshot) {
                        console.log(`📦 Usando mock snapshot per thread ${section}`);
                    }
                    
                    // Entrambi i tipi supportano forEach ora
                    snapshot.forEach((childSnapshot) => {
                        const thread = childSnapshot.val();
                        // Conta solo thread approvati creati dopo il riferimento
                        if (thread.createdAt > sinceTime && 
                            (!thread.status || thread.status === 'approved')) {
                            count++;
                        }
                    });
                }
            } catch (error) {
                if (error.code === 'PERMISSION_DENIED') {
                    console.warn(`⚠️ Permessi negati per thread ${section}, uso cache locale`);
                } else {
                    console.error(`Errore conteggio thread ${section}:`, error);
                }
                // Fallback to localStorage
                return this.countFromLocalStorage(section, 'threads', sinceTime);
            }
        } else {
            // Modalità locale
            return this.countFromLocalStorage(section, 'threads', sinceTime);
        }
        
        return count;
    };
    
    console.log('✅ Activity Tracker compatibilità fix applicato');
};

// 6. FIX PER LISTENERS DUPLICATI (AGGIORNATO)
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

// 7. REPORT DETTAGLIATO (AGGIORNATO)
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
    
    // ✅ NUOVO: Report mock snapshots
    let mockSnapshots = 0;
    window.firebaseDeduplicator.cache.forEach((item) => {
        if (item.data) mockSnapshots++;
    });
    console.log(`📦 Mock snapshots in cache: ${mockSnapshots}`);
    
    return {
        cache: stats,
        monitor: report,
        mockSnapshots: mockSnapshots
    };
};

// 8. ATTIVAZIONE AUTOMATICA (AGGIORNATA)
setTimeout(() => {
    console.log('🚀 Attivazione sistema anti-duplicazione con fix snapshot...');
    
    // Installa deduplicazione
    installDeduplication();
    
    // Fix dashboard
    window.fixDashboardMultipleLoads();
    
    // ✅ NUOVO: Fix Activity Tracker
    window.fixActivityTrackerCompatibility();
    
    // Pulisci listeners duplicati
    window.cleanupDuplicateListeners();
    
    console.log('✅ Sistema anti-duplicazione attivo con supporto completo snapshot!');
    console.log('📊 Usa window.deduplicationReport() per statistiche');
}, 2000);

// 9. FUNZIONI DI TEST
window.testMockSnapshot = function() {
    console.log('🧪 Test Mock Snapshot...');
    
    const testData = {
        'item1': { name: 'Test 1', value: 123 },
        'item2': { name: 'Test 2', value: 456 }
    };
    
    const mockSnapshot = window.firebaseDeduplicator.createMockSnapshot(testData);
    
    console.log('✅ Mock snapshot creato:', mockSnapshot);
    console.log('📄 Val():', mockSnapshot.val());
    console.log('✅ Exists():', mockSnapshot.exists());
    console.log('📏 Size:', mockSnapshot.size);
    
    // Test forEach
    console.log('🔄 Test forEach:');
    mockSnapshot.forEach((childSnapshot) => {
        console.log(`  - ${childSnapshot.key}:`, childSnapshot.val());
    });
    
    console.log('✅ Test completato!');
};

// 10. FUNZIONE DI EMERGENZA (AGGIORNATA)
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
    
    // Ripristina funzioni Activity Tracker originali
    if (window.activityTracker) {
        console.log('🔄 Ripristino Activity Tracker...');
        window.location.reload(); // Modo più sicuro per ripristinare
    }
    
    console.log('✅ Tutto fermato. Ricarica la pagina per ripartire.');
};

console.log('✅ firebase-deduplication.js FIXED caricato con supporto snapshot!');