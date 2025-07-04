// forum.js - Gestione forum e thread

window.Forum = {
    // Stato del forum
    isInitialized: false,
    listeners: {},
    currentSection: null,
    currentThread: null,
    currentThreadId: null,
    currentThreadSection: null,
    
    /**
     * Inizializza il sistema forum
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('📋 Inizializzazione sistema forum...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Sistema forum inizializzato');
    },

    /**
     * Setup event listeners per il forum
     */
    setupEventListeners() {
        // Thread creation form
        const titleInput = document.getElementById('thread-title-input');
        const contentTextarea = document.getElementById('thread-content-input');
        
        if (titleInput) {
            titleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (contentTextarea) contentTextarea.focus();
                }
            });
        }

        if (contentTextarea) {
            contentTextarea.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.createThread();
                }
            });
        }

        // Comment input
        const commentTextarea = document.getElementById('comment-text');
        if (commentTextarea) {
            commentTextarea.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.addComment();
                }
            });
        }

        // Modal close on click outside
        const modal = document.getElementById('threadCreationModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideThreadCreationModal();
                }
            });
        }
    },

    /**
     * Carica thread per una sezione
     */
    loadThreads(sectionKey) {
        if (this.currentSection === sectionKey) return;
        
        console.log(`📋 Caricamento thread per ${sectionKey}`);
        
        // Pulisci listeners precedenti
        this.cleanupListeners();
        
        this.currentSection = sectionKey;
        const dataPath = Utils.getDataPath(sectionKey, 'threads');
        
        if (!dataPath) {
            this.showAccessDenied();
            return;
        }

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            this.loadFirebaseThreads(dataPath, sectionKey);
        } else {
            this.loadLocalThreads(dataPath, sectionKey);
        }
    },

    /**
     * Carica thread da Firebase
     */
    loadFirebaseThreads(dataPath, sectionKey) {
        const { ref, onValue, off } = window.firebaseImports;
        const threadsRef = ref(window.firebaseDatabase, dataPath);
        
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
            
            // Ordina per data (più recenti prima)
            threads.sort((a, b) => b.createdAt - a.createdAt);
            
            this.displayThreads(threads);
        };

        // Salva listener per cleanup
        this.listeners[sectionKey] = { 
            ref: threadsRef, 
            callback: callback 
        };
        
        onValue(threadsRef, callback);
    },

    /**
     * Carica thread da localStorage
     */
    loadLocalThreads(dataPath, sectionKey) {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        threads.sort((a, b) => b.createdAt - a.createdAt);
        this.displayThreads(threads);
        
        // Simula real-time updates
        if (!this.listeners[sectionKey]) {
            this.listeners[sectionKey] = {
                interval: setInterval(() => {
                    this.loadLocalThreads(dataPath, sectionKey);
                }, 10000) // Controlla ogni 10 secondi
            };
        }
    },

    /**
     * Mostra messaggio di accesso negato
     */
    showAccessDenied() {
        const threadList = document.getElementById('thread-list');
        if (threadList) {
            threadList.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #e74c3c;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
                    <h3>Accesso Negato</h3>
                    <p>Non hai i permessi per accedere a questa sezione.</p>
                </div>
            `;
        }
    },

    /**
     * Visualizza thread nel forum
     */
    displayThreads(threads) {
        const threadList = document.getElementById('thread-list');
        if (!threadList) return;
        
        if (threads.length === 0) {
            threadList.innerHTML = `
                <div class="forum-header">
                    <div>Discussione</div>
                    <div>Risposte</div>
                    <div>Visualizzazioni</div>
                    <div>Ultimo Messaggio</div>
                </div>
                <div style="text-align: center; padding: 60px; color: #666;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📝</div>
                    <h3 style="color: #8B4513; margin-bottom: 10px;">Nessun thread</h3>
                    <p>Sii il primo a creare una discussione!</p>
                    <button onclick="Forum.showThreadCreationModal()" style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(45deg, #DAA520, #B8860B); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">
                        ✍️ Crea il primo thread
                    </button>
                </div>
            `;
            return;
        }
        
        // Filtra thread in base ai permessi
        const visibleThreads = this.filterThreadsByPermissions(threads);
        
        let html = `
            <div class="forum-header">
                <div>Discussione</div>
                <div>Risposte</div>
                <div>Visualizzazioni</div>
                <div>Ultimo Messaggio</div>
            </div>
        `;
        
        html += visibleThreads.map(thread => this.createThreadHTML(thread)).join('');
        
        threadList.innerHTML = html;
    },

    /**
     * Filtra thread in base ai permessi utente
     */
    filterThreadsByPermissions(threads) {
        return threads.filter(thread => {
            // Admin e moderatori vedono tutto
            if (Utils.canModerateSection(this.currentSection)) {
                return true;
            }
            
            // Utenti normali vedono solo thread approvati o i propri thread
            const isOwnThread = window.currentUser && thread.authorId === window.currentUser.uid;
            const isApproved = !thread.status || thread.status === 'approved';
            
            return isApproved || isOwnThread;
        });
    },

    /**
     * Crea HTML per un thread
     */
    createThreadHTML(thread) {
        const isOwnThread = window.currentUser && thread.authorId === window.currentUser.uid;
        const canModerate = Utils.canModerateSection(this.currentSection);
        
        let statusIndicator = '';
        let statusClass = '';
        
        if (thread.status === 'pending') {
            statusIndicator = '<span class="pending-indicator">IN ATTESA</span>';
            statusClass = 'thread-pending';
        } else if (thread.status === 'rejected') {
            statusIndicator = '<span class="pending-indicator rejected">RIFIUTATO</span>';
            statusClass = 'thread-rejected';
        }
        
        let moderationActions = '';
        if (thread.status === 'pending' && canModerate) {
            moderationActions = `
                <div class="moderation-actions">
                    <button class="approve-btn" onclick="Forum.approveThread('${thread.id}', '${this.currentSection}')">
                        ✅ Approva
                    </button>
                    <button class="reject-btn" onclick="Forum.rejectThread('${thread.id}', '${this.currentSection}')">
                        ❌ Rifiuta
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="thread-item ${statusClass}">
                <div class="thread-main">
                    <div class="thread-title" onclick="Forum.openThread('${thread.id}', '${this.currentSection}')">
                        ${Utils.escapeHtml(thread.title)}
                        ${statusIndicator}
                    </div>
                    <div class="thread-author">
                        da ${Utils.escapeHtml(thread.author)} • ${Utils.formatTime(thread.createdAt)}
                    </div>
                    <div class="thread-stats-mobile">
                        <div class="stat">
                            <span>💬</span>
                            <span>${thread.replies || 0}</span>
                        </div>
                        <div class="stat">
                            <span>👁️</span>
                            <span>${thread.views || 0}</span>
                        </div>
                        <div class="stat">
                            <span>🕐</span>
                            <span>${Utils.formatTime(thread.createdAt)}</span>
                        </div>
                    </div>
                    ${moderationActions}
                </div>
                <div class="thread-replies">${thread.replies || 0}</div>
                <div class="thread-stats">${thread.views || 0}</div>
                <div class="thread-last-post">
                    <div>${Utils.formatTime(thread.lastActivity || thread.createdAt)}</div>
                    <div>da <strong>${Utils.escapeHtml(thread.lastAuthor || thread.author)}</strong></div>
                </div>
            </div>
        `;
    },

    /**
     * Mostra modal creazione thread
     */
    showThreadCreationModal() {
        if (!window.currentUser) {
            UI.showError('Devi effettuare l\'accesso per creare thread');
            return;
        }

        // Controlla accesso clan
        if (this.currentSection && this.currentSection.startsWith('clan-') && Utils.getCurrentUserClan() === 'Nessuno') {
            UI.showError('Devi appartenere a un clan per creare thread qui!');
            return;
        }

        const modal = document.getElementById('threadCreationModal');
        const titleInput = document.getElementById('thread-title-input');
        
        if (modal) {
            modal.style.display = 'flex';
            if (titleInput) titleInput.focus();
        }
    },

    /**
     * Nascondi modal creazione thread
     */
    hideThreadCreationModal() {
        const modal = document.getElementById('threadCreationModal');
        const titleInput = document.getElementById('thread-title-input');
        const contentInput = document.getElementById('thread-content-input');
        
        if (modal) {
            modal.style.display = 'none';
        }
        
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
    },

    /**
     * Crea nuovo thread
     */
    async createThread() {
        const titleInput = document.getElementById('thread-title-input');
        const contentInput = document.getElementById('thread-content-input');
        
        if (!titleInput || !contentInput) return;
        
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        
        if (!title || !content) {
            UI.showError('Inserisci sia il titolo che il contenuto del thread');
            return;
        }

        if (title.length > 200) {
            UI.showError('Il titolo è troppo lungo (massimo 200 caratteri)');
            return;
        }

        if (content.length > 5000) {
            UI.showError('Il contenuto è troppo lungo (massimo 5000 caratteri)');
            return;
        }

        const createBtn = document.querySelector('.btn-create-thread');
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'Creazione...';
        }

        try {
            const threadData = {
                title: title,
                content: content,
                author: window.currentUser.displayName || 'Utente',
                authorId: window.currentUser.uid,
                replies: 0,
                views: 0,
                lastActivity: Date.now(),
                lastAuthor: window.currentUser.displayName || 'Utente'
            };

            // Determina se il thread ha bisogno di approvazione
            const needsApproval = this.currentSection && this.currentSection.startsWith('clan-') && 
                                  !Utils.canModerateSection(this.currentSection);
            
            threadData.status = needsApproval ? 'pending' : 'approved';

            const dataPath = Utils.getDataPath(this.currentSection, 'threads');
            if (!dataPath) {
                throw new Error('Percorso dati non valido');
            }

            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                await this.createFirebaseThread(dataPath, threadData);
            } else {
                this.createLocalThread(dataPath, threadData);
            }

            this.hideThreadCreationModal();
            
            if (needsApproval) {
                UI.showSuccess('Thread creato! È in attesa di approvazione da parte del moderatore del clan.');
            } else {
                UI.showSuccess('Thread creato con successo!');
            }
            
        } catch (error) {
            console.error('Errore creazione thread:', error);
            UI.showError('Errore nella creazione del thread');
        } finally {
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'Crea Thread';
            }
        }
    },

    /**
     * Crea thread su Firebase
     */
    async createFirebaseThread(dataPath, threadData) {
        const { ref, push, serverTimestamp } = window.firebaseImports;
        const threadsRef = ref(window.firebaseDatabase, dataPath);
        
        threadData.createdAt = serverTimestamp();
        threadData.lastActivity = serverTimestamp();
        
        await push(threadsRef, threadData);
    },

    /**
     * Crea thread locale
     */
    createLocalThread(dataPath, threadData) {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        threadData.createdAt = Date.now();
        threadData.id = Utils.generateId('thread');
        
        threads.push(threadData);
        localStorage.setItem(storageKey, JSON.stringify(threads));
        
        // Ricarica thread
        this.loadLocalThreads(dataPath, this.currentSection);
    },

    /**
     * Apri thread per visualizzazione
     */
    async openThread(threadId, section) {
        if (!window.currentUser) {
            UI.showError('Devi effettuare l\'accesso per visualizzare i thread');
            return;
        }

        try {
            // Trova il thread
            const thread = await this.getThread(threadId, section);
            if (!thread) {
                UI.showError('Thread non trovato');
                return;
            }

            // Controlla permessi
            if (!this.canAccessThread(thread)) {
                UI.showError('Non hai i permessi per visualizzare questo thread');
                return;
            }

            // Aggiorna visualizzazioni
            await this.incrementThreadViews(threadId, section);

            // Salva riferimenti
            this.currentThread = thread;
            this.currentThreadId = threadId;
            this.currentThreadSection = section;

            // Mostra vista thread
            UI.showContent('thread');

            // Popola dati thread
            this.populateThreadView(thread);

            // Carica commenti
            this.loadThreadComments(threadId, section);

        } catch (error) {
            console.error('Errore apertura thread:', error);
            UI.showError('Errore nell\'apertura del thread');
        }
    },

    /**
     * Controlla se l'utente può accedere al thread
     */
    canAccessThread(thread) {
        // Admin e moderatori possono vedere tutto
        if (Utils.canModerateSection(this.currentThreadSection)) {
            return true;
        }
        
        // Proprietario del thread può sempre vederlo
        if (window.currentUser && thread.authorId === window.currentUser.uid) {
            return true;
        }
        
        // Altri utenti solo se approvato
        return !thread.status || thread.status === 'approved';
    },

    /**
     * Popola la vista thread
     */
    populateThreadView(thread) {
        const titleEl = document.getElementById('thread-title');
        const authorEl = document.getElementById('thread-author');
        const dateEl = document.getElementById('thread-date');
        const viewsEl = document.getElementById('thread-views');
        const contentEl = document.getElementById('thread-content');
        
        if (titleEl) titleEl.textContent = thread.title;
        if (authorEl) authorEl.textContent = thread.author;
        if (dateEl) dateEl.textContent = Utils.formatTime(thread.createdAt);
        if (viewsEl) viewsEl.textContent = `${thread.views || 0} visualizzazioni`;
        if (contentEl) contentEl.textContent = thread.content || 'Nessun contenuto disponibile';
    },

    /**
     * Torna al forum
     */
    backToForum() {
        // Nasconde vista thread
        UI.showContent(window.SECTION_CONFIG[this.currentSection]?.type || 'forum');
        
        // Pulisci dati thread
        this.currentThread = null;
        this.currentThreadId = null;
        this.currentThreadSection = null;
        
        // Ricarica contenuto se necessario
        if (this.currentSection && window.SECTION_CONFIG[this.currentSection]) {
            const section = window.SECTION_CONFIG[this.currentSection];
            if (section.type === 'forum') {
                this.loadThreads(this.currentSection);
            }
        }
    },

    /**
     * Ottieni thread per ID
     */
    async getThread(threadId, section) {
        const dataPath = Utils.getDataPath(section, 'threads');
        if (!dataPath) return null;

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, get } = window.firebaseImports;
            const threadRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
            const snapshot = await get(threadRef);
            return snapshot.exists() ? { id: threadId, ...snapshot.val() } : null;
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return threads.find(t => t.id === threadId) || null;
        }
    },

    /**
     * Incrementa visualizzazioni thread
     */
    async incrementThreadViews(threadId, section) {
        const dataPath = Utils.getDataPath(section, 'threads');
        if (!dataPath) return;

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, update } = window.firebaseImports;
            const updates = {};
            updates[`${dataPath}/${threadId}/views`] = (this.currentThread?.views || 0) + 1;
            await update(ref(window.firebaseDatabase), updates);
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const threadIndex = threads.findIndex(t => t.id === threadId);
            
            if (threadIndex !== -1) {
                threads[threadIndex].views = (threads[threadIndex].views || 0) + 1;
                localStorage.setItem(storageKey, JSON.stringify(threads));
            }
        }
    },

    /**
     * Carica commenti thread
     */
    loadThreadComments(threadId, section) {
        const dataPath = Utils.getDataPath(section, 'comments');
        if (!dataPath) return;

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, onValue } = window.firebaseImports;
            const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
            
            onValue(commentsRef, (snapshot) => {
                const comments = [];
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        comments.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                }
                
                comments.sort((a, b) => a.timestamp - b.timestamp);
                this.displayThreadComments(comments);
            });
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
            const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
            comments.sort((a, b) => a.timestamp - b.timestamp);
            this.displayThreadComments(comments);
        }
    },

    /**
     * Mostra commenti thread
     */
    displayThreadComments(comments) {
        const commentsContainer = document.getElementById('thread-comments');
        if (!commentsContainer) return;
        
        if (comments.length === 0) {
            commentsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 15px;">💬</div>
                    <h4 style="color: #8B4513; margin-bottom: 10px;">Nessun commento</h4>
                    <p>Sii il primo a commentare questo thread!</p>
                </div>
            `;
            return;
        }
        
        commentsContainer.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author">${Utils.escapeHtml(comment.author)}</span>
                    <span class="comment-time">${Utils.formatTime(comment.timestamp)}</span>
                </div>
                <div class="comment-content">${this.formatCommentContent(comment.content)}</div>
            </div>
        `).join('');
        
        // Scroll al bottom
        commentsContainer.scrollTop = commentsContainer.scrollHeight;
    },

    /**
     * Formatta contenuto commento
     */
    formatCommentContent(content) {
        let formatted = Utils.escapeHtml(content);
        
        // Converti URL in link
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Preserva interruzioni di riga
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    },

    /**
     * Aggiungi commento
     */
    async addComment() {
        if (!window.currentUser) {
            UI.showError('Devi effettuare l\'accesso per commentare');
            return;
        }

        const commentTextarea = document.getElementById('comment-text');
        if (!commentTextarea) return;
        
        const commentText = commentTextarea.value.trim();
        if (!commentText) {
            UI.showError('Scrivi un commento prima di inviare');
            return;
        }

        if (commentText.length > 2000) {
            UI.showError('Il commento è troppo lungo (massimo 2000 caratteri)');
            return;
        }

        const commentBtn = document.querySelector('.comment-input button');
        if (commentBtn) {
            commentBtn.disabled = true;
            commentBtn.textContent = 'Invio...';
        }

        try {
            const commentData = {
                author: window.currentUser.displayName || 'Utente',
                authorId: window.currentUser.uid,
                content: commentText,
                threadId: this.currentThreadId
            };

            const dataPath = Utils.getDataPath(this.currentThreadSection, 'comments');
            if (!dataPath) {
                throw new Error('Percorso dati non valido');
            }

            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                await this.addFirebaseComment(dataPath, commentData);
            } else {
                this.addLocalComment(dataPath, commentData);
            }

            // Pulisci input
            commentTextarea.value = '';
            
            // Aggiorna contatore risposte e ultima attività del thread
            await this.updateThreadActivity();
            
        } catch (error) {
            console.error('Errore invio commento:', error);
            UI.showError('Errore nell\'invio del commento');
        } finally {
            if (commentBtn) {
                commentBtn.disabled = false;
                commentBtn.textContent = 'Commenta';
            }
        }
    },

    /**
     * Aggiungi commento a Firebase
     */
    async addFirebaseComment(dataPath, commentData) {
        const { ref, push, serverTimestamp } = window.firebaseImports;
        const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${this.currentThreadId}`);
        
        commentData.timestamp = serverTimestamp();
        await push(commentsRef, commentData);
    },

    /**
     * Aggiungi commento locale
     */
    addLocalComment(dataPath, commentData) {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${this.currentThreadId}`;
        const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        commentData.timestamp = Date.now();
        commentData.id = Utils.generateId('comment');
        
        comments.push(commentData);
        localStorage.setItem(storageKey, JSON.stringify(comments));
        
        // Ricarica commenti
        this.loadThreadComments(this.currentThreadId, this.currentThreadSection);
    },

    /**
     * Aggiorna attività thread dopo nuovo commento
     */
    async updateThreadActivity() {
        if (!this.currentThreadId || !this.currentThreadSection) return;
        
        const dataPath = Utils.getDataPath(this.currentThreadSection, 'threads');
        if (!dataPath) return;

        const updates = {
            replies: (this.currentThread?.replies || 0) + 1,
            lastActivity: Date.now(),
            lastAuthor: window.currentUser.displayName || 'Utente'
        };

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, update } = window.firebaseImports;
            const updateData = {};
            Object.entries(updates).forEach(([key, value]) => {
                updateData[`${dataPath}/${this.currentThreadId}/${key}`] = 
                    key === 'lastActivity' ? window.firebaseImports.serverTimestamp() : value;
            });
            await update(ref(window.firebaseDatabase), updateData);
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const threadIndex = threads.findIndex(t => t.id === this.currentThreadId);
            
            if (threadIndex !== -1) {
                Object.assign(threads[threadIndex], updates);
                localStorage.setItem(storageKey, JSON.stringify(threads));
            }
        }
        
        // Aggiorna thread corrente
        if (this.currentThread) {
            Object.assign(this.currentThread, updates);
        }
    },

    /**
     * Approva thread (per moderatori)
     */
    async approveThread(threadId, section) {
        try {
            await this.updateThreadStatus(threadId, section, 'approved');
            UI.showSuccess('Thread approvato con successo!');
            this.loadThreads(section);
        } catch (error) {
            console.error('Errore approvazione thread:', error);
            UI.showError('Errore nell\'approvazione del thread');
        }
    },

    /**
     * Rifiuta thread (per moderatori)
     */
    async rejectThread(threadId, section) {
        const reason = prompt('Motivo del rifiuto (opzionale):');
        
        try {
            await this.updateThreadStatus(threadId, section, 'rejected', reason);
            UI.showSuccess('Thread rifiutato');
            this.loadThreads(section);
        } catch (error) {
            console.error('Errore rifiuto thread:', error);
            UI.showError('Errore nel rifiuto del thread');
        }
    },

    /**
     * Aggiorna status thread
     */
    async updateThreadStatus(threadId, section, status, reason = null) {
        const dataPath = Utils.getDataPath(section, 'threads');
        if (!dataPath) return;

        const updateData = {
            status: status,
            moderatedAt: Date.now(),
            moderatedBy: window.currentUser.displayName || 'Moderatore'
        };

        if (reason) {
            updateData.rejectionReason = reason;
        }

        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, get, set } = window.firebaseImports;
            const threadRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
            const snapshot = await get(threadRef);
            
            if (snapshot.exists()) {
                const existingData = snapshot.val();
                const updatedThread = { ...existingData, ...updateData };
                await set(threadRef, updatedThread);
            }
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const threadIndex = threads.findIndex(t => t.id === threadId);
            
            if (threadIndex !== -1) {
                Object.assign(threads[threadIndex], updateData);
                localStorage.setItem(storageKey, JSON.stringify(threads));
            }
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
     * Cerca thread
     */
    searchThreads(query, sectionKey = null) {
        const section = sectionKey || this.currentSection;
        if (!section) return [];

        const dataPath = Utils.getDataPath(section, 'threads');
        if (!dataPath) return [];

        if (window.useFirebase) {
            // Firebase search non implementata
            return [];
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            const searchTerm = query.toLowerCase();
            return threads.filter(thread => 
                thread.title.toLowerCase().includes(searchTerm) ||
                thread.content.toLowerCase().includes(searchTerm) ||
                thread.author.toLowerCase().includes(searchTerm)
            );
        }
    },

    /**
     * Cleanup del sistema forum
     */
    cleanup() {
        this.cleanupListeners();
        this.currentSection = null;
        this.currentThread = null;
        this.currentThreadId = null;
        this.currentThreadSection = null;
        this.isInitialized = false;
        
        console.log('📋 Forum system cleaned up');
    }
};

console.log('📋 Forum module loaded');