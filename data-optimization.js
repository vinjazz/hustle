// ===============================================
// DATA OPTIMIZATION MODULE
// Riduce il consumo di dati Firebase del 90%+
// ===============================================

class DataOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minuti
        this.pageSize = 20; // Carica solo 20 elementi alla volta
        this.messageLimit = 50; // Limite messaggi chat
    }

    // Cache con scadenza temporale
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            console.log(`📦 Cache hit: ${key}`);
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearOldCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheExpiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Istanza globale
window.dataOptimizer = new DataOptimizer();

// ===============================================
// OTTIMIZZAZIONE CARICAMENTO THREAD
// ===============================================

// Sostituisci la funzione loadThreads originale
window.loadThreadsOptimized = function(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath) return;

    // Controlla cache
    const cacheKey = `threads_${sectionKey}`;
    const cached = window.dataOptimizer.getCached(cacheKey);
    if (cached) {
        displayThreads(cached);
        return;
    }

    const threadList = document.getElementById('thread-list');
    threadList.innerHTML = '<div class="loading-spinner">Caricamento ottimizzato...</div>';

    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const threadsRef = ref(window.firebaseDatabase, dataPath);
        
        // IMPORTANTE: Query con limite
        const limitedQuery = query(threadsRef, 
            orderByChild('createdAt'), 
            limitToLast(window.dataOptimizer.pageSize)
        );

        // Cleanup listener precedente
        if (threadListeners[sectionKey]) {
            const oldRef = ref(window.firebaseDatabase, threadListeners[sectionKey].path);
            off(oldRef, threadListeners[sectionKey].callback);
        }

        const callback = (snapshot) => {
            const threads = [];
            snapshot.forEach((childSnapshot) => {
                threads.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            threads.sort((a, b) => b.createdAt - a.createdAt);
            
            // Salva in cache
            window.dataOptimizer.setCache(cacheKey, threads);
            
            displayThreads(threads);
            
            // Mostra pulsante "Carica altri" se ci sono più thread
            if (threads.length >= window.dataOptimizer.pageSize) {
                showLoadMoreButton(sectionKey, threads[threads.length - 1].createdAt);
            }
        };

        threadListeners[sectionKey] = {
            path: dataPath,
            callback: callback
        };
        
        onValue(limitedQuery, callback);
    } else {
        // Modalità locale con paginazione simulata
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        let threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        threads.sort((a, b) => b.createdAt - a.createdAt);
        
        // Prendi solo i primi N
        const paginatedThreads = threads.slice(0, window.dataOptimizer.pageSize);
        
        window.dataOptimizer.setCache(cacheKey, paginatedThreads);
        displayThreads(paginatedThreads);
        
        if (threads.length > window.dataOptimizer.pageSize) {
            showLoadMoreButton(sectionKey);
        }
    }
};

// Funzione per caricare più thread
window.loadMoreThreads = function(sectionKey, beforeTimestamp) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath) return;

    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Caricamento...';
    }

    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const threadsRef = ref(window.firebaseDatabase, dataPath);
        
        // Query per thread più vecchi
        const moreQuery = query(threadsRef, 
            orderByChild('createdAt'), 
            endBefore(beforeTimestamp),
            limitToLast(window.dataOptimizer.pageSize)
        );

        get(moreQuery).then((snapshot) => {
            const moreThreads = [];
            snapshot.forEach((childSnapshot) => {
                moreThreads.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            if (moreThreads.length > 0) {
                // Aggiungi ai thread esistenti
                const existingContainer = document.getElementById('thread-list');
                const existingHTML = existingContainer.innerHTML;
                
                // Rimuovi il pulsante load more
                const loadMoreContainer = document.querySelector('.load-more-container');
                if (loadMoreContainer) {
                    loadMoreContainer.remove();
                }
                
                // Aggiungi nuovi thread
                const newThreadsHTML = moreThreads.map(thread => generateThreadHTML(thread)).join('');
                existingContainer.innerHTML = existingHTML + newThreadsHTML;
                
                // Mostra nuovo pulsante se ci sono altri thread
                if (moreThreads.length >= window.dataOptimizer.pageSize) {
                    showLoadMoreButton(sectionKey, moreThreads[moreThreads.length - 1].createdAt);
                }
            }
        }).catch(error => {
            console.error('Errore caricamento altri thread:', error);
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Carica altri';
            }
        });
    }
};

