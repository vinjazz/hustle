
class UsernameManager {
    constructor() {
        this.isValidating = false;
        this.validationTimeout = null;
        this.pendingUser = null;
        this.maxRetries = 3;
        this.currentRetry = 0;
        this.isModalShowing = false; // Flag per evitare modal multipli
        this.saveInProgress = false;  // Flag per evitare salvataggi multipli
    }

    // Mostra modal con controlli anti-duplicazione
    async showUsernameModal(user, userData = null) {
        console.log('🎯 Mostrando modal username per:', user.email);
        
        // Previeni modal multipli
        if (this.isModalShowing) {
            console.log('⚠️ Modal già in mostra, ignorando richiesta duplicata');
            return;
        }
        
        this.pendingUser = user;
        this.currentRetry = 0;
        this.isModalShowing = true;
        
        try {
            // Nascondi altri modal
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'none';
            }
            
            // Verifica che il modal esista
            const modal = document.getElementById('usernameModal');
            if (!modal) {
                console.error('❌ Modal username non trovato nel DOM');
                throw new Error('Modal username non disponibile');
            }
            
            // Reset completo del modal prima di mostrarlo
            await this.resetModalState();
            
            // Mostra il modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Caricamento clan con timeout
            try {
                await Promise.race([
                    this.loadAvailableClans(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout clan')), 5000))
                ]);
            } catch (clanError) {
                console.warn('⚠️ Errore/timeout caricamento clan (non critico):', clanError);
            }
            
            // Focus con retry
            await this.focusUsernameInputWithRetry();
            
            // Setup listeners
            this.setupUsernameValidation();
            
            console.log('✅ Modal username mostrato con successo');
            
        } catch (error) {
            console.error('❌ Errore mostrando modal username:', error);
            this.isModalShowing = false;
            throw error; // Rilancia per permettere fallback
        }
    }

    // Reset completo dello stato del modal
    async resetModalState() {
        const usernameInput = document.getElementById('usernameInput');
        const clanSelect = document.getElementById('clanSelect');
        const saveBtn = document.getElementById('saveUsernameBtn');
        const errorEl = document.getElementById('usernameError');
        const successEl = document.getElementById('usernameSuccess');
        const loadingEl = document.getElementById('usernameLoading');
        const formEl = document.querySelector('.username-form');
        
        // Reset input
        if (usernameInput) {
            usernameInput.value = '';
            usernameInput.classList.remove('valid', 'invalid');
        }
        
        // Reset select
        if (clanSelect) {
            clanSelect.value = 'Nessuno';
        }
        
        // Reset button
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Conferma Username';
        }
        
