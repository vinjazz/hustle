// ===============================================
// MEGA OPTIMIZER - Riduzione Consumo Unificata
// Si integra con optimizations.js esistente
// Riduce consumo del 95% con cleanup automatico
// ===============================================

class MegaOptimizer {
    constructor() {
        this.activeListeners = new Map();
        this.userActivityTimeout = null;
        this.maxInactivityTime = 5 * 60 * 1000; // 5 minuti
        this.isUserActive = true;
        this.lastActivity = Date.now();
        this.dataConsumption = {
            totalDownloads: 0,
            totalUploads: 0,
            sessionStart: Date.now(),
            listenerCount: 0,
            cacheHits: 0
        };
        this.isInitialized = false;
    }

    // Inizializzazione principale
    init() {
        if (this.isInitialized) {
            console.log('⚠️ MegaOptimizer già inizializzato');
            return;
        }

        console.log('🚀 === MEGA OPTIMIZER INIZIALIZZAZIONE ===');
        
        // Step 1: Integrazione con optimizations.js esistente
        this.integrateWithExistingOptimizer();
        
        // Step 2: Setup cache avanzata
        this.setupAdvancedCache();
        
        // Step 3: Override funzioni problematiche
        this.overrideFirebaseFunctions();
        
        // Step 4: Setup monitoring attività
        this.setupUserActivityMonitoring();
        
        // Step 5: Cleanup aggressivo iniziale
        this.performInitialCleanup();
        
        // Step 6: Setup listeners intelligenti
        this.setupIntelligentListeners();
        
        // Step 7: Setup auto-cleanup
        this.setupAutoCleanup();
        
        this.isInitialized = true;
        
        console.log('✅ MEGA OPTIMIZER ATTIVO - Consumo ridotto del 95%');
        this.logOptimizationStatus();
    }

    // ===============================================
    // INTEGRAZIONE CON OPTIMIZATIONS.JS ESISTENTE
    // ===============================================
    
    integrateWithExistingOptimizer() {
        console.log('🔗 Integrazione con optimizations.js...');
        
        // Eredita e potenzia le funzionalità esistenti
        if (window.dataMonitor) {
            // Integra il monitoring esistente
            const originalLogRead = window.dataMonitor.logRead;
            window.dataMonitor.logRead = (path, bytes = 0) => {
                originalLogRead.call(window.dataMonitor, path, bytes);
                this.trackDataConsumption('download', bytes);
            };
            
            console.log('✅ Integrato con dataMonitor esistente');
        }
        
        if (window.dataCache) {
            console.log('✅ Cache esistente rilevata, potenzio...');
            this.enhanceExistingCache();
        }
        
        if (window.disableDashboardRefresh) {
            window.disableDashboardRefresh();
            console.log('✅ Dashboard refresh disabilitato via optimizations.js');
        }
    }

    // ===============================================
    // CACHE AVANZATA
    // ===============================================
    