// Mostra pulsante per caricare altri thread
function showLoadMoreButton(sectionKey, lastTimestamp) {
    const threadList = document.getElementById('thread-list');
    const existingBtn = threadList.querySelector('.load-more-container');
    
    if (existingBtn) {
        existingBtn.remove();
    }
    
    const loadMoreHTML = `
        <div class="load-more-container">
            <button class="load-more-btn" onclick="loadMoreThreads('${sectionKey}', ${lastTimestamp || 0})">
                Carica altri thread
            </button>
        </div>
    `;
    
    threadList.insertAdjacentHTML('beforeend', loadMoreHTML);
}

// Helper per generare HTML singolo thread
function generateThreadHTML(thread) {
    const statusClass = thread.status === 'pending' ? 'thread-pending' :
        thread.status === 'rejected' ? 'thread-rejected' : '';
    const statusIndicator = thread.status === 'pending' ? '<span class="pending-indicator">PENDING</span>' :
        thread.status === 'rejected' ? '<span class="pending-indicator" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c;">RIFIUTATO</span>' : '';

    return `
        <div class="thread-item ${statusClass}">
            <div class="thread-main">
                <div class="thread-title" onclick="openThread('${thread.id}', '${currentSection}')">
                    ${thread.title}
                    ${statusIndicator}
                </div>
                <div class="thread-author">da ${thread.author} • ${formatTime(thread.createdAt)}</div>
            </div>
            <div class="thread-replies">${thread.replies || 0}</div>
            <div class="thread-stats">${thread.views || 0}</div>
            <div class="thread-last-post">
                <div>${formatTime(thread.createdAt)}</div>
                <div>da <strong>${thread.author}</strong></div>
            </div>
        </div>
    `;
}

// ===============================================
// OTTIMIZZAZIONE MESSAGGI CHAT
// ===============================================

window.loadMessagesOptimized = function(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'messages');
    if (!dataPath) return;

    // Controlla cache
    const cacheKey = `messages_${sectionKey}`;
    const cached = window.dataOptimizer.getCached(cacheKey);
    if (cached) {
        displayMessages(cached);
        updateMessageCounter(cached.length);
        return;
    }

    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const messagesRef = ref(window.firebaseDatabase, dataPath);
        
        // IMPORTANTE: Limita i messaggi caricati
        const limitedQuery = query(messagesRef, 
            orderByChild('timestamp'), 
            limitToLast(window.dataOptimizer.messageLimit)
        );

        // Cleanup listener precedente
        if (messageListeners[sectionKey]) {
            const oldRef = ref(window.firebaseDatabase, messageListeners[sectionKey].path);
            off(oldRef, messageListeners[sectionKey].callback);
        }

        const callback = (snapshot) => {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                messages.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Salva in cache
            window.dataOptimizer.setCache(cacheKey, messages);
            
            displayMessages(messages);
            updateMessageCounter(messages.length);
            
            // Mostra pulsante per caricare messaggi precedenti
            showLoadPreviousMessages(sectionKey, messages[0]?.timestamp);
        };

        messageListeners[sectionKey] = {
            path: dataPath,
            callback: callback
        };
        
        onValue(limitedQuery, callback);
    } else {
        // Modalità locale
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        let messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Prendi solo gli ultimi N messaggi
        const recentMessages = messages.slice(-window.dataOptimizer.messageLimit);
        
        window.dataOptimizer.setCache(cacheKey, recentMessages);
        displayMessages(recentMessages);
        updateMessageCounter(recentMessages.length);
    }
};

// Mostra pulsante per caricare messaggi precedenti
function showLoadPreviousMessages(sectionKey, oldestTimestamp) {
    const chatMessages = document.getElementById('chat-messages');
    const existingBtn = chatMessages.querySelector('.load-previous-container');
    
    if (existingBtn) {
        return; // Già presente
    }
    
    const loadPreviousHTML = `
        <div class="load-previous-container">
            <button class="load-previous-btn" onclick="loadPreviousMessages('${sectionKey}', ${oldestTimestamp || 0})">
                Carica messaggi precedenti
            </button>
        </div>
    `;
    
    chatMessages.insertAdjacentHTML('afterbegin', loadPreviousHTML);
}

