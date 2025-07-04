// chat.js - Gestione chat e messaggi

window.Chat = {
    // Stato della chat
    isInitialized: false,
    listeners: {},
    currentSection: null,
    messageCount: 0,
    typingTimeout: null,
    lastMessageTime: 0,
    
    /**
     * Inizializza il sistema chat
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('💬 Inizializzazione sistema chat...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Sistema chat inizializzato');
    },

    /**
     * Setup event listeners per la chat
     */
    setupEventListeners() {
        // Input messaggi - Enter per inviare
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Indicatore di digitazione
            messageInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }

        // Pulsante invio
        const sendBtn = document.getElementById('send-message-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
    },

    /**
     * Carica messaggi per una sezione
     */
    loadMessages(sectionKey) {
        if (this.currentSection === sectionKey) return;
        
        console.log(`💬 Caricamento messaggi per ${sectionKey}`);
        
        // Pulisci listeners precedenti
        this.cleanupListeners();
        
        this.currentSection = sectionKey;
        const dataPath = Utils.getDataPath(sectionKey, 'messages');
        
        if (!dataPath) {
            this.showAccessDenied();
            return;
        }

        // Aggiorna ultimo accesso per notifiche
        Utils.saveLastSeen(sectionKey);

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            this.loadFirebaseMessages(dataPath, sectionKey);
        } else {
            this.loadLocalMessages(dataPath, sectionKey);
        }
    },

    /**
     * Carica messaggi da Firebase
     */
    loadFirebaseMessages(dataPath, sectionKey) {
        const { ref, onValue, off } = window.firebaseImports;
        const messagesRef = ref(window.firebaseDatabase, dataPath);
        
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
            
            // Ordina per timestamp
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            this.displayMessages(messages);
            this.messageCount = messages.length;
            UI.updateMessageCounter(this.messageCount);
        };

        // Salva listener per cleanup
        this.listeners[sectionKey] = { 
            ref: messagesRef, 
            callback: callback 
        };
        
        onValue(messagesRef, callback);
    },

    /**
     * Carica messaggi da localStorage
     */
    loadLocalMessages(dataPath, sectionKey) {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        this.displayMessages(messages);
        this.messageCount = messages.length;
        UI.updateMessageCounter(this.messageCount);
        
        // Simula real-time updates controllando periodicamente
        if (!this.listeners[sectionKey]) {
            this.listeners[sectionKey] = {
                interval: setInterval(() => {
                    this.loadLocalMessages(dataPath, sectionKey);
                }, 5000) // Controlla ogni 5 secondi
            };
        }
    },

    /**
     * Mostra messaggio di accesso negato
     */
    showAccessDenied() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                    <h3>Accesso Negato</h3>
                    <p>Non hai i permessi per accedere a questa chat.</p>
                    ${this.currentSection && this.currentSection.startsWith('clan-') ? 
                        '<p>Devi appartenere a un clan per accedere alle chat del clan.</p>' : ''}
                </div>
            `;
        }
    },

    /**
     * Visualizza messaggi nella chat
     */
    displayMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 64px; margin-bottom: 20px;">💬</div>
                    <h3 style="color: #8B4513; margin-bottom: 10px;">Nessun messaggio</h3>
                    <p>Sii il primo a iniziare la conversazione!</p>
                </div>
            `;
            return;
        }
        
        // Raggruppa messaggi per data
        const groupedMessages = this.groupMessagesByDate(messages);
        
        let html = '';
        
        Object.entries(groupedMessages).forEach(([date, msgs]) => {
            html += `<div class="date-separator">
                <span class="date-label">${this.formatDateLabel(date)}</span>
            </div>`;
            
            msgs.forEach((msg, index) => {
                const prevMsg = index > 0 ? msgs[index - 1] : null;
                const isConsecutive = prevMsg && 
                    prevMsg.authorId === msg.authorId && 
                    (msg.timestamp - prevMsg.timestamp) < 300000; // 5 minuti
                
                html += this.createMessageHTML(msg, isConsecutive);
            });
        });
        
        chatMessages.innerHTML = html;
        
        // Scroll automatico al bottom se l'utente era già vicino al bottom
        this.autoScrollToBottom(chatMessages);
    },

    /**
     * Raggruppa messaggi per data
     */
    groupMessagesByDate(messages) {
        const groups = {};
        
        messages.forEach(msg => {
            const date = new Date(msg.timestamp).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(msg);
        });
        
        return groups;
    },

    /**
     * Formatta etichetta data
     */
    formatDateLabel(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Oggi';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Ieri';
        } else {
            return date.toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    },

    /**
     * Crea HTML per un messaggio
     */
    createMessageHTML(msg, isConsecutive) {
        const isOwnMessage = window.currentUser && msg.authorId === window.currentUser.uid;
        const timeStr = new Date(msg.timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="message ${isOwnMessage ? 'own-message' : ''} ${isConsecutive ? 'consecutive' : ''}">
                ${!isConsecutive ? `
                    <div class="message-author">
                        <span class="author-name">${Utils.escapeHtml(msg.author)}</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                ` : `
                    <span class="message-time-consecutive">${timeStr}</span>
                `}
                <div class="message-content">${this.formatMessageContent(msg.message)}</div>
            </div>
        `;
    },

    /**
     * Formatta contenuto messaggio (link, emoji, etc.)
     */
    formatMessageContent(content) {
        let formatted = Utils.escapeHtml(content);
        
        // Converti URL in link
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Preserva interruzioni di riga
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    },

    /**
     * Auto scroll al bottom se necessario
     */
    autoScrollToBottom(container) {
        const threshold = 100; // pixel dal bottom
        const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
        
        if (isNearBottom) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 10);
        }
    },

    /**
     * Invia messaggio
     */
    async sendMessage() {
        if (!window.currentUser) {
            UI.showError('Devi effettuare l\'accesso per inviare messaggi');
            return;
        }

        // Controlla accesso clan
        if (this.currentSection && this.currentSection.startsWith('clan-') && Utils.getCurrentUserClan() === 'Nessuno') {
            UI.showError('Devi appartenere a un clan per inviare messaggi qui!');
            return;
        }

        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-message-btn');
        
        if (!input || !sendBtn) return;
        
        const message = input.value.trim();
        
        if (!message) {
            input.focus();
            return;
        }

        // Rate limiting: max 1 messaggio ogni 2 secondi
        const now = Date.now();
        if (now - this.lastMessageTime < 2000) {
            UI.showError('Aspetta un momento prima di inviare un altro messaggio');
            return;
        }

        // Controlla lunghezza messaggio
        if (message.length > 1000) {
            UI.showError('Il messaggio è troppo lungo (massimo 1000 caratteri)');
            return;
        }

        // Disabilita input durante invio
        input.disabled = true;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Invio...';

        try {
            const messageData = {
                author: window.currentUser.displayName || 'Utente',
                authorId: window.currentUser.uid,
                message: message,
                timestamp: window.useFirebase ? window.firebaseImports.serverTimestamp() : Date.now()
            };

            const dataPath = Utils.getDataPath(this.currentSection, 'messages');
            if (!dataPath) {
                throw new Error('Percorso dati non valido');
            }

            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                await this.sendFirebaseMessage(dataPath, messageData);
            } else {
                this.sendLocalMessage(dataPath, messageData);
            }

            // Pulisci input
            input.value = '';
            this.lastMessageTime = now;
            
            // Aggiorna ultimo accesso
            Utils.saveLastSeen(this.currentSection);
            
        } catch (error) {
            console.error('Errore invio messaggio:', error);
            UI.showError('Errore nell\'invio del messaggio');
        } finally {
            input.disabled = false;
            sendBtn.disabled = false;
            sendBtn.textContent = 'Invia';
            input.focus();
        }
    },

    /**
     * Invia messaggio a Firebase
     */
    async sendFirebaseMessage(dataPath, messageData) {
        const { ref, push } = window.firebaseImports;
        const messagesRef = ref(window.firebaseDatabase, dataPath);
        await push(messagesRef, messageData);
    },

    /**
     * Invia messaggio locale
     */
    sendLocalMessage(dataPath, messageData) {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        messageData.timestamp = Date.now();
        messageData.id = Utils.generateId('msg');
        
        messages.push(messageData);
        localStorage.setItem(storageKey, JSON.stringify(messages));
        
        // Ricarica messaggi per aggiornare la visualizzazione
        this.loadLocalMessages(dataPath, this.currentSection);
    },

    /**
     * Gestisce indicatore di digitazione
     */
    handleTyping() {
        // Cancella timeout precedente
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Mostra indicatore
        this.showTypingIndicator();
        
        // Nascondi dopo 3 secondi di inattività
        this.typingTimeout = setTimeout(() => {
            this.hideTypingIndicator();
        }, 3000);
    },

    /**
     * Mostra indicatore di digitazione
     */
    showTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator && window.currentUser) {
            indicator.textContent = `${window.currentUser.displayName || 'Utente'} sta scrivendo...`;
            indicator.style.display = 'block';
        }
    },

    /**
     * Nascondi indicatore di digitazione
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    },

    /**
     * Pulisci listeners
     */
    cleanupListeners() {
        Object.entries(this.listeners).forEach(([section, listener]) => {
            if (listener.ref && listener.callback && window.firebaseImports) {
                const { off } = window.firebaseImports;
                off(listener.ref, listener.callback);
            } else if (listener.interval) {
                clearInterval(listener.interval);
            }
        });
        
        this.listeners = {};
    },

    /**
     * Esporta chat (per backup/condivisione)
     */
    async exportChat(sectionKey) {
        try {
            const dataPath = Utils.getDataPath(sectionKey, 'messages');
            if (!dataPath) return;

            let messages = [];

            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                const { ref, get } = window.firebaseImports;
                const messagesRef = ref(window.firebaseDatabase, dataPath);
                const snapshot = await get(messagesRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        messages.push(childSnapshot.val());
                    });
                }
            } else {
                const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            }

            messages.sort((a, b) => a.timestamp - b.timestamp);

            // Crea contenuto esportabile
            const exportContent = messages.map(msg => {
                const date = new Date(msg.timestamp).toLocaleString('it-IT');
                return `[${date}] ${msg.author}: ${msg.message}`;
            }).join('\n');

            // Download file
            const blob = new Blob([exportContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat_${sectionKey}_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            UI.showSuccess('Chat esportata con successo!');
        } catch (error) {
            console.error('Errore esportazione chat:', error);
            UI.showError('Errore durante l\'esportazione');
        }
    },

    /**
     * Cerca messaggi
     */
    searchMessages(query, sectionKey = null) {
        const section = sectionKey || this.currentSection;
        if (!section) return [];

        const dataPath = Utils.getDataPath(section, 'messages');
        if (!dataPath) return [];

        let messages = [];
        
        if (window.useFirebase) {
            // In Firebase la ricerca è più complessa, per ora torniamo array vuoto
            // In futuro si potrebbe implementare con Algolia o simili
            return [];
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }

        // Ricerca semplice nel contenuto
        const searchTerm = query.toLowerCase();
        return messages.filter(msg => 
            msg.message.toLowerCase().includes(searchTerm) ||
            msg.author.toLowerCase().includes(searchTerm)
        );
    },

    /**
     * Ottieni statistiche chat
     */
    getStats(sectionKey = null) {
        const section = sectionKey || this.currentSection;
        if (!section) return null;

        const dataPath = Utils.getDataPath(section, 'messages');
        if (!dataPath) return null;

        let messages = [];
        
        if (!window.useFirebase) {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        }

        const userStats = {};
        let totalWords = 0;

        messages.forEach(msg => {
            // Statistiche per utente
            if (!userStats[msg.author]) {
                userStats[msg.author] = {
                    messageCount: 0,
                    wordCount: 0,
                    firstMessage: msg.timestamp,
                    lastMessage: msg.timestamp
                };
            }

            const user = userStats[msg.author];
            user.messageCount++;
            
            const words = msg.message.split(/\s+/).filter(word => word.length > 0);
            user.wordCount += words.length;
            totalWords += words.length;
            
            if (msg.timestamp < user.firstMessage) user.firstMessage = msg.timestamp;
            if (msg.timestamp > user.lastMessage) user.lastMessage = msg.timestamp;
        });

        return {
            totalMessages: messages.length,
            totalWords: totalWords,
            userStats: userStats,
            mostActiveUser: Object.entries(userStats).reduce((a, b) => 
                userStats[a[0]].messageCount > userStats[b[0]].messageCount ? a : b
            )?.[0] || null
        };
    },

    /**
     * Reset chat (per debug/amministrazione)
     */
    resetChat(sectionKey) {
        if (!Utils.hasRole(window.USER_ROLES.SUPERUSER)) {
            UI.showError('Non hai i permessi per questa operazione');
            return;
        }

        if (!confirm('Sei sicuro di voler cancellare tutti i messaggi di questa chat?')) {
            return;
        }

        const dataPath = Utils.getDataPath(sectionKey, 'messages');
        if (!dataPath) return;

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, remove } = window.firebaseImports;
            const messagesRef = ref(window.firebaseDatabase, dataPath);
            remove(messagesRef);
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            localStorage.removeItem(storageKey);
            this.loadLocalMessages(dataPath, sectionKey);
        }

        UI.showSuccess('Chat resettata con successo');
    },

    /**
     * Cleanup del sistema chat
     */
    cleanup() {
        this.cleanupListeners();
        this.hideTypingIndicator();
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        
        this.currentSection = null;
        this.messageCount = 0;
        this.isInitialized = false;
        
        console.log('💬 Chat system cleaned up');
    }
};

// Stili CSS aggiuntivi per messaggi
const chatStyles = `
<style>
.date-separator {
    text-align: center;
    margin: 20px 0;
    position: relative;
}

.date-separator::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(218, 165, 32, 0.3);
}

.date-label {
    background: rgba(255, 255, 255, 0.9);
    color: #8B4513;
    padding: 5px 15px;
    border-radius: 15px;
    font-size: 12px;
    font-weight: bold;
    position: relative;
    z-index: 1;
}

.message.own-message {
    text-align: right;
}

.message.own-message .message-content {
    background: linear-gradient(135deg, #DAA520, #B8860B);
    color: white;
    margin-left: 20%;
}

.message.consecutive {
    margin-top: 2px;
}

.message.consecutive .message-content {
    margin-top: 2px;
}

.message-time-consecutive {
    font-size: 10px;
    color: #999;
    float: right;
    margin-right: 10px;
    margin-top: 2px;
}

.message.own-message .message-time-consecutive {
    float: left;
    margin-left: 10px;
    margin-right: 0;
}

.message-content a {
    color: inherit;
    text-decoration: underline;
}

.message.own-message .message-content a {
    color: rgba(255, 255, 255, 0.9);
}
</style>
`;

// Aggiungi stili al documento
if (!document.querySelector('#chat-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'chat-styles';
    styleElement.innerHTML = chatStyles;
    document.head.appendChild(styleElement);
}

console.log('💬 Chat module loaded');