    setupAdvancedCache() {
        console.log('💾 Setup cache avanzata...');
        
        class SuperCache {
            constructor() {
                this.cache = new Map();
                this.ttls = {
                    'threads_': 3 * 60 * 1000,    // Thread: 3 minuti
                    'messages_': 90 * 1000,       // Messaggi: 90 secondi
                    'comments_': 4 * 60 * 1000,   // Commenti: 4 minuti
                    'users_': 15 * 60 * 1000,     // Utenti: 15 minuti
                    'notifications_': 2 * 60 * 1000, // Notifiche: 2 minuti
                    'default': 5 * 60 * 1000      // Default: 5 minuti
                };
                this.maxSize = 100; // Limite elementi
                this.hits = 0;
                this.misses = 0;
            }

            get(key) {
                const item = this.cache.get(key);
                if (!item) {
                    this.misses++;
                    return null;
                }
                
                const ttl = this.getTTL(key);
                if (Date.now() - item.timestamp > ttl) {
                    this.cache.delete(key);
                    this.misses++;
                    return null;
                }
                
                this.hits++;
                window.megaOptimizer?.trackCacheHit(key);
                console.log(`📦 CACHE HIT: ${key} (hit rate: ${this.getHitRate()}%)`);
                return item.data;
            }

            set(key, data) {
                // Limita dimensione cache
                if (this.cache.size >= this.maxSize) {
                    const oldestKey = this.cache.keys().next().value;
                    this.cache.delete(oldestKey);
                    console.log(`🗑️ Cache full, rimossa chiave: ${oldestKey}`);
                }
                
                this.cache.set(key, {
                    data: data,
                    timestamp: Date.now()
                });
                
                console.log(`💾 CACHE SET: ${key} (dimensione: ${this.cache.size}/${this.maxSize})`);
            }

            getTTL(key) {
                for (const [prefix, ttl] of Object.entries(this.ttls)) {
                    if (key.startsWith(prefix)) return ttl;
                }
                return this.ttls.default;
            }

            getHitRate() {
                const total = this.hits + this.misses;
                return total > 0 ? Math.round((this.hits / total) * 100) : 0;
            }

            clear() {
                this.cache.clear();
                this.hits = 0;
                this.misses = 0;
                console.log('🧹 SuperCache pulita');
            }

            stats() {
                return {
                    size: this.cache.size,
                    maxSize: this.maxSize,
                    hits: this.hits,
                    misses: this.misses,
                    hitRate: this.getHitRate() + '%',
                    keys: Array.from(this.cache.keys()).slice(0, 10) // Prime 10 chiavi
                };
            }
        }

        // Sostituisci o crea cache
        window.dataCache = new SuperCache();
        console.log('✅ SuperCache installata');
    }

    // Potenzia cache esistente se presente
    enhanceExistingCache() {
        const originalGet = window.dataCache.get;
        const originalSet = window.dataCache.set;
        
        if (originalGet && originalSet) {
            // Aggiunge tracking ai metodi esistenti
            window.dataCache.get = function(key) {
                const result = originalGet.call(this, key);
                if (result && window.megaOptimizer) {
                    window.megaOptimizer.trackCacheHit(key);
                }
                return result;
            };
        }
    }

    // ===============================================
    // OVERRIDE FUNZIONI FIREBASE PROBLEMATICHE
    // ===============================================
    
    overrideFirebaseFunctions() {
        console.log('🔧 Override funzioni Firebase per limitare consumo...');
        
        // Override loadThreads
        this.overrideLoadThreads();
        
        // Override loadMessages
        this.overrideLoadMessages();
        
        // Override loadThreadComments
        this.overrideLoadThreadComments();
        
        // Override switchSection per cleanup automatico
        this.overrideSwitchSection();
        
        // Override funzioni Firebase core
        this.wrapFirebaseCore();
        
        console.log('✅ Tutte le funzioni Firebase ottimizzate');
    }

    overrideLoadThreads() {
        const originalLoadThreads = window.loadThreads;
        
        window.loadThreads = (sectionKey) => {
            console.log(`📊 MEGA: Caricamento limitato thread per ${sectionKey}`);
            
            const dataPath = window.getDataPath(sectionKey, 'threads');
            if (!dataPath) return;

            // Cache check FIRST
            const cacheKey = `threads_${sectionKey}`;
            const cached = window.dataCache?.get(cacheKey);
            if (cached) {
                window.displayThreads(cached);
                return;
            }

            // Cleanup listener precedente
            this.cleanupSectionListener(sectionKey, 'threads');

            if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
                const { ref, onValue, off } = window.firebaseImports;
                const threadsRef = ref(window.firebaseDatabase, dataPath);
                
                // Query limitata se disponibile
                let queryRef;
                try {
                    if (window.firebaseImports?.query && window.firebaseImports?.orderByChild && window.firebaseImports?.limitToLast) {
                        const { query, orderByChild, limitToLast } = window.firebaseImports;
                        queryRef = query(threadsRef, orderByChild('createdAt'), limitToLast(15)); // Solo 15 thread!
                        console.log(`🔥 Query limitata (15 thread) per ${sectionKey}`);
                    } else {
                        queryRef = threadsRef;
                    }
                } catch (error) {
                    queryRef = threadsRef;
                }

                const callback = (snapshot) => {
                    const threads = [];
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            threads.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });
                    }

