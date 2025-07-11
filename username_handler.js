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
        this.isModalShowing = false; // NUOVO: flag per evitare modal multipli
        this.saveInProgress = false;  // NUOVO: flag per evitare salvataggi multipli
    }

    // CORREZIONE 1: Mostra modal con controlli anti-duplicazione
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
            
            // CORREZIONE 2: Reset completo del modal prima di mostrarlo
            await this.resetModalState();
            
            // Mostra il modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // CORREZIONE 3: Caricamento clan con timeout
            try {
                await Promise.race([
                    this.loadAvailableClans(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout clan')), 5000))
                ]);
            } catch (clanError) {
                console.warn('⚠️ Errore/timeout caricamento clan (non critico):', clanError);
            }
            
            // CORREZIONE 4: Focus con retry
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

    // CORREZIONE 5: Reset completo dello stato del modal
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

    // CORREZIONE 6: Focus con retry automatico
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

    // CORREZIONE 7: Salvataggio con protezione anti-duplicazione
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

    // CORREZIONE 8: Logica di salvataggio migliorata
    async saveUsernameInternal(username, selectedClan = 'Nessuno', skipUI = false) {
        const saveBtn = document.getElementById('saveUsernameBtn');
        const loadingEl = document.getElementById('usernameLoading');
        const formEl = document.querySelector('.username-form');
        
        try {
            console.log('💾 Iniziando salvataggio username:', username);
            
            // CORREZIONE 9: UI feedback migliorato
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
            
            // CORREZIONE 10: Dati utente più robusti
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
                loginCompleted: true // NUOVO: flag per tracciare completamento
            };
            
            console.log('📝 Dati utente preparati:', userData);
            
            // Salva nel database con retry
            await this.saveUserDataWithRetry(userData);
            
            // CORREZIONE 11: Aggiornamento displayName migliorato
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
            
            // CORREZIONE 12: Chiusura e login più sicuri
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

    // CORREZIONE 13: Salvataggio con retry automatico
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

    // CORREZIONE 14: Chiusura modal migliorata
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
        
        // Reset form sarà fatto dal prossimo showModal se necessario
        console.log('✅ Modal username nascosto e stato resettato');
    }

    // CORREZIONE 15: Controllo più robusto se serve username
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

    // Resto dei metodi rimangono uguali...
    // (validateUsernameFormat, isUsernameAvailable, etc.)
    
    // CORREZIONE 16: Messaggi di errore più informativi
    showUsernameError(message) {
        const errorEl = document.getElementById('usernameError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 10000); // Più tempo per leggere
        }
        console.error('🚨 Errore username:', message);
    }

    // ... resto dei metodi esistenti senza modifiche ...
}

// Istanza globale con protezione
if (!window.usernameManager) {
    window.usernameManager = new UsernameManager();
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