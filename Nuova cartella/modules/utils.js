// utils.js - Utilities generiche

window.Utils = {
    /**
     * Formatta timestamp in stringa leggibile
     * @param {number} timestamp - Timestamp da formattare
     * @returns {string} Stringa formattata
     */
    formatTime(timestamp) {
        if (!timestamp) return 'ora';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'ora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
        if (diff < 2592000000) return `${Math.floor(diff / 86400000)} giorni fa`;
        return date.toLocaleDateString();
    },

    /**
     * Escape HTML per sicurezza
     * @param {string} text - Testo da escapare
     * @returns {string} Testo escapato
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Genera path dati per Firebase/localStorage
     * @param {string} sectionKey - Chiave sezione
     * @param {string} dataType - Tipo di dati (messages/threads/comments)
     * @returns {string|null} Path generato
     */
    getDataPath(sectionKey, dataType) {
        if (sectionKey.startsWith('clan-')) {
            const userClan = this.getCurrentUserClan();
            if (userClan === 'Nessuno') {
                return null;
            }
            const safeClanName = userClan.replace(/[.#$[\]]/g, '_');
            return `${dataType}/clan/${safeClanName}/${sectionKey}`;
        } else {
            return `${dataType}/${sectionKey}`;
        }
    },

    /**
     * Ottieni clan utente corrente
     * @returns {string} Nome clan
     */
    getCurrentUserClan() {
        const clanElement = document.getElementById('currentClan');
        return clanElement ? clanElement.textContent : 'Nessuno';
    },

    /**
     * Ottieni ruolo utente corrente
     * @returns {string} Ruolo utente
     */
    getCurrentUserRole() {
        return window.currentUserData?.role || window.USER_ROLES.USER;
    },

    /**
     * Verifica se l'utente ha un ruolo specifico
     * @param {string} requiredRole - Ruolo richiesto
     * @returns {boolean} True se ha il ruolo
     */
    hasRole(requiredRole) {
        const currentRole = this.getCurrentUserRole();
        if (currentRole === window.USER_ROLES.SUPERUSER) return true;
        if (requiredRole === window.USER_ROLES.CLAN_MOD && currentRole === window.USER_ROLES.CLAN_MOD) return true;
        if (requiredRole === window.USER_ROLES.USER) return true;
        return false;
    },

    /**
     * Verifica se l'utente è moderatore del clan
     * @returns {boolean} True se è moderatore
     */
    isClanModerator() {
        const currentRole = this.getCurrentUserRole();
        const userClan = this.getCurrentUserClan();
        return (currentRole === window.USER_ROLES.CLAN_MOD || currentRole === window.USER_ROLES.SUPERUSER) && userClan !== 'Nessuno';
    },

    /**
     * Verifica se l'utente può moderare una sezione
     * @param {string} sectionKey - Chiave sezione
     * @returns {boolean} True se può moderare
     */
    canModerateSection(sectionKey) {
        const currentRole = this.getCurrentUserRole();
        const userClan = this.getCurrentUserClan();
        
        if (currentRole === window.USER_ROLES.SUPERUSER) return true;
        
        if (sectionKey.startsWith('clan-') && currentRole === window.USER_ROLES.CLAN_MOD) {
            return userClan !== 'Nessuno';
        }
        
        return false;
    },

    /**
     * Verifica se l'utente può accedere a una sezione
     * @param {string} sectionKey - Chiave sezione
     * @returns {boolean} True se può accedere
     */
    canAccessSection(sectionKey) {
        const section = window.SECTION_CONFIG[sectionKey];
        if (!section) return false;
        
        // Controllo accesso clan
        if (sectionKey.startsWith('clan-') && this.getCurrentUserClan() === 'Nessuno') {
            return false;
        }
        
        // Controllo accesso admin (solo superuser)
        if (section.requiredRole === window.USER_ROLES.SUPERUSER && this.getCurrentUserRole() !== window.USER_ROLES.SUPERUSER) {
            return false;
        }
        
        return true;
    },

    /**
     * Ottieni statistiche del forum
     * @returns {object} Oggetto con le statistiche
     */
    getForumStats() {
        let totalThreads = 0;
        let totalMessages = 0;
        let totalUsers = 0;
        let totalClans = 0;

        try {
            if (window.useFirebase) {
                // In modalità Firebase, restituisci valori placeholder
                return {
                    totalThreads: '50+',
                    totalMessages: '200+', 
                    totalUsers: '15+',
                    totalClans: '5+'
                };
            } else {
                // Modalità locale - conta i dati reali
                const sections = ['eventi', 'oggetti', 'novita'];
                sections.forEach(section => {
                    const threads = JSON.parse(localStorage.getItem(`hc_threads_${section}`) || '[]');
                    totalThreads += threads.length;
                });

                const messages = JSON.parse(localStorage.getItem(`hc_messages_chat-generale`) || '[]');
                totalMessages += messages.length;

                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                totalUsers = Object.keys(users).length;

                const clanSet = new Set();
                Object.values(users).forEach(user => {
                    if (user.clan && user.clan !== 'Nessuno') {
                        clanSet.add(user.clan);
                    }
                });
                totalClans = clanSet.size;
            }
        } catch (error) {
            console.error('Errore calcolo statistiche:', error);
        }

        return {
            totalThreads: totalThreads || 0,
            totalMessages: totalMessages || 0,
            totalUsers: totalUsers || 0,
            totalClans: totalClans || 0
        };
    },

    /**
     * Gestione messaggi di errore autenticazione
     * @param {Error} error - Errore da processare
     * @returns {string} Messaggio di errore localizzato
     */
    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Email non valida';
            case 'auth/user-disabled':
                return 'Account disabilitato';
            case 'auth/user-not-found':
                return 'Utente non trovato';
            case 'auth/wrong-password':
                return 'Password errata';
            case 'auth/email-already-in-use':
                return 'Email già in uso';
            case 'auth/weak-password':
                return 'Password troppo debole';
            case 'auth/popup-closed-by-user':
                return 'Login annullato dall\'utente';
            case 'auth/popup-blocked':
                return 'Popup bloccato dal browser. Abilita i popup per questo sito.';
            case 'auth/cancelled-popup-request':
                return 'Popup di login cancellato';
            case 'auth/network-request-failed':
                return 'Errore di connessione. Controlla la tua connessione internet.';
            default:
                return error.message || 'Errore sconosciuto';
        }
    },

    /**
     * Genera ID univoco per elementi
     * @param {string} prefix - Prefisso dell'ID
     * @returns {string} ID univoco
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Debounce function per ottimizzare chiamate frequenti
     * @param {Function} func - Funzione da eseguire
     * @param {number} wait - Millisecondi di attesa
     * @returns {Function} Funzione debounced
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function per limitare chiamate
     * @param {Function} func - Funzione da eseguire
     * @param {number} limit - Millisecondi di limite
     * @returns {Function} Funzione throttled
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Controlla se è dispositivo mobile
     * @returns {boolean} True se mobile
     */
    isMobile() {
        return window.innerWidth <= 768;
    },

    /**
     * Salva ultimo accesso per una sezione
     * @param {string} sectionKey - Chiave sezione
     */
    saveLastSeen(sectionKey) {
        const notificationConfig = window.NOTIFICATION_SECTIONS[sectionKey];
        if (notificationConfig) {
            localStorage.setItem(notificationConfig.storageKey, Date.now().toString());
        }
    },

    /**
     * Ottieni ultimo accesso per una sezione
     * @param {string} sectionKey - Chiave sezione
     * @returns {number} Timestamp ultimo accesso
     */
    getLastSeen(sectionKey) {
        const notificationConfig = window.NOTIFICATION_SECTIONS[sectionKey];
        if (notificationConfig) {
            return parseInt(localStorage.getItem(notificationConfig.storageKey) || '0');
        }
        return 0;
    },

    /**
     * Valida email
     * @param {string} email - Email da validare
     * @returns {boolean} True se valida
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Valida password
     * @param {string} password - Password da validare
     * @returns {object} Oggetto con risultato validazione
     */
    validatePassword(password) {
        const result = {
            valid: true,
            errors: []
        };

        if (password.length < 6) {
            result.valid = false;
            result.errors.push('La password deve essere di almeno 6 caratteri');
        }

        return result;
    },

    /**
     * Carica consigli del giorno
     * @returns {object} Consiglio selezionato
     */
    getDailyTip() {
        const today = new Date().getDate();
        return window.DAILY_TIPS[today % window.DAILY_TIPS.length];
    },

    /**
     * Inizializza storage locale con dati di esempio
     */
    initializeLocalStorage() {
        // Inizializza utenti di esempio se non esistono
        const existingUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        if (Object.keys(existingUsers).length === 0) {
            localStorage.setItem('hc_local_users', JSON.stringify(window.EXAMPLE_USERS));
            console.log('👥 Utenti di esempio inizializzati');
        }

        // Inizializza dati di esempio per le sezioni
        this.initializeExampleData();
    },

    /**
     * Inizializza dati di esempio per le sezioni
     */
    initializeExampleData() {
        // Thread di esempio per sezioni generali
        const sections = ['eventi', 'oggetti', 'novita'];
        sections.forEach(section => {
            const storageKey = `hc_threads_${section}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (threads.length === 0) {
                // Aggiungi thread di esempio se necessario
                localStorage.setItem(storageKey, JSON.stringify([]));
            }
        });

        // Messaggi di esempio per chat generale
        const chatKey = 'hc_messages_chat-generale';
        const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
        if (messages.length === 0) {
            localStorage.setItem(chatKey, JSON.stringify([]));
        }

        // Inizializza dati clan
        this.initializeClanData();
    },

    /**
     * Inizializza dati di esempio per clan
     */
    initializeClanData() {
        const exampleClans = ['Draghi Rossi', 'Leoni Neri', 'Aquile Bianche'];
        exampleClans.forEach(clan => {
            const safeClanName = clan.replace(/[.#$[\]]/g, '_');
            
            // Thread clan
            const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
            clanSections.forEach(section => {
                const storageKey = `hc_threads_clan_${safeClanName}_${section}`;
                const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
                if (threads.length === 0) {
                    localStorage.setItem(storageKey, JSON.stringify([]));
                }
            });

            // Messaggi clan chat
            const chatStorageKey = `hc_messages_clan_${safeClanName}_clan-chat`;
            const chatMessages = JSON.parse(localStorage.getItem(chatStorageKey) || '[]');
            if (chatMessages.length === 0) {
                localStorage.setItem(chatStorageKey, JSON.stringify([]));
            }
        });
    }
};

console.log('🔧 Utils loaded');