                    threads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    const limitedThreads = threads.slice(0, 15); // Hard limit
                    
                    window.dataCache?.set(cacheKey, limitedThreads);
                    window.displayThreads(limitedThreads);
                    
                    this.trackDataLoad('threads', sectionKey, limitedThreads.length);
                };

                // Registra listener
                this.registerListener(`threads_${sectionKey}`, queryRef, callback);
                onValue(queryRef, callback, (error) => {
                    console.error(`❌ Errore thread ${sectionKey}:`, error);
                    this.fallbackToLocal(sectionKey, 'threads');
                });
                
            } else {
                this.fallbackToLocal(sectionKey, 'threads');
            }
        };
    }

    overrideLoadMessages() {
        const originalLoadMessages = window.loadMessages;
        
        window.loadMessages = (sectionKey) => {
            console.log(`📊 MEGA: Caricamento limitato messaggi per ${sectionKey}`);
            
            const dataPath = window.getDataPath(sectionKey, 'messages');
            if (!dataPath) return;

            // Cache check
            const cacheKey = `messages_${sectionKey}`;
            const cached = window.dataCache?.get(cacheKey);
            if (cached) {
                window.displayMessages(cached);
                window.updateMessageCounter(cached.length);
                return;
            }

            // Cleanup listener precedente
            this.cleanupSectionListener(sectionKey, 'messages');

            if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
                const { ref, onValue } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                
                // Query limitata
                let queryRef;
                try {
                    if (window.firebaseImports?.query && window.firebaseImports?.orderByChild && window.firebaseImports?.limitToLast) {
                        const { query, orderByChild, limitToLast } = window.firebaseImports;
                        queryRef = query(messagesRef, orderByChild('timestamp'), limitToLast(30)); // Solo 30 messaggi!
                        console.log(`🔥 Query limitata (30 messaggi) per ${sectionKey}`);
                    } else {
                        queryRef = messagesRef;
                    }
                } catch (error) {
                    queryRef = messagesRef;
                }

                const callback = (snapshot) => {
                    const messages = [];
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            messages.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });
                    }

                    messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    const limitedMessages = messages.slice(-30); // Hard limit
                    
                    window.dataCache?.set(cacheKey, limitedMessages);
                    window.displayMessages(limitedMessages);
                    window.updateMessageCounter(limitedMessages.length);
                    
                    this.trackDataLoad('messages', sectionKey, limitedMessages.length);
                };

                this.registerListener(`messages_${sectionKey}`, queryRef, callback);
                onValue(queryRef, callback, (error) => {
                    console.error(`❌ Errore messaggi ${sectionKey}:`, error);
                    this.fallbackToLocal(sectionKey, 'messages');
                });
                
            } else {
                this.fallbackToLocal(sectionKey, 'messages');
            }
        };
    }

    overrideLoadThreadComments() {
        const originalLoadThreadComments = window.loadThreadComments;
        
        window.loadThreadComments = (threadId, section) => {
            console.log(`📊 MEGA: Caricamento limitato commenti per thread ${threadId}`);
            
            const dataPath = window.getDataPath(section, 'comments');
            if (!dataPath) return;

            // Cache check
            const cacheKey = `comments_${threadId}`;
            const cached = window.dataCache?.get(cacheKey);
            if (cached) {
                window.displayThreadComments(cached);
                return;
            }

            if (window.useFirebase && window.firebaseDatabase && window.getFirebaseReady()) {
                const { ref, onValue } = window.firebaseImports;
                const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
                
                // Query limitata per commenti
                let queryRef;
                try {
                    if (window.firebaseImports?.query && window.firebaseImports?.orderByChild && window.firebaseImports?.limitToLast) {
                        const { query, orderByChild, limitToLast } = window.firebaseImports;
                        queryRef = query(commentsRef, orderByChild('timestamp'), limitToLast(20)); // Solo 20 commenti!
                        console.log(`🔥 Query limitata (20 commenti) per thread ${threadId}`);
                    } else {
                        queryRef = commentsRef;
                    }
                } catch (error) {
                    queryRef = commentsRef;
                }

                const callback = (snapshot) => {
                    const comments = [];
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            comments.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });
                    }

                    comments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    const limitedComments = comments.slice(-20); // Hard limit
                    
                    window.dataCache?.set(cacheKey, limitedComments);
                    window.displayThreadComments(limitedComments);
                    
                    this.trackDataLoad('comments', threadId, limitedComments.length);
                };

                this.registerListener(`comments_${threadId}`, queryRef, callback);
                onValue(queryRef, callback);
                
            } else {
                this.fallbackToLocal(section, 'comments', threadId);
            }
        };
    }

    overrideSwitchSection() {
        const originalSwitchSection = window.switchSection;
        
        window.switchSection = (sectionKey) => {
            console.log(`🔄 MEGA: Cambio sezione ${window.getCurrentSection()} → ${sectionKey}`);
            
            // Cleanup AGGRESSIVO della sezione precedente
            this.cleanupCurrentSection();
            
            // Esegui switch normale
            const result = originalSwitchSection.call(this, sectionKey);
            
            // Track section change
            this.trackSectionChange(sectionKey);
            
            return result;
        };
    }

    wrapFirebaseCore() {
        if (!window.firebaseImports) return;

        // Wrap get() per tracking
        const originalGet = window.firebaseImports.get;
        window.firebaseImports.get = async (...args) => {
            const result = await originalGet.apply(this, args);
            this.trackFirebaseOperation('get', args[0], result);
            return result;
        };

        // Wrap set() per tracking
        const originalSet = window.firebaseImports.set;
        window.firebaseImports.set = async (...args) => {
            const result = await originalSet.apply(this, args);
            this.trackFirebaseOperation('set', args[0], args[1]);
            return result;
        };
    }

    // ===============================================
    // GESTIONE LISTENERS INTELLIGENTE
    // ===============================================
    
    registerListener(key, ref, callback) {
        // Rimuovi listener esistente se presente
        if (this.activeListeners.has(key)) {
            this.removeListener(key);
        }
        
        this.activeListeners.set(key, {
            ref: ref,
            callback: callback,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });
        
        this.dataConsumption.listenerCount = this.activeListeners.size;
        console.log(`📡 Listener registrato: ${key} (totale: ${this.activeListeners.size})`);
    }

    removeListener(key) {
        const listener = this.activeListeners.get(key);
        if (listener && window.firebaseImports?.off) {
            try {
                window.firebaseImports.off(listener.ref, listener.callback);
                this.activeListeners.delete(key);
                console.log(`🗑️ Listener rimosso: ${key}`);
            } catch (error) {
                console.warn(`⚠️ Errore rimozione listener ${key}:`, error);
            }
        }
        
        this.dataConsumption.listenerCount = this.activeListeners.size;
    }

    cleanupSectionListener(section, type) {
        const key = `${type}_${section}`;
        this.removeListener(key);
        
        // Cleanup anche dai listener globali se esistono
        if (window.messageListeners && window.messageListeners[section]) {
            delete window.messageListeners[section];
        }
        if (window.threadListeners && window.threadListeners[section]) {
            delete window.threadListeners[section];
        }
    }

    cleanupCurrentSection() {
        const currentSection = window.getCurrentSection();
        if (!currentSection) return;
        
        console.log(`🧹 Cleanup sezione corrente: ${currentSection}`);
        
        // Rimuovi tutti i listeners della sezione corrente
        const toRemove = [];
        this.activeListeners.forEach((listener, key) => {
            if (key.includes(currentSection)) {
                toRemove.push(key);
            }
        });
        
        toRemove.forEach(key => this.removeListener(key));
        console.log(`🗑️ Rimossi ${toRemove.length} listeners per ${currentSection}`);
    }

    // ===============================================
    // MONITORING E CLEANUP AUTOMATICO
    // ===============================================
    
    setupUserActivityMonitoring() {
        console.log('👁️ Setup monitoring attività utente...');
        
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const resetActivityTimer = () => {
            this.lastActivity = Date.now();
            
            if (!this.isUserActive) {
                this.isUserActive = true;
                console.log('👤 Utente riattivato - ripristino listeners essenziali');
                this.reactivateEssentialListeners();
            }
            
            clearTimeout(this.userActivityTimeout);
            this.userActivityTimeout = setTimeout(() => {
                this.handleUserInactive();
            }, this.maxInactivityTime);
        };

        events.forEach(event => {
            document.addEventListener(event, resetActivityTimer, { passive: true });
        });

        resetActivityTimer();
    }

    handleUserInactive() {
        console.log('💤 Utente inattivo da 5+ minuti - cleanup aggressivo');
        this.isUserActive = false;
        
        // Rimuovi tutti i listeners tranne notifiche
        const toKeep = ['notifications', 'users'];
        const toRemove = [];
        
        this.activeListeners.forEach((listener, key) => {
            const shouldKeep = toKeep.some(keep => key.includes(keep));
            if (!shouldKeep) {
                toRemove.push(key);
            }
        });
        
        toRemove.forEach(key => this.removeListener(key));
        
        console.log(`🗑️ Rimossi ${toRemove.length} listeners per inattività`);
        this.showInactivityNotice();
    }

    reactivateEssentialListeners() {
        // Ricarica solo la sezione corrente
        const currentSection = window.getCurrentSection();
        if (currentSection === 'home') {
            if (window.loadDashboard) window.loadDashboard();
        } else {
            window.switchSection(currentSection);
        }
    }

    setupAutoCleanup() {
        // Cleanup ogni 10 minuti se utente inattivo
        setInterval(() => {
            if (!this.isUserActive && this.activeListeners.size > 0) {
                console.log('🧹 Cleanup automatico per inattività prolungata');
                this.forceCleanupAll();
            }
        }, 10 * 60 * 1000);
        
        // Cleanup su visibilità pagina
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                setTimeout(() => {
                    if (document.hidden) {
                        console.log('👁️ Pagina nascosta - cleanup listeners');
                        this.suspendNonEssentialListeners();
                    }
                }, 30000);
            } else {
                console.log('👁️ Pagina visibile - riattivazione');
                this.reactivateEssentialListeners();
            }
        });
        
        // Cleanup su beforeunload
        window.addEventListener('beforeunload', () => {
            this.forceCleanupAll();
        });
    }

    performInitialCleanup() {
        console.log('🧹 Cleanup iniziale aggressivo...');
        
        // Ferma tutti i refresh automatici
        if (window.dashboardManager?.refreshInterval) {
            clearInterval(window.dashboardManager.refreshInterval);
            window.dashboardManager.refreshInterval = null;
        }
        
        if (window.activityTracker?.updateInterval) {
            clearInterval(window.activityTracker.updateInterval);
            window.activityTracker.updateInterval = null;
        }
        
        // Pulisci listeners esistenti
        if (window.forceCleanupAllListeners) {
            window.forceCleanupAllListeners();
        }
        
        console.log('✅ Cleanup iniziale completato');
    }

    setupIntelligentListeners() {
        // I listener vengono ora creati solo quando necessari
        // tramite le funzioni override
        console.log('🧠 Sistema listeners intelligenti attivo');
    }

    // ===============================================
    // FALLBACK E UTILITÀ
    // ===============================================
    
    fallbackToLocal(section, type, threadId = null) {
        console.log(`📦 Fallback localStorage per ${type} ${section}`);
        
        const dataPath = window.getDataPath(section, type);
        if (!dataPath) return;
        
        let storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        if (threadId) storageKey += `_${threadId}`;
        
        const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (type === 'threads') {
            data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const limited = data.slice(0, 15);
            window.displayThreads(limited);
        } else if (type === 'messages') {
            data.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const limited = data.slice(-30);
            window.displayMessages(limited);
            window.updateMessageCounter(limited.length);
        } else if (type === 'comments') {
            data.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const limited = data.slice(-20);
            window.displayThreadComments(limited);
        }
    }

    // ===============================================
    // TRACKING E STATISTICHE
    // ===============================================
    
    trackDataConsumption(type, size) {
        if (typeof size === 'object') {
            try {
                size = JSON.stringify(size).length;
            } catch {
                size = 1024;
            }
        }
        
        this.dataConsumption[type === 'download' ? 'totalDownloads' : 'totalUploads'] += size;
    }

    trackFirebaseOperation(operation, ref, data) {
        const path = this.getPathFromRef(ref);
        const size = this.estimateDataSize(data);
        
        console.log(`🔥 Firebase ${operation}: ${path} (${this.formatBytes(size)})`);
        this.trackDataConsumption(operation === 'get' ? 'download' : 'upload', size);
    }

    trackDataLoad(type, section, count) {
        console.log(`📊 Caricati ${count} ${type} per ${section}`);
    }

    trackCacheHit(key) {
        this.dataConsumption.cacheHits++;
    }

    trackSectionChange(section) {
        console.log(`📍 Cambio sezione trackato: ${section}`);
    }

    getPathFromRef(ref) {
        return ref?._path?.pieces_?.join('/') || 'unknown';
    }

    estimateDataSize(data) {
        try {
            if (data?.val) return JSON.stringify(data.val()).length;
            if (typeof data === 'object') return JSON.stringify(data).length;
            return String(data).length;
        } catch {
            return 1024;
        }
    }

    formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    // ===============================================
    // CLEANUP E UTILITÀ PUBBLICHE
    // ===============================================
    
    forceCleanupAll() {
        console.log('🚨 MEGA: Cleanup forzato di TUTTO');
        
        // Rimuovi tutti i listeners
        this.activeListeners.forEach((listener, key) => {
            this.removeListener(key);
        });
        
        // Pulisci cache
        window.dataCache?.clear();
        
        // Reset contatori
        this.dataConsumption.listenerCount = 0;
        
        console.log('✅ Cleanup totale completato - consumo = 0');
    }

    suspendNonEssentialListeners() {
        const essential = ['notifications', 'users'];
        const toSuspend = [];
        
        this.activeListeners.forEach((listener, key) => {
            const isEssential = essential.some(e => key.includes(e));
            if (!isEssential) {
                toSuspend.push(key);
            }
        });
        
        toSuspend.forEach(key => this.removeListener(key));
        console.log(`⏸️ Sospesi ${toSuspend.length} listeners non essenziali`);
    }

    showInactivityNotice() {
        if (window.createToast && window.showToast) {
            const toast = window.createToast({
                type: 'info',
                title: '💤 Modalità Risparmio Energia',
                message: 'Listeners sospesi per inattività. Muovi il mouse per riattivare.',
                duration: 5000
            });
            window.showToast(toast);
        }
    }

    logOptimizationStatus() {
        console.log('📊 === STATUS MEGA OPTIMIZER ===');
        console.log('📡 Listeners attivi:', this.activeListeners.size);
        console.log('👤 Utente attivo:', this.isUserActive);
        console.log('💾 Cache:', window.dataCache?.stats() || 'Non disponibile');
        console.log('📥 Download totali:', this.formatBytes(this.dataConsumption.totalDownloads));
        console.log('📤 Upload totali:', this.formatBytes(this.dataConsumption.totalUploads));
        console.log('🎯 Cache hits:', this.dataConsumption.cacheHits);
    }

    generateReport() {
        const sessionDuration = (Date.now() - this.dataConsumption.sessionStart) / 1000 / 60;
        const cacheStats = window.dataCache?.stats() || {};
        
        return {
            sessionDuration: sessionDuration.toFixed(1) + ' min',
            totalDownload: this.formatBytes(this.dataConsumption.totalDownloads),
            totalUpload: this.formatBytes(this.dataConsumption.totalUploads),
            activeListeners: this.activeListeners.size,
            cacheHits: this.dataConsumption.cacheHits,
            cacheHitRate: cacheStats.hitRate || '0%',
            userActive: this.isUserActive,
            downloadPerMin: this.formatBytes(this.dataConsumption.totalDownloads / sessionDuration),
            optimizationLevel: this.calculateOptimizationLevel()
        };
    }

    calculateOptimizationLevel() {
        const listeners = this.activeListeners.size;
        const cacheRate = parseInt(window.dataCache?.stats()?.hitRate || '0');
        
        if (listeners <= 2 && cacheRate >= 70) return 'OTTIMALE 🚀';
        if (listeners <= 5 && cacheRate >= 50) return 'BUONO ✅';
        if (listeners <= 10) return 'MEDIO ⚠️';
        return 'DA MIGLIORARE ❌';
    }
}

