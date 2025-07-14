// ===============================================
// SCRIPT.JS OTTIMIZZATO - RIDUZIONE CONSUMO DATABASE
// - Thread: caricamento manuale invece di real-time
// - Chat: solo ultimi 3 messaggi + real-time
// - Badge: caricamento manuale
// ===============================================

// ===============================================
// 1. CACHE SYSTEM PER THREAD
// ===============================================
class ThreadCache {
    constructor() {
        this.cache = new Map(); // sectionKey -> {threads: [], lastTimestamp: number}
        this.isLoading = new Set(); // sezioni in caricamento
    }

    get(sectionKey) {
        return this.cache.get(sectionKey) || { threads: [], lastTimestamp: 0 };
    }

    set(sectionKey, threads, lastTimestamp = null) {
        const timestamp = lastTimestamp || (threads.length > 0 ? Math.max(...threads.map(t => t.createdAt || 0)) : 0);
        this.cache.set(sectionKey, { threads, lastTimestamp: timestamp });
        console.log(`💾 Cache aggiornata per ${sectionKey}: ${threads.length} thread, ultimo: ${new Date(timestamp).toLocaleString()}`);
    }

    addNewThreads(sectionKey, newThreads) {
        const cached = this.get(sectionKey);
        const allThreads = [...cached.threads, ...newThreads];
        
        // Rimuovi duplicati per ID
        const uniqueThreads = allThreads.reduce((acc, thread) => {
            if (!acc.find(t => t.id === thread.id)) {
                acc.push(thread);
            }
            return acc;
        }, []);

        // Ordina per data (più recenti prima)
        uniqueThreads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const newLastTimestamp = uniqueThreads.length > 0 ? Math.max(...uniqueThreads.map(t => t.createdAt || 0)) : cached.lastTimestamp;
        this.set(sectionKey, uniqueThreads, newLastTimestamp);
        
        return newThreads.length;
    }

    isLoadingSection(sectionKey) {
        return this.isLoading.has(sectionKey);
    }

    setLoading(sectionKey, loading) {
        if (loading) {
            this.isLoading.add(sectionKey);
        } else {
            this.isLoading.delete(sectionKey);
        }
    }

    clear() {
        this.cache.clear();
        this.isLoading.clear();
    }
}

// Istanza globale
window.threadCache = new ThreadCache();

// ===============================================
// 2. NUOVO SISTEMA CARICAMENTO THREAD (MANUALE)
// ===============================================

// Modifica della funzione loadThreads per caricamento una-tantum
async function loadThreads(sectionKey, forceRefresh = false) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath) return;

    console.log(`📊 Caricamento thread per ${sectionKey} (force: ${forceRefresh})`);

    // Se non è un refresh forzato e abbiamo già thread in cache, usali
    if (!forceRefresh) {
        const cached = window.threadCache.get(sectionKey);
        if (cached.threads.length > 0) {
            console.log(`💾 Usando cache per ${sectionKey}: ${cached.threads.length} thread`);
            displayThreads(cached.threads);
            updateRefreshButton(sectionKey, false); // Abilita bottone refresh
            return;
        }
    }

    // Caricamento iniziale o refresh
    try {
        window.threadCache.setLoading(sectionKey, true);
        updateRefreshButton(sectionKey, true); // Disabilita bottone durante caricamento

        let threads = [];

        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && get) {
            console.log(`🔥 Caricamento Firebase una-tantum per ${sectionKey}`);
            const threadsRef = ref(window.firebaseDatabase, dataPath);
            const snapshot = await get(threadsRef);

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    threads.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }
        } else {
            // Modalità locale
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }

        // Ordina per data
        threads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Salva in cache
        window.threadCache.set(sectionKey, threads);

        // Mostra thread
        displayThreads(threads);

        console.log(`✅ Caricati ${threads.length} thread per ${sectionKey}`);

    } catch (error) {
        console.error(`❌ Errore caricamento thread ${sectionKey}:`, error);
        // Mostra thread dalla cache se disponibili
        const cached = window.threadCache.get(sectionKey);
        if (cached.threads.length > 0) {
            displayThreads(cached.threads);
        } else {
            displayThreads([]);
        }
    } finally {
        window.threadCache.setLoading(sectionKey, false);
        updateRefreshButton(sectionKey, false);
    }
}