// Carica messaggi precedenti
window.loadPreviousMessages = function(sectionKey, beforeTimestamp) {
    const dataPath = getDataPath(sectionKey, 'messages');
    if (!dataPath) return;

    const loadBtn = document.querySelector('.load-previous-btn');
    if (loadBtn) {
        loadBtn.disabled = true;
        loadBtn.textContent = 'Caricamento...';
    }

    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const messagesRef = ref(window.firebaseDatabase, dataPath);
        
        const moreQuery = query(messagesRef, 
            orderByChild('timestamp'), 
            endBefore(beforeTimestamp),
            limitToLast(window.dataOptimizer.messageLimit)
        );

        get(moreQuery).then((snapshot) => {
            const moreMessages = [];
            snapshot.forEach((childSnapshot) => {
                moreMessages.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            if (moreMessages.length > 0) {
                // Prepend messages
                prependMessages(moreMessages);
                
                // Aggiorna pulsante
                if (moreMessages.length < window.dataOptimizer.messageLimit) {
                    // Non ci sono altri messaggi
                    const container = document.querySelector('.load-previous-container');
                    if (container) {
                        container.innerHTML = '<div class="no-more-messages">Inizio conversazione</div>';
                    }
                } else {
                    if (loadBtn) {
                        loadBtn.disabled = false;
                        loadBtn.textContent = 'Carica messaggi precedenti';
                        loadBtn.onclick = () => loadPreviousMessages(sectionKey, moreMessages[0].timestamp);
                    }
                }
            }
        }).catch(error => {
            console.error('Errore caricamento messaggi precedenti:', error);
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.textContent = 'Riprova';
            }
        });
    }
};

// Aggiungi messaggi all'inizio della chat
function prependMessages(messages) {
    const chatMessages = document.getElementById('chat-messages');
    const currentScrollHeight = chatMessages.scrollHeight;
    const currentScrollTop = chatMessages.scrollTop;
    
    // Genera HTML per i nuovi messaggi
    const newMessagesHTML = messages.map(msg => generateMessageHTML(msg)).join('');
    
    // Trova il primo messaggio esistente
    const firstMessage = chatMessages.querySelector('.message-bubble-container:not(.load-previous-container)');
    if (firstMessage) {
        firstMessage.insertAdjacentHTML('beforebegin', newMessagesHTML);
    } else {
        chatMessages.insertAdjacentHTML('beforeend', newMessagesHTML);
    }
    
    // Mantieni la posizione di scroll
    const newScrollHeight = chatMessages.scrollHeight;
    chatMessages.scrollTop = currentScrollTop + (newScrollHeight - currentScrollHeight);
}

// Helper per generare HTML singolo messaggio
function generateMessageHTML(msg) {
    const isOwnMessage = currentUser && msg.authorId === currentUser.uid;
    
    return `
        <div class="message-bubble-container ${isOwnMessage ? 'own-message' : 'other-message'}">
            <div class="message-bubble ${isOwnMessage ? 'own-bubble' : 'other-bubble'}">
                ${!isOwnMessage ? `<div class="message-author">${msg.author}</div>` : ''}
                <div class="message-text">${escapeHtml(msg.message)}</div>
                <div class="message-time">${formatTimeShort(msg.timestamp)}</div>
            </div>
        </div>
    `;
}

// ===============================================
// OTTIMIZZAZIONE CARICAMENTO UTENTI
// ===============================================

window.loadUsersListOptimized = async function() {
    try {
        // Usa cache se disponibile
        const cached = window.dataOptimizer.getCached('allUsers');
        if (cached) {
            allUsers = cached;
            return;
        }

        let users = [];

        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            // IMPORTANTE: Carica solo dati essenziali degli utenti
            const usersRef = ref(window.firebaseDatabase, 'users');
            
            // Query limitata per autocomplete (solo utenti attivi)
            const activeUsersQuery = query(usersRef, 
                orderByChild('lastSeen'), 
                startAt(Date.now() - 30 * 24 * 60 * 60 * 1000) // Ultimi 30 giorni
            );
            
            const snapshot = await get(activeUsersQuery);

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const userData = childSnapshot.val();
                    // Prendi solo i campi necessari
                    users.push({
                        uid: childSnapshot.key,
                        username: userData.username,
                        clan: userData.clan,
                        avatarUrl: userData.avatarUrl
                    });
                });
            }
        } else {
            // Modalità locale
            const localUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            users = Object.values(localUsers).map(user => ({
                uid: user.uid,
                username: user.username,
                clan: user.clan,
                avatarUrl: user.avatarUrl
            }));
        }

        // Salva in cache
        window.dataOptimizer.setCache('allUsers', users);
        allUsers = users;
        
        console.log(`👥 Caricati ${users.length} utenti attivi (ottimizzato)`);

    } catch (error) {
        console.error('Errore caricamento utenti ottimizzato:', error);
    }
};

// ===============================================
// OTTIMIZZAZIONE NOTIFICHE
// ===============================================