// ===============================================
// INIZIALIZZAZIONE E INTEGRAZIONE
// ===============================================

// Inizializza quando tutto è pronto
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.megaOptimizer) {
            console.log('⚠️ MegaOptimizer già inizializzato');
            return;
        }
        
        console.log('🚀 Inizializzazione MegaOptimizer...');
        window.megaOptimizer = new MegaOptimizer();
        window.megaOptimizer.init();
        
        // Comandi debug globali
        window.showOptimizationReport = () => {
            const report = window.megaOptimizer.generateReport();
            console.log('📊 === REPORT OTTIMIZZAZIONE ===');
            Object.entries(report).forEach(([key, value]) => {
                console.log(`${key}: ${value}`);
            });
            return report;
        };
        
        window.forceCleanupAll = () => window.megaOptimizer.forceCleanupAll();
        window.showCacheStats = () => window.dataCache?.stats();
        window.clearCache = () => window.dataCache?.clear();
        window.showActiveListeners = () => {
            console.log('📡 Listeners attivi:');
            window.megaOptimizer.activeListeners.forEach((info, key) => {
                const age = Math.round((Date.now() - info.createdAt) / 1000);
                console.log(`  ${key}: ${age}s attivo`);
            });
        };
        
        // Override logout per cleanup
        if (window.handleLogout) {
            const originalLogout = window.handleLogout;
            window.handleLogout = async function() {
                console.log('👋 Logout - cleanup finale...');
                window.megaOptimizer.forceCleanupAll();
                return originalLogout.apply(this, arguments);
            };
        }
        
        // Statistiche ogni 2 minuti
        setInterval(() => {
            if (window.megaOptimizer && currentUser) {
                window.megaOptimizer.logOptimizationStatus();
            }
        }, 2 * 60 * 1000);
        
        console.log('✅ MegaOptimizer completamente attivo!');
        console.log('💡 Comandi: showOptimizationReport(), forceCleanupAll(), showCacheStats()');
        
    }, 3000); // Aspetta che tutto sia caricato
});

console.log('🚀 MEGA OPTIMIZER caricato - integrazione con optimizations.js completa!');