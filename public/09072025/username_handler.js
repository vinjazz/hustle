// ===============================================
// USERNAME HANDLER - Gestione Username per utenti Google
// ===============================================

class UsernameManager {
    constructor() {
        this.isValidating = false;
        this.validationTimeout = null;
        this.pendingUser = null;
    }

    // Mostra il modal per scegliere username
    async showUsernameModal(user, userData = null) {
        console.log('🎯 Mostrando modal username per:', user.email);
        
        this.pendingUser = user;
        
        // Nasconde il modal di login
        document.getElementById('loginModal').style.display = 'none';
        
        // Mostra il modal username
        const modal = document.getElementById('usernameModal');
        modal.style.display = 'flex';
        
        // Precompila i clan disponibili
        await this.loadAvailableClans();
        
        // Focus sull'input username
        setTimeout(() => {
            document.getElementById('usernameInput').focus();
        }, 300);
        
        // Setup listeners
        this.setupUsernameValidation();
        
        // Previeni chiusura accidentale
        document.body.style.overflow = 'hidden';
    }

    // Carica i clan disponibili nel select
    async loadAvailableClans() {
        const clanSelect = document.getElementById('clanSelect');
        
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

        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            try {
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
            } catch (error) {
                console.error('Errore caricamento clan da Firebase:', error);
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

        return clans.sort();
    }

    // Setup validazione username in tempo reale
    setupUsernameValidation() {
        const usernameInput = document.getElementById('usernameInput');
        const saveBtn = document.getElementById('saveUsernameBtn');
        
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
            if (!saveBtn.disabled) {
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
            document.getElementById('saveUsernameBtn').disabled = true;
        } finally {
            this.isValidating = false;
        }
    }

    // Verifica se username è disponibile
    async isUsernameAvailable(username) {
        const lowerUsername = username.toLowerCase();
        
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            try {
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
            } catch (error) {
                console.error('Errore controllo Firebase:', error);
                throw error;
            }
        } else {
            // Modalità locale
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            const existingUsernames = Object.values(users)
                .filter(user => user.username)
                .map(user => user.username.toLowerCase());
            
            return !existingUsernames.includes(lowerUsername);
        }
    }

    // Aggiorna display validazione
    updateValidationDisplay(message, type) {
        const validationEl = document.getElementById('usernameValidation');
        validationEl.textContent = message;
        validationEl.className = `username-validation ${type}`;
    }

    // Salva username
    async saveUsername() {
        const username = document.getElementById('usernameInput').value.trim();
        const selectedClan = document.getElementById('clanSelect').value;
        
        if (!username || this.isValidating) {
            return;
        }
        
        const saveBtn = document.getElementById('saveUsernameBtn');
        const loadingEl = document.getElementById('usernameLoading');
        const formEl = document.querySelector('.username-form');
        
        try {
            // Mostra loading
            saveBtn.disabled = true;
            saveBtn.textContent = 'Salvando...';
            formEl.style.display = 'none';
            loadingEl.style.display = 'flex';
            
            // Controlla di nuovo la disponibilità
            const isAvailable = await this.isUsernameAvailable(username);
            if (!isAvailable) {
                throw new Error('Username non più disponibile');
            }
            
            // Determina ruolo utente
            const userRole = await this.determineUserRole();
            
            // Prepara dati utente
            const userData = {
                username: username,
                email: this.pendingUser.email,
                clan: selectedClan === 'Nessuno' ? 'Nessuno' : selectedClan,
                role: userRole,
                createdAt: window.useFirebase ? serverTimestamp() : Date.now(),
                lastSeen: window.useFirebase ? serverTimestamp() : Date.now(),
                provider: 'google',
                needsUsername: false // Rimuovi il flag
            };
            
            // Salva nel database
            if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
                const userRef = ref(window.firebaseDatabase, `users/${this.pendingUser.uid}`);
                await set(userRef, userData);
                
                // Aggiorna anche il displayName in Firebase Auth
                await updateProfile(this.pendingUser, {
                    displayName: username
                });
            } else {
                // Modalità locale
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                users[this.pendingUser.email] = {
                    uid: this.pendingUser.uid,
                    ...userData
                };
                localStorage.setItem('hc_local_users', JSON.stringify(users));
            }
            
            // Aggiorna dati utente globali
            currentUserData = userData;
            currentUser.displayName = username; // Aggiorna displayName locale
            
            // Chiudi modal e continua login
            this.hideUsernameModal();
            
            // Notifica successo
            const roleMessage = userRole === USER_ROLES.SUPERUSER ? 
                '\n🎉 Ti sono stati assegnati i privilegi di SUPERUSER!' : '';
            
            setTimeout(() => {
                alert(`✅ Username "${username}" salvato con successo!${roleMessage}`);
            }, 500);
            
            console.log('✅ Username salvato con successo:', username);
            
        } catch (error) {
            console.error('Errore salvataggio username:', error);
            
            // Ripristina form
            formEl.style.display = 'block';
            loadingEl.style.display = 'none';
            saveBtn.disabled = false;
            saveBtn.textContent = 'Conferma Username';
            
            // Mostra errore
            this.showUsernameError('Errore nel salvataggio: ' + (error.message || error));
        }
    }

    // Determina ruolo del nuovo utente
    async determineUserRole() {
        try {
            if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
                // In Firebase, per sicurezza, assumiamo sempre USER come ruolo di default
                return USER_ROLES.USER;
            } else {
                // Modalità locale - controlla se ci sono utenti reali (non di esempio)
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                
                // Filtra solo utenti reali (non quelli di esempio)
                const realUsers = Object.values(users).filter(user =>
                    !user.uid.startsWith('super_admin_') &&
                    !user.uid.startsWith('clan_mod_') &&
                    !user.uid.startsWith('user_'));
                
                if (realUsers.length === 0) {
                    return USER_ROLES.SUPERUSER;
                }
            }
            
            return USER_ROLES.USER;
        } catch (error) {
            console.error('Errore determinazione ruolo:', error);
            return USER_ROLES.USER;
        }
    }

    // Mostra errore username
    showUsernameError(message) {
        const errorEl = document.getElementById('usernameError');
        errorEl.textContent = message;
        errorEl.classList.add('show');
        setTimeout(() => errorEl.classList.remove('show'), 5000);
    }

    // Nascondi modal username
    hideUsernameModal() {
        const modal = document.getElementById('usernameModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form
        document.getElementById('usernameInput').value = '';
        document.getElementById('clanSelect').value = 'Nessuno';
        document.getElementById('saveUsernameBtn').disabled = true;
        this.updateValidationDisplay('', '');
        
        // Pulisci stato
        this.pendingUser = null;
        this.isValidating = false;
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
            this.validationTimeout = null;
        }
    }

    // Controlla se un utente ha bisogno di scegliere username
    async checkUserNeedsUsername(user) {
        if (!user) return false;
        
        try {
            if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
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
    window.usernameManager.saveUsername();
};

// Export per altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsernameManager;
}