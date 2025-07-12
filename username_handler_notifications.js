// ===============================================
// USERNAME HANDLER - Gestione Username per utenti Google
// ===============================================

class UsernameManager {
    constructor() {
        this.isValidating = false;
        this.validationTimeout = null;
        this.pendingUser = null;
        this.maxRetries = 3;
        this.currentRetry = 0;
    }

    // Mostra il modal per scegliere username
    async showUsernameModal(user, userData = null) {
        console.log('🎯 Mostrando modal username per:', user.email);
        
        this.pendingUser = user;
        this.currentRetry = 0;
        
        // Nasconde il modal di login
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'none';
        }
        
        // Mostra il modal username
        const modal = document.getElementById('usernameModal');
        if (!modal) {
            console.error('❌ Modal username non trovato nel DOM');
            this.fallbackToDirectLogin(user);
            return;
        }
        
        modal.style.display = 'flex';
        
        // Precompila i clan disponibili
        try {
            await this.loadAvailableClans();
        } catch (error) {
            console.warn('⚠️ Errore caricamento clan:', error);
        }
        
        // Focus sull'input username
        setTimeout(() => {
            const usernameInput = document.getElementById('usernameInput');
            if (usernameInput) {
                usernameInput.focus();
            }
        }, 300);
        
        // Setup listeners
        this.setupUsernameValidation();
        