        // Reset messaggi
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('show');
        }
        if (successEl) {
            successEl.textContent = '';
            successEl.classList.remove('show');
        }
        
        // Reset loading/form visibility
        if (loadingEl) loadingEl.style.display = 'none';
        if (formEl) formEl.style.display = 'block';
        
        // Reset validazione
        this.updateValidationDisplay('', '');
        this.isValidating = false;
        this.saveInProgress = false;
        
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
            this.validationTimeout = null;
        }
    }

    // Focus con retry automatico
    async focusUsernameInputWithRetry(maxAttempts = 5) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const usernameInput = document.getElementById('usernameInput');
                if (usernameInput) {
                    usernameInput.focus();
                    console.log(`✅ Focus username input riuscito (tentativo ${attempt})`);
                    return;
                }
                throw new Error('Input non trovato');
            } catch (error) {
                console.log(`⚠️ Tentativo focus ${attempt} fallito:`, error.message);
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 200 * attempt));
                }
            }
        }
        console.warn('⚠️ Non è stato possibile focalizzare input username');
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

    // Salva username con protezione anti-duplicazione
    async saveUsername() {
        // Previeni salvataggi multipli
        if (this.saveInProgress) {
            console.log('⚠️ Salvataggio già in corso, ignorando richiesta duplicata');
            return;
        }
        
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
        
        this.saveInProgress = true;
        
        try {
            await this.saveUsernameInternal(username, selectedClan);
        } catch (error) {
            console.error('❌ Errore nel salvataggio:', error);
        } finally {
            this.saveInProgress = false;
        }
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
            
            // UI feedback migliorato
            if (!skipUI && saveBtn && loadingEl && formEl) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Salvando...';
                formEl.style.display = 'none';
                loadingEl.style.display = 'flex';
            }
            
            // Controllo disponibilità solo se non skip
            if (!skipUI) {
                console.log('🔍 Controllo finale disponibilità username...');
                const isAvailable = await this.isUsernameAvailable(username);
                if (!isAvailable) {
                    throw new Error('Username non più disponibile');
                }
            }
            
            // Determina ruolo utente
            const userRole = await this.determineUserRole();
            console.log('👤 Ruolo determinato:', userRole);
            
            // Dati utente più robusti
            const timestamp = Date.now();
            const userData = {
                username: username,
                email: this.pendingUser.email,
                clan: selectedClan === 'Nessuno' ? 'Nessuno' : selectedClan,
                role: userRole,
                createdAt: timestamp,
                lastSeen: timestamp,
                provider: 'google',
                needsUsername: false,
                loginCompleted: true // Flag per tracciare completamento
            };
            
            console.log('📝 Dati utente preparati:', userData);
            
            // Salva nel database con retry
            await this.saveUserDataWithRetry(userData);
            
            // Aggiornamento displayName migliorato
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
            
            // Chiusura e login più sicuri
            this.hideUsernameModal();
            
            // Attendi un momento per permettere la chiusura del modal
            await new Promise(resolve => setTimeout(resolve, 500));
            
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
            }, 1000);
            
        } catch (error) {
            console.error('❌ Errore salvataggio username:', error);
            
            this.currentRetry++;
            
            if (this.currentRetry < this.maxRetries) {
                console.log(`🔄 Tentativo ${this.currentRetry} di ${this.maxRetries}`);
                
                // Mostra messaggio di retry
                this.showUsernameError(`Tentativo ${this.currentRetry}/${this.maxRetries}... Riprovando...`);
                
                // Riprova dopo un delay crescente
                await new Promise(resolve => setTimeout(resolve, 1000 * this.currentRetry));
                return this.saveUsernameInternal(username, selectedClan, skipUI);
            }
            
            // Ripristina form se UI disponibile
            if (!skipUI && saveBtn && loadingEl && formEl) {
                formEl.style.display = 'block';
                loadingEl.style.display = 'none';
                saveBtn.disabled = false;
                saveBtn.textContent = 'Conferma Username';
            }
            
            // Mostra errore
            const errorMsg = `Errore salvataggio (${this.currentRetry}/${this.maxRetries}): ${error.message || error}`;
            this.showUsernameError(errorMsg);
            
            // Se tutti i tentativi falliscono, offri opzioni
            if (this.currentRetry >= this.maxRetries) {
                console.log('🚨 Tutti i tentativi falliti');
                
                setTimeout(() => {
                    const action = confirm(
                        'Impossibile salvare username personalizzato.\n\n' +
                        'Vuoi continuare con username temporaneo?\n\n' +
                        'OK = Continua con username temporaneo\n' +
                        'Annulla = Riprova il salvataggio'
                    );
                    
                    if (action) {
                        // Procedi con username temporaneo
                        console.log('🔄 Procedendo con username temporaneo');
                        this.hideUsernameModal();
                        
                        if (typeof window.fallbackDirectLogin === 'function') {
                            window.fallbackDirectLogin(this.pendingUser);
                        } else if (typeof window.completeUserLogin === 'function') {
                            window.completeUserLogin(this.pendingUser);
                        }
                    } else {
                        // Reset per nuovo tentativo
                        this.currentRetry = 0;
                        this.resetModalState();
                    }
                }, 2000);
            }
        }
    }

    // Salvataggio con retry automatico
    async saveUserDataWithRetry(userData) {
        const maxAttempts = 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
                    typeof window.firebaseImports.ref === 'function' && 
                    typeof window.firebaseImports.set === 'function') {
                    
                    console.log(`💾 Tentativo salvataggio Firebase ${attempt}/${maxAttempts}...`);
                    const { ref, set } = window.firebaseImports;
                    const userRef = ref(window.firebaseDatabase, `users/${this.pendingUser.uid}`);
                    
                    // Timeout per il salvataggio
                    const savePromise = set(userRef, userData);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout salvataggio')), 10000)
                    );
                    
                    await Promise.race([savePromise, timeoutPromise]);
                    console.log('✅ Salvato su Firebase');
                    return; // Successo
                    
                } else {
                    console.log(`💾 Tentativo salvataggio localStorage ${attempt}/${maxAttempts}...`);
                    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                    users[this.pendingUser.email] = {
                        uid: this.pendingUser.uid,
                        ...userData
                    };
                    localStorage.setItem('hc_local_users', JSON.stringify(users));
                    console.log('✅ Salvato in localStorage');
                    return; // Successo
                }
                
            } catch (error) {
                console.warn(`⚠️ Tentativo salvataggio ${attempt} fallito:`, error);
                
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                } else {
                    throw new Error(`Salvataggio fallito dopo ${maxAttempts} tentativi: ${error.message}`);
                }
            }
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
            setTimeout(() => errorEl.classList.remove('show'), 10000); // Più tempo per leggere
        }
        console.error('🚨 Errore username:', message);
    }

    // Chiusura modal migliorata
    hideUsernameModal() {
        const modal = document.getElementById('usernameModal');
        if (modal) {
            modal.style.display = 'none';
        }
        document.body.style.overflow = 'auto';
        
        // Reset stato manager
        this.isModalShowing = false;
        this.saveInProgress = false;
        this.pendingUser = null;
        this.isValidating = false;
        this.currentRetry = 0;
        
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
            this.validationTimeout = null;
        }
        
        console.log('✅ Modal username nascosto e stato resettato');
    }

    // Controllo più robusto se serve username
    async checkUserNeedsUsername(user) {
        if (!user) return false;
        
        try {
            const result = await Promise.race([
                this.checkUserNeedsUsernameInternal(user),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout controllo')), 5000))
            ]);
            
            return result;
        } catch (error) {
            console.error('Errore controllo needsUsername:', error);
            return false; // In caso di errore, assumiamo che non serva
        }
    }

    async checkUserNeedsUsernameInternal(user) {
        if (window.useFirebase && window.firebaseDatabase && window.firebaseImports && 
            typeof window.firebaseImports.ref === 'function' && 
            typeof window.firebaseImports.get === 'function') {
            
            const { ref, get } = window.firebaseImports;
            const userRef = ref(window.firebaseDatabase, `users/${user.uid}`);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                return userData.needsUsername === true || 
                       !userData.username || 
                       userData.username.trim() === '' ||
                       !userData.loginCompleted;
            }
            return true; // Nuovo utente
        } else {
            // Modalità locale
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            const userData = users[user.email];
            
            if (userData) {
                return userData.needsUsername === true || 
                       !userData.username || 
                       userData.username.trim() === '' ||
                       !userData.loginCompleted;
            }
            return true; // Nuovo utente
        }
    }
}

// Istanza globale con protezione
if (!window.usernameManager) {
    window.usernameManager = new UsernameManager();
} else {
    // Reset dell'istanza esistente se necessario
    window.usernameManager.hideUsernameModal();
}

// Funzione globale migliorata
window.saveUsername = function() {
    if (window.usernameManager && typeof window.usernameManager.saveUsername === 'function') {
        window.usernameManager.saveUsername();
    } else {
        console.error('❌ usernameManager non inizializzato o metodo non disponibile');
        alert('Errore nel sistema username. Ricarica la pagina e riprova.');
    }
};

// Export per altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsernameManager;
}