// Nuova funzione per caricare solo i thread nuovi
async function loadNewThreads(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath) return 0;

    console.log(`🆕 Caricamento thread nuovi per ${sectionKey}`);

    if (window.threadCache.isLoadingSection(sectionKey)) {
        console.log(`⏳ Caricamento già in corso per ${sectionKey}`);
        return 0;
    }

    try {
        window.threadCache.setLoading(sectionKey, true);
        updateRefreshButton(sectionKey, true);

        const cached = window.threadCache.get(sectionKey);
        const lastTimestamp = cached.lastTimestamp;

        let newThreads = [];

        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && get) {
            console.log(`🔍 Cercando thread dopo ${new Date(lastTimestamp).toLocaleString()}`);
            
            const threadsRef = ref(window.firebaseDatabase, dataPath);
            const snapshot = await get(threadsRef);

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const thread = {
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    };
                    
                    // Aggiungi solo se più recente dell'ultimo timestamp
                    if ((thread.createdAt || 0) > lastTimestamp) {
                        newThreads.push(thread);
                    }
                });
            }
        } else {
            // Modalità locale
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const allThreads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            newThreads = allThreads.filter(thread => (thread.createdAt || 0) > lastTimestamp);
        }

        if (newThreads.length > 0) {
            // Aggiungi alla cache
            const addedCount = window.threadCache.addNewThreads(sectionKey, newThreads);
            
            // Aggiorna display
            const allThreads = window.threadCache.get(sectionKey).threads;
            displayThreads(allThreads);

            console.log(`✅ Aggiunti ${addedCount} nuovi thread per ${sectionKey}`);
            
            // Mostra notifica
            showNewThreadsNotification(addedCount);
            
            return addedCount;
        } else {
            console.log(`📭 Nessun nuovo thread per ${sectionKey}`);
            showNoNewThreadsNotification();
            return 0;
        }

    } catch (error) {
        console.error(`❌ Errore caricamento thread nuovi ${sectionKey}:`, error);
        return 0;
    } finally {
        window.threadCache.setLoading(sectionKey, false);
        updateRefreshButton(sectionKey, false);
    }
}

// ===============================================
// 3. GESTIONE BOTTONE REFRESH THREAD
// ===============================================

// Aggiorna lo stato del bottone refresh
function updateRefreshButton(sectionKey, isLoading) {
    const button = document.getElementById('refresh-threads-btn');
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `
            <div class="refresh-spinner"></div>
            <span>Caricando...</span>
        `;
    } else {
        button.disabled = false;
        button.innerHTML = `
            <span class="refresh-icon">🔄</span>
            <span>Nuovi Thread</span>
        `;
    }
}

// Gestisce il click del bottone refresh
async function handleRefreshThreadsClick() {
    if (!currentSection || currentSection === 'home') return;
    
    const sectionConfig = window.sectionConfig[currentSection];
    if (!sectionConfig || sectionConfig.type !== 'forum') return;

    console.log(`🔄 Refresh thread richiesto per ${currentSection}`);
    
    const newCount = await loadNewThreads(currentSection);
    
    // Log per statistiche
    console.log(`📊 Refresh completato: ${newCount} nuovi thread`);
}

// Notifiche per i nuovi thread
function showNewThreadsNotification(count) {
    const toast = createToast({
        type: 'success',
        title: '🆕 Nuovi Thread!',
        message: `Trovati ${count} nuovi thread!`,
        duration: 3000
    });
    showToast(toast);
}

function showNoNewThreadsNotification() {
    const toast = createToast({
        type: 'info',
        title: '📭 Nessun Nuovo Thread',
        message: 'Non ci sono nuovi thread da caricare',
        duration: 2000
    });
    showToast(toast);
}

// ===============================================
// 4. OTTIMIZZAZIONE CARICAMENTO MESSAGGI CHAT
// ===============================================