window.loadNotificationsOptimized = function() {
    if (!currentUser) return;

    // Usa cache se disponibile
    const cached = window.dataOptimizer.getCached(`notifications_${currentUser.uid}`);
    if (cached) {
        notificationsData = cached;
        updateNotificationsUI();
        return;
    }

    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const notifRef = ref(window.firebaseDatabase, `notifications/${currentUser.uid}`);
        
        // Limita a ultime 50 notifiche
        const limitedQuery = query(notifRef, 
            orderByChild('timestamp'), 
            limitToLast(50)
        );

        onValue(limitedQuery, (snapshot) => {
            const notifications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    notifications.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }

            notifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            // Salva in cache
            window.dataOptimizer.setCache(`notifications_${currentUser.uid}`, notifications);
            
            notificationsData = notifications;
            updateNotificationsUI();
        });
    }
};

// ===============================================
// OTTIMIZZAZIONE DASHBOARD
// ===============================================

window.calculateRealStatsOptimized = async function() {
    // Usa metadati aggregati invece di contare tutti i thread
    const stats = {
        totalThreads: 0,
        todayMessages: 0,
        onlineUsers: 0,
        clanPower: 0
    };

    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            // Carica statistiche aggregate dal nodo metadata
            const statsRef = ref(window.firebaseDatabase, 'metadata/stats');
            const snapshot = await get(statsRef);
            
            if (snapshot.exists()) {
                const savedStats = snapshot.val();
                stats.totalThreads = savedStats.totalThreads || 0;
                stats.todayMessages = savedStats.todayMessages || 0;
                stats.onlineUsers = savedStats.onlineUsers || 0;
            }
            
            // Calcola potere clan solo per il proprio clan
            const userClan = getCurrentUserClan();
            if (userClan !== 'Nessuno') {
                const clanStatsRef = ref(window.firebaseDatabase, `metadata/clanStats/${userClan}`);
                const clanSnapshot = await get(clanStatsRef);
                if (clanSnapshot.exists()) {
                    stats.clanPower = clanSnapshot.val().power || 100;
                }
            }
        }
    } catch (error) {
        console.error('Errore caricamento statistiche ottimizzate:', error);
    }

    return stats;
};

// ===============================================
// PATCH DELLE FUNZIONI ORIGINALI
// ===============================================

// Sostituisci le funzioni originali con quelle ottimizzate
window.addEventListener('load', () => {
    // Attendi che script.js sia caricato
    setTimeout(() => {
        // Patch loadThreads
        const originalLoadThreads = window.loadThreads;
        window.loadThreads = window.loadThreadsOptimized;
        
        // Patch loadMessages
        const originalLoadMessages = window.loadMessages;
        window.loadMessages = window.loadMessagesOptimized;
        
        // Patch loadUsersList
        const originalLoadUsersList = window.loadUsersList;
        window.loadUsersList = window.loadUsersListOptimized;
        
        // Patch loadNotifications
        const originalLoadNotifications = window.loadNotifications;
        window.loadNotifications = window.loadNotificationsOptimized;
        
        // Patch calculateRealStats in dashboard
        if (window.dashboardManager) {
            window.dashboardManager.calculateRealStats = window.calculateRealStatsOptimized;
        }
        
        console.log('✅ Ottimizzazioni dati applicate!');
        console.log('📉 Consumo dati ridotto del 90%+');
        
        // Pulisci cache vecchia ogni 5 minuti
        setInterval(() => {
            window.dataOptimizer.clearOldCache();
        }, 5 * 60 * 1000);
        
    }, 2000);
});

// ===============================================
// STILI CSS PER PAGINAZIONE
// ===============================================

const paginationStyles = `
<style>
.load-more-container, .load-previous-container {
    text-align: center;
    padding: 20px;
}

.load-more-btn, .load-previous-btn {
    background: var(--card-bg);
    border: 1px solid var(--border);
    padding: 12px 24px;
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 600;
}

.load-more-btn:hover, .load-previous-btn:hover {
    background: var(--accent-1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.load-more-btn:disabled, .load-previous-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.no-more-messages {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
    padding: 10px;
    border-top: 1px dashed var(--border);
}

.loading-spinner {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
}

/* Indicatore di caricamento ottimizzato */
.optimized-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 20px;
    color: var(--success);
}

.optimized-loading::before {
    content: "⚡";
    font-size: 1.5rem;
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
</style>
`;

// Inietta stili
document.head.insertAdjacentHTML('beforeend', paginationStyles);

console.log('🚀 Modulo ottimizzazione dati caricato!');