        // Previeni chiusura accidentale
        document.body.style.overflow = 'hidden';
    }

    // Fallback se il modal non è disponibile
    fallbackToDirectLogin(user) {
        console.log('🔄 Fallback: login diretto senza username personalizzato');
        
        // Usa l'email come username temporaneo
        const tempUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        
        // Simula un salvataggio diretto
        this.pendingUser = user;
        this.saveUsernameDirectly(tempUsername + '_user');
    }

    // Carica i clan disponibili nel select
    async loadAvailableClans() {
        const clanSelect = document.getElementById('clanSelect');
        if (!clanSelect) {
            console.warn('⚠️ Select clan non trovato');
            return;
        }
        
        try {
            const clans = await this.getAvailableClans();
            
            // Pulisci opzioni esistenti tranne "Nessuno"
            clanSelect.innerHTML = '<option value="Nessuno">Nessun clan per ora</option>';
            
            // Aggiungi clan disponibili
            clans.forEach(clan => {
                const option = document.createElement('option');
                option.value = clan;
                option.textContent = `🏰 ${clan}`;
                clanSelect.appendChild(option);
            });
            
        } catch (error) {
            console.warn('Errore caricamento clan:', error);
        }
    }

    // Ottieni clan disponibili
    async getAvailableClans() {
        let clans = [];

        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
                typeof window.firebaseImports.ref === 'function' && 
                typeof window.firebaseImports.get === 'function') {
                
                const { ref, get } = window.firebaseImports;
                const usersRef = ref(window.firebaseDatabase, 'users');
                const snapshot = await get(usersRef);

                if (snapshot.exists()) {
                    const clanSet = new Set();
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        if (userData.clan && userData.clan !== 'Nessuno') {
                            clanSet.add(userData.clan);
                        }
                    });
                    clans = Array.from(clanSet);
                }
            } else {
                // Modalità locale
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                const clanSet = new Set();
                Object.values(users).forEach(user => {
                    if (user.clan && user.clan !== 'Nessuno') {
                        clanSet.add(user.clan);
                    }
                });
                clans = Array.from(clanSet);
            }
        } catch (error) {
            console.error('Errore ottenimento clan:', error);
        }

        return clans.sort();
    }

    // Setup validazione username in tempo reale
    setupUsernameValidation() {
        const usernameInput = document.getElementById('usernameInput');
        const saveBtn = document.getElementById('saveUsernameBtn');
        
        if (!usernameInput || !saveBtn) {
            console.error('❌ Elementi username form non trovati');
            return;
        }
        
        // Rimuovi listener esistenti
        usernameInput.removeEventListener('input', this.handleUsernameInput);
        usernameInput.removeEventListener('keypress', this.handleUsernameKeypress);
        
        // Aggiungi nuovi listener
        usernameInput.addEventListener('input', this.handleUsernameInput.bind(this));
        usernameInput.addEventListener('keypress', this.handleUsernameKeypress.bind(this));
        
        // Reset stato iniziale
        saveBtn.disabled = true;
        this.updateValidationDisplay('', '');
    }

    // Gestisce input username
    handleUsernameInput(event) {
        const username = event.target.value.trim();
        const input = event.target;
        
        // Cancella timeout precedente
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }
        
        // Reset classi
        input.classList.remove('valid', 'invalid');
        
        if (username.length === 0) {
            this.updateValidationDisplay('', '');
            document.getElementById('saveUsernameBtn').disabled = true;
            return;
        }
        
        // Validazione formato immediata
        const formatValid = this.validateUsernameFormat(username);
        if (!formatValid.valid) {
            input.classList.add('invalid');
            this.updateValidationDisplay(formatValid.message, 'invalid');
            document.getElementById('saveUsernameBtn').disabled = true;
            return;
        }
        
        // Mostra stato "controllo"
        this.updateValidationDisplay('🔍 Controllo disponibilità...', 'checking');
        
        // Debounce per controllo unicità
        this.validationTimeout = setTimeout(() => {
            this.checkUsernameAvailability(username);
        }, 500);
    }

    // Gestisce pressione tasti
    handleUsernameKeypress(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const saveBtn = document.getElementById('saveUsernameBtn');
            if (saveBtn && !saveBtn.disabled) {
                this.saveUsername();
            }
        }
    }

    // Valida formato username
    validateUsernameFormat(username) {
        // Lunghezza
        if (username.length < 3) {
            return { valid: false, message: '❌ Username troppo corto (minimo 3 caratteri)' };
        }
        if (username.length > 20) {
            return { valid: false, message: '❌ Username troppo lungo (massimo 20 caratteri)' };
        }
        
        // Caratteri consentiti (lettere, numeri, underscore)
        const validChars = /^[a-zA-Z0-9_]+$/;
        if (!validChars.test(username)) {
            return { valid: false, message: '❌ Solo lettere, numeri e underscore consentiti' };
        }
        
        // Non può iniziare o finire con underscore
        if (username.startsWith('_') || username.endsWith('_')) {
            return { valid: false, message: '❌ Non può iniziare o finire con underscore' };
        }
        
        // Non può essere solo numeri
        if (/^\d+$/.test(username)) {
            return { valid: false, message: '❌ Non può essere composto solo da numeri' };
        }
        
        return { valid: true };
    }

    // Controlla disponibilità username
    async checkUsernameAvailability(username) {
        try {
            this.isValidating = true;
            
            const isAvailable = await this.isUsernameAvailable(username);
            const input = document.getElementById('usernameInput');
            const saveBtn = document.getElementById('saveUsernameBtn');
            
            if (!input || !saveBtn) {
                throw new Error('Elementi form non trovati');
            }
            
            if (isAvailable) {
                input.classList.remove('invalid');
                input.classList.add('valid');
                this.updateValidationDisplay('✅ Username disponibile!', 'valid');
                saveBtn.disabled = false;
            } else {
                input.classList.remove('valid');
                input.classList.add('invalid');
                this.updateValidationDisplay('❌ Username già in uso', 'invalid');
                saveBtn.disabled = true;
            }
            
        } catch (error) {
            console.error('Errore controllo username:', error);
            this.updateValidationDisplay('⚠️ Errore nel controllo. Riprova.', 'invalid');
            const saveBtn = document.getElementById('saveUsernameBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
            }
        } finally {
            this.isValidating = false;
        }
    }

    // Verifica se username è disponibile
    async isUsernameAvailable(username) {
        const lowerUsername = username.toLowerCase();
        
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
                typeof window.firebaseImports.ref === 'function' && 
                typeof window.firebaseImports.get === 'function') {
                
                const { ref, get } = window.firebaseImports;
                const usersRef = ref(window.firebaseDatabase, 'users');
                const snapshot = await get(usersRef);
                
                if (snapshot.exists()) {
                    let found = false;
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        if (userData.username && userData.username.toLowerCase() === lowerUsername) {
                            found = true;
                            return true; // break
                        }
                    });
                    return !found;
                }
                return true;
            } else {
                // Modalità locale
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                const existingUsernames = Object.values(users)
                    .filter(user => user.username)
                    .map(user => user.username.toLowerCase());
                
                return !existingUsernames.includes(lowerUsername);
            }
        } catch (error) {
            console.error('Errore verifica disponibilità username:', error);
            throw error;
        }
    }

    // Aggiorna display validazione
    updateValidationDisplay(message, type) {
        const validationEl = document.getElementById('usernameValidation');
        if (validationEl) {
            validationEl.textContent = message;
            validationEl.className = `username-validation ${type}`;
        }
    }

    // Salva username (versione principale)
    async saveUsername() {
        const usernameInput = document.getElementById('usernameInput');
        const clanSelect = document.getElementById('clanSelect');
        
        if (!usernameInput || !clanSelect) {
            console.error('❌ Elementi form non trovati');
            this.showUsernameError('Errore: form non trovato');
            return;
        }
        
        const username = usernameInput.value.trim();
        const selectedClan = clanSelect.value;
        
        if (!username || this.isValidating) {
            console.log('⚠️ Username vuoto o validazione in corso');
            return;
        }
        
        await this.saveUsernameInternal(username, selectedClan);
    }

    // Salva username direttamente (versione fallback)
    async saveUsernameDirectly(username, clan = 'Nessuno') {
        await this.saveUsernameInternal(username, clan, true);
    }

    // Logica interna di salvataggio
    async saveUsernameInternal(username, selectedClan = 'Nessuno', skipUI = false) {
        const saveBtn = document.getElementById('saveUsernameBtn');
        const loadingEl = document.getElementById('usernameLoading');
        const formEl = document.querySelector('.username-form');
        
        try {
            console.log('💾 Iniziando salvataggio username:', username);
            
            // Mostra loading se UI disponibile
            if (!skipUI && saveBtn && loadingEl && formEl) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Salvando...';
                formEl.style.display = 'none';
                loadingEl.style.display = 'flex';
            }
            
            // Controlla di nuovo la disponibilità (solo se non skip)
            if (!skipUI) {
                const isAvailable = await this.isUsernameAvailable(username);
                if (!isAvailable) {
                    throw new Error('Username non più disponibile');
                }
            }
            
            // Determina ruolo utente
            const userRole = await this.determineUserRole();
            console.log('👤 Ruolo utente determinato:', userRole);
            
            // Prepara dati utente con timestamp sicuro
            const timestamp = Date.now(); // Usa sempre timestamp locale per compatibilità
            const userData = {
                username: username,
                email: this.pendingUser.email,
                clan: selectedClan === 'Nessuno' ? 'Nessuno' : selectedClan,
                role: userRole,
                createdAt: timestamp,
                lastSeen: timestamp,
                provider: 'google',
                needsUsername: false
            };
            
            console.log('📝 Dati utente preparati:', userData);
            
            // Salva nel database
            await this.saveUserData(userData);
            
            // 🆕 NOTIFICA AI SUPERUSER DEL NUOVO UTENTE
            try {
                await this.notifySupersUsersNewUser(userData);
            } catch (notificationError) {
                console.warn('⚠️ Errore invio notifiche ai superuser:', notificationError);
                // Non bloccare la registrazione per errori di notifica
            }
            
            // Aggiorna profilo Firebase Auth se possibile
            try {
                if (window.firebaseImports && typeof window.firebaseImports.updateProfile === 'function') {
                    await window.firebaseImports.updateProfile(this.pendingUser, {
                        displayName: username
                    });
                    console.log('✅ DisplayName Firebase aggiornato');
                }
            } catch (profileError) {
                console.warn('⚠️ Errore aggiornamento displayName (non critico):', profileError);
            }
            
            // Aggiorna dati globali
            window.currentUserData = userData;
            if (window.currentUser) {
                window.currentUser.displayName = username;
            }
            
            console.log('✅ Username salvato con successo');
            
            // Chiudi modal e continua login
            this.hideUsernameModal();
            
            // Completa il login
            if (typeof window.completeUserLogin === 'function') {
                window.completeUserLogin(this.pendingUser);
            } else if (typeof window.handleUserLogin === 'function') {
                window.handleUserLogin(this.pendingUser);
            }
            
            // Notifica successo
            const roleMessage = userRole === (window.USER_ROLES?.SUPERUSER || 'superuser') ? 
                '\n🎉 Ti sono stati assegnati i privilegi di SUPERUSER!' : '';
            
            setTimeout(() => {
                alert(`✅ Username "${username}" salvato con successo!${roleMessage}`);
            }, 500);
            
        } catch (error) {
            console.error('❌ Errore salvataggio username:', error);
            
            this.currentRetry++;
            
            if (this.currentRetry < this.maxRetries) {
                console.log(`🔄 Tentativo ${this.currentRetry} di ${this.maxRetries}`);
                
                // Riprova dopo un delay
                setTimeout(() => {
                    this.saveUsernameInternal(username, selectedClan, skipUI);
                }, 1000 * this.currentRetry);
                
                return;
            }
            
            // Ripristina form se UI disponibile
            if (!skipUI && saveBtn && loadingEl && formEl) {
                formEl.style.display = 'block';
                loadingEl.style.display = 'none';
                saveBtn.disabled = false;
                saveBtn.textContent = 'Conferma Username';
            }
            
            // Mostra errore
            const errorMsg = `Errore salvataggio (tentativo ${this.currentRetry}/${this.maxRetries}): ${error.message || error}`;
            this.showUsernameError(errorMsg);
            
            // Se tutti i tentativi falliscono, procedi con login diretto
            if (this.currentRetry >= this.maxRetries) {
                console.log('🚨 Tutti i tentativi falliti, procedendo con login diretto');
                this.hideUsernameModal();
                
                if (typeof window.completeUserLogin === 'function') {
                    window.completeUserLogin(this.pendingUser);
                } else if (typeof window.handleUserLogin === 'function') {
                    window.handleUserLogin(this.pendingUser);
                }
            }
        }
    }

    // 🆕 NUOVA FUNZIONE: Notifica i superuser di un nuovo utente
    async notifySupersUsersNewUser(newUserData) {
        console.log('📢 Inviando notifiche ai superuser per nuovo utente:', newUserData.username);
        
        try {
            // Ottieni tutti i superuser
            const superUsers = await this.getSuperUsers();
            console.log('👑 Superuser trovati:', superUsers.length);
            
            if (superUsers.length === 0) {
                console.log('ℹ️ Nessun superuser trovato, skip notifiche');
                return;
            }
            
            // Prepara il messaggio di notifica
            const notificationData = {
                type: 'new_user',
                title: '🆕 Nuovo Utente Registrato',
                message: `${newUserData.username} si è appena registrato`,
                details: {
                    username: newUserData.username,
                    email: newUserData.email,
                    clan: newUserData.clan,
                    provider: newUserData.provider || 'email',
                    registrationTime: new Date().toLocaleString('it-IT')
                },
                timestamp: Date.now(),
                read: false,
                icon: '👤',
                priority: 'normal'
            };
            
            // Invia notifica a tutti i superuser
            const notificationPromises = superUsers.map(superUser => 
                this.sendNotificationToUser(superUser.uid, notificationData)
            );
            
            await Promise.allSettled(notificationPromises);
            console.log('✅ Notifiche inviate a tutti i superuser');
            
        } catch (error) {
            console.error('❌ Errore invio notifiche superuser:', error);
            throw error;
        }
    }

    // 🆕 Ottieni tutti i superuser
    async getSuperUsers() {
        try {
            const allUsers = await this.getAllUsers();
            const superUserRole = window.USER_ROLES?.SUPERUSER || 'superuser';
            
            return allUsers.filter(user => user.role === superUserRole);
        } catch (error) {
            console.error('Errore ottenimento superuser:', error);
            return [];
        }
    }

    // 🆕 Ottieni tutti gli utenti
    async getAllUsers() {
        const users = [];
        
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
                typeof window.firebaseImports.ref === 'function' && 
                typeof window.firebaseImports.get === 'function') {
                
                const { ref, get } = window.firebaseImports;
                const usersRef = ref(window.firebaseDatabase, 'users');
                const snapshot = await get(usersRef);
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        users.push({
                            uid: childSnapshot.key,
                            ...userData
                        });
                    });
                }
            } else {
                // Modalità locale
                const localUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                Object.entries(localUsers).forEach(([email, userData]) => {
                    users.push({
                        email: email,
                        ...userData
                    });
                });
            }
        } catch (error) {
            console.error('Errore ottenimento utenti:', error);
        }
        
        return users;
    }

    // 🆕 Invia notifica a un utente specifico
    async sendNotificationToUser(userUid, notificationData) {
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
                typeof window.firebaseImports.ref === 'function' && 
                typeof window.firebaseImports.push === 'function') {
                
                const { ref, push } = window.firebaseImports;
                const notificationsRef = ref(window.firebaseDatabase, `notifications/${userUid}`);
                await push(notificationsRef, notificationData);
                
                console.log(`✅ Notifica Firebase inviata a ${userUid}`);
            } else {
                // Modalità locale
                const notifications = JSON.parse(localStorage.getItem('hc_local_notifications') || '{}');
                
                if (!notifications[userUid]) {
                    notifications[userUid] = [];
                }
                
                notifications[userUid].push({
                    id: Date.now() + Math.random(),
                    ...notificationData
                });
                
                // Mantieni solo le ultime 50 notifiche per utente
                if (notifications[userUid].length > 50) {
                    notifications[userUid] = notifications[userUid].slice(-50);
                }
                
                localStorage.setItem('hc_local_notifications', JSON.stringify(notifications));
                console.log(`✅ Notifica localStorage inviata a ${userUid}`);
            }
            
            // Se l'utente è attualmente online e corrisponde al userUid, mostra toast
            if (window.currentUser && window.currentUser.uid === userUid) {
                this.showNewUserToast(notificationData);
            }
            
        } catch (error) {
            console.error(`❌ Errore invio notifica a ${userUid}:`, error);
            throw error;
        }
    }

    // 🆕 Mostra toast per nuovo utente (solo se il superuser è online)
    showNewUserToast(notificationData) {
        try {
            // Verifica che il sistema di toast sia disponibile
            if (typeof window.showToast === 'function') {
                window.showToast({
                    title: notificationData.title,
                    message: notificationData.message,
                    type: 'info',
                    icon: notificationData.icon,
                    duration: 5000,
                    actions: [
                        {
                            text: 'Visualizza',
                            action: () => {
                                // Apri pannello notifiche o vai alla gestione utenti
                                if (typeof window.toggleNotificationsPanel === 'function') {
                                    window.toggleNotificationsPanel();
                                }
                            }
                        }
                    ]
                });
            } else if (typeof window.addToast === 'function') {
                // Fallback per sistema toast alternativo
                window.addToast(
                    notificationData.title,
                    notificationData.message,
                    'info',
                    5000
                );
            } else {
                console.log('ℹ️ Sistema toast non disponibile, skip toast nuovo utente');
            }
        } catch (error) {
            console.warn('⚠️ Errore mostra toast nuovo utente:', error);
        }
    }

    // Salva dati utente nel database
    async saveUserData(userData) {
        if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
            typeof window.firebaseImports.ref === 'function' && 
            typeof window.firebaseImports.set === 'function') {
            
            console.log('💾 Salvando su Firebase...');
            const { ref, set } = window.firebaseImports;
            const userRef = ref(window.firebaseDatabase, `users/${this.pendingUser.uid}`);
            await set(userRef, userData);
            console.log('✅ Salvato su Firebase');
            
        } else {
            console.log('💾 Salvando in localStorage...');
            // Modalità locale
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            users[this.pendingUser.email] = {
                uid: this.pendingUser.uid,
                ...userData
            };
            localStorage.setItem('hc_local_users', JSON.stringify(users));
            console.log('✅ Salvato in localStorage');
        }
    }

    // Determina ruolo del nuovo utente
    async determineUserRole() {
        try {
            if (window.useFirebase && window.firebaseDatabase) {
                // In Firebase, per sicurezza, assumiamo sempre USER come ruolo di default
                return window.USER_ROLES?.USER || 'user';
            } else {
                // Modalità locale - controlla se ci sono utenti reali (non di esempio)
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                
                // Filtra solo utenti reali (non quelli di esempio)
                const realUsers = Object.values(users).filter(user =>
                    !user.uid.startsWith('super_admin_') &&
                    !user.uid.startsWith('clan_mod_') &&
                    !user.uid.startsWith('user_'));
                
                if (realUsers.length === 0) {
                    return window.USER_ROLES?.SUPERUSER || 'superuser';
                }
            }
            
            return window.USER_ROLES?.USER || 'user';
        } catch (error) {
            console.error('Errore determinazione ruolo:', error);
            return window.USER_ROLES?.USER || 'user';
        }
    }

    // Mostra errore username
    showUsernameError(message) {
        const errorEl = document.getElementById('usernameError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 8000);
        }
        console.error('🚨 Errore username:', message);
    }

    // Nascondi modal username
    hideUsernameModal() {
        const modal = document.getElementById('usernameModal');
        if (modal) {
            modal.style.display = 'none';
        }
        document.body.style.overflow = 'auto';
        
        // Reset form
        const usernameInput = document.getElementById('usernameInput');
        const clanSelect = document.getElementById('clanSelect');
        const saveBtn = document.getElementById('saveUsernameBtn');
        
        if (usernameInput) usernameInput.value = '';
        if (clanSelect) clanSelect.value = 'Nessuno';
        if (saveBtn) saveBtn.disabled = true;
        
        this.updateValidationDisplay('', '');
        
        // Pulisci stato
        this.pendingUser = null;
        this.isValidating = false;
        this.currentRetry = 0;
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
            this.validationTimeout = null;
        }
    }

    // Controlla se un utente ha bisogno di scegliere username
    async checkUserNeedsUsername(user) {
        if (!user) return false;
        
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
                typeof window.firebaseImports.ref === 'function' && 
                typeof window.firebaseImports.get === 'function') {
                
                const { ref, get } = window.firebaseImports;
                const userRef = ref(window.firebaseDatabase, `users/${user.uid}`);
                const snapshot = await get(userRef);
                
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    return userData.needsUsername === true || !userData.username || userData.username.trim() === '';
                }
                return true; // Nuovo utente
            } else {
                // Modalità locale
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                const userData = users[user.email];
                
                if (userData) {
                    return userData.needsUsername === true || !userData.username || userData.username.trim() === '';
                }
                return true; // Nuovo utente
            }
        } catch (error) {
            console.error('Errore controllo needsUsername:', error);
            return false;
        }
    }
}

// Istanza globale
window.usernameManager = new UsernameManager();

// Funzione globale per salvare username (chiamata dall'onclick nel HTML)
window.saveUsername = function() {
    if (window.usernameManager) {
        window.usernameManager.saveUsername();
    } else {
        console.error('❌ usernameManager non inizializzato');
    }
};

// Export per altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsernameManager;
}