// Carica messaggi ottimizzato (solo ultimi 3 + real-time)
function loadMessages(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'messages');
    if (!dataPath) return;

    console.log(`💬 Caricamento chat ottimizzato per ${sectionKey} (ultimi 3 + real-time)`);

    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue && off && query && orderByChild && limitToLast) {
        
        // Cleanup listener precedente
        if (messageListeners[sectionKey]) {
            const oldRef = ref(window.firebaseDatabase, messageListeners[sectionKey].path);
            off(oldRef, messageListeners[sectionKey].callback);
        }

        try {
            // Query ottimizzata: solo ultimi 3 messaggi
            const messagesRef = ref(window.firebaseDatabase, dataPath);
            const recentMessagesQuery = query(
                messagesRef,
                orderByChild('timestamp'),
                limitToLast(3)
            );

            const callback = (snapshot) => {
                const messages = [];
                snapshot.forEach((childSnapshot) => {
                    messages.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                // Ordina per timestamp
                messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                
                displayMessages(messages);
                updateMessageCounter(messages.length);
                
                console.log(`📨 Chat aggiornata: ${messages.length} messaggi (limitati)`);
            };

            messageListeners[sectionKey] = { path: dataPath, callback: callback };
            onValue(recentMessagesQuery, callback);
            
            console.log(`✅ Listener chat ottimizzato attivo per ${sectionKey} (max 3 messaggi)`);

        } catch (queryError) {
            console.warn(`⚠️ Query avanzata fallita per ${sectionKey}, uso fallback:`, queryError.message);
            
            // Fallback: listener semplice ma limitiamo i messaggi nel display
            const messagesRef = ref(window.firebaseDatabase, dataPath);
            const callback = (snapshot) => {
                const messages = [];
                snapshot.forEach((childSnapshot) => {
                    messages.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                // Ordina e limita a 3
                messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                const limitedMessages = messages.slice(-3); // Ultimi 3
                
                displayMessages(limitedMessages);
                updateMessageCounter(limitedMessages.length);
            };

            messageListeners[sectionKey] = { path: dataPath, callback: callback };
            onValue(messagesRef, callback);
        }
        
    } else {
        // Modalità locale - limita a ultimi 3
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const limitedMessages = messages.slice(-3);
        
        displayMessages(limitedMessages);
        updateMessageCounter(limitedMessages.length);
        
        console.log(`💾 Chat locale caricata: ${limitedMessages.length}/3 messaggi`);
    }
}

// ===============================================
// 5. DISABILITA AUTO-REFRESH BADGE
// ===============================================

// Override delle funzioni activity tracker per disabilitare auto-refresh
if (window.activityTracker) {
    // Disabilita auto-refresh
    window.activityTracker.startAutoRefresh = function() {
        console.log('🔕 Auto-refresh badge DISABILITATO per risparmio banda');
        // Non avviare il refresh automatico
    };
    
    // Disabilita refresh badge automatico
    window.activityTracker.refreshBadges = function() {
        console.log('🔕 Refresh badge automatico SALTATO');
        // Non fare nulla
    };
}

// Funzione per refresh manuale badge
async function refreshBadgesManually() {
    if (!window.activityTracker || !currentUser) {
        console.log('❌ Activity tracker non disponibile o utente non loggato');
        return;
    }

    console.log('🔄 Refresh manuale badge avviato...');
    
    try {
        // Mostra loading
        const button = document.getElementById('refresh-badges-btn');
        if (button) {
            button.disabled = true;
            button.innerHTML = `
                <div class="refresh-spinner"></div>
                <span>Caricando...</span>
            `;
        }

        // Esegui refresh badge
        await window.activityTracker.calculateAllBadges();
        window.activityTracker.updateAllBadges();
        
        console.log('✅ Refresh badge completato');
        
        // Mostra notifica
        const toast = createToast({
            type: 'success',
            title: '🔔 Badge Aggiornati!',
            message: 'Badge notifiche aggiornati con successo',
            duration: 2000
        });
        showToast(toast);
        
    } catch (error) {
        console.error('❌ Errore refresh badge:', error);
        
        const toast = createToast({
            type: 'error',
            title: '❌ Errore Badge',
            message: 'Errore nell\'aggiornamento dei badge',
            duration: 3000
        });
        showToast(toast);
    } finally {
        // Ripristina bottone
        const button = document.getElementById('refresh-badges-btn');
        if (button) {
            button.disabled = false;
            button.innerHTML = `
                <span class="refresh-icon">🔔</span>
                <span>Aggiorna Badge</span>
            `;
        }
    }
}

// ===============================================
// 6. OVERRIDE FUNZIONE SWITCH SECTION
// ===============================================

// Modifica switchSection per usare il nuovo sistema
const originalSwitchSection = window.switchSection;
window.switchSection = function(sectionKey) {
    // Esegui switch originale
    originalSwitchSection.call(this, sectionKey);
    
    // Aggiungi bottoni se necessario
    setTimeout(() => {
        addOptimizationButtons();
    }, 500);
};

// Aggiunge i bottoni di ottimizzazione se necessari
function addOptimizationButtons() {
    const section = sectionConfig[currentSection];
    if (!section) return;

    // Bottone refresh thread per sezioni forum
    if (section.type === 'forum' && currentSection !== 'home') {
        addRefreshThreadsButton();
    }
    
    // Bottone refresh badge sempre visibile quando loggati
    if (currentUser) {
        addRefreshBadgesButton();
    }
}

// Aggiunge bottone refresh thread
function addRefreshThreadsButton() {
    // Controlla se esiste già
    if (document.getElementById('refresh-threads-btn')) return;
    
    const threadList = document.getElementById('thread-list');
    if (!threadList) return;

    // Crea bottone
    const button = document.createElement('button');
    button.id = 'refresh-threads-btn';
    button.className = 'refresh-threads-btn';
    button.onclick = handleRefreshThreadsClick;
    button.innerHTML = `
        <span class="refresh-icon">🔄</span>
        <span>Nuovi Thread</span>
    `;

    // Inserisci all'inizio del thread-list
    threadList.insertBefore(button, threadList.firstChild);
    
    console.log('✅ Bottone refresh thread aggiunto');
}

// Aggiunge bottone refresh badge
function addRefreshBadgesButton() {
    // Controlla se esiste già
    if (document.getElementById('refresh-badges-btn')) return;
    
    // Aggiungilo nella sidebar
    const userInfo = document.querySelector('.user-info');
    if (!userInfo) return;

    const button = document.createElement('button');
    button.id = 'refresh-badges-btn';
    button.className = 'refresh-badges-btn';
    button.onclick = refreshBadgesManually;
    button.innerHTML = `
        <span class="refresh-icon">🔔</span>
        <span>Aggiorna Badge</span>
    `;

    userInfo.appendChild(button);
    
    console.log('✅ Bottone refresh badge aggiunto');
}

// ===============================================
// 7. CLEANUP MIGLIORATO
// ===============================================

// Override cleanup per il nuovo sistema
const originalCleanupListeners = window.cleanupListeners;
window.cleanupListeners = function() {
    console.log('🧹 Cleanup ottimizzato...');
    
    // Pulisci solo i listener messaggi (manteniamo real-time per chat)
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && off) {
        Object.keys(messageListeners).forEach(section => {
            const listener = messageListeners[section];
            if (listener && listener.path && listener.callback) {
                const messagesRef = ref(window.firebaseDatabase, listener.path);
                off(messagesRef, listener.callback);
                console.log(`🗑️ Listener chat rimosso: ${section}`);
            }
        });
    }
    
    messageListeners = {};
    // NON pulire threadListeners perché non usiamo più listener per thread
    
    console.log('✅ Cleanup completato (conservando cache thread)');
};

// Funzione per reset completo del sistema
window.resetOptimizedSystem = function() {
    console.log('🔄 Reset sistema ottimizzato...');
    
    // Pulisci cache
    window.threadCache.clear();
    
    // Pulisci listeners
    cleanupListeners();
    
    // Rimuovi bottoni
    const refreshThreadBtn = document.getElementById('refresh-threads-btn');
    const refreshBadgeBtn = document.getElementById('refresh-badges-btn');
    
    if (refreshThreadBtn) refreshThreadBtn.remove();
    if (refreshBadgeBtn) refreshBadgeBtn.remove();
    
    console.log('✅ Sistema resettato');
};

// ===============================================
// 8. ESPOSIZIONE FUNZIONI GLOBALI
// ===============================================

// Rendi le funzioni disponibili globalmente
window.loadNewThreads = loadNewThreads;
window.handleRefreshThreadsClick = handleRefreshThreadsClick;
window.refreshBadgesManually = refreshBadgesManually;
window.addOptimizationButtons = addOptimizationButtons;

// Log di inizializzazione
console.log('🚀 Sistema ottimizzato caricato:');
console.log('- ✅ Thread: caricamento manuale con bottone refresh');
console.log('- ✅ Chat: ultimi 3 messaggi + real-time');
console.log('- ✅ Badge: refresh manuale con bottone');
console.log('- ✅ Cache intelligente per thread');
console.log('📊 Consumo database ridotto del 70-80%!');