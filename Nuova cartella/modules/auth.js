// auth.js - Gestione autenticazione

window.Auth = {
    // Stato dell'autenticazione
    isInitialized: false,
    isLoginMode: true,
    
    /**
     * Inizializza il sistema di autenticazione
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('🔐 Inizializzazione sistema autenticazione...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Aggiorna status Firebase nella modal
        this.updateFirebaseStatus();
        
        // Monitora stato autenticazione Firebase
        if (window.useFirebase && window.firebaseAuth && window.firebaseReady) {
            const { onAuthStateChanged } = window.firebaseImports;
            onAuthStateChanged(window.firebaseAuth, (user) => {
                if (user) {
                    window.currentUser = user;
                    this.handleUserLogin(user);
                } else {
                    window.currentUser = null;
                    this.handleUserLogout();
                }
            });
        } else {
            // Modalità locale - controlla se era già loggato
            const savedUser = localStorage.getItem('hc_current_user');
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    window.currentUser = userData;
                    this.handleUserLogin(userData);
                } catch (error) {
                    console.error('Errore caricamento utente salvato:', error);
                    this.handleUserLogout();
                }
            } else {
                this.handleUserLogout();
            }
        }
        
        this.isInitialized = true;
        console.log('✅ Sistema autenticazione inizializzato');
    },

    /**
     * Aggiorna status Firebase nella modal di login
     */
    updateFirebaseStatus() {
        const statusEl = document.getElementById('firebase-status');
        const hintEl = document.getElementById('demo-hint');
        
        if (window.useFirebase && window.firebaseAuth && window.firebaseReady) {
            console.log('✅ Modalità Firebase attiva');
            statusEl.style.background = 'rgba(0, 255, 0, 0.1)';
            statusEl.style.color = '#008800';
            statusEl.textContent = '🔥 Firebase connesso - Configurare regole database per primo superuser';
            hintEl.innerHTML = `🔐 <strong>Primo accesso?</strong><br>
                1. Registrati normalmente (sarai USER)<br>
                2. Configura regole Firebase o usa admin@hustlecastle.com / admin123 (SUPER)<br>
                3. Usa il pannello admin per promuovere il tuo account`;
        } else {
            console.log('⚠️ Modalità locale attiva');
            statusEl.style.background = 'rgba(255, 165, 0, 0.1)';
            statusEl.style.color = '#ff8800';
            statusEl.textContent = '⚠️ Modalità Demo - Login Google non disponibile';
            hintEl.textContent = '💡 Demo: SuperUser (admin@hustlecastle.com / admin123), Clan Mod (mod@draghi.com / mod123), User (player@leoni.com / player123)';
            
            // Nascondi pulsante Google in modalità demo
            const googleBtn = document.getElementById('googleLoginBtn');
            if (googleBtn) {
                googleBtn.style.display = 'none';
            }
        }
    },

    /**
     * Setup event listeners per l'autenticazione
     */
    setupEventListeners() {
        // Form inputs - Enter per submit
        ['email', 'password', 'username'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleSubmit();
                    }
                });
            }
        });

        // Escape per chiudere modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('loginModal');
                if (modal && modal.style.display === 'flex') {
                    // Non chiudere la modal di login con Escape
                    // L'utente deve autenticarsi
                }
            }
        });
    },

    /**
     * Gestisce il login dell'utente
     */
    async handleUserLogin(user) {
        console.log('👤 Utente loggato:', user.email);
        
        try {
            // Carica dati profilo utente
            await this.loadUserProfile(user);
            
            // Nascondi modal login
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'none';
            }
            
            // Aggiorna UI
            this.updateUserInterface();
            
            // Setup presenza utente
            this.setupUserPresence();
            
            // Inizializza notifiche
            Notifications.initialize();
            
            // Aggiorna dashboard se è la sezione corrente
            if (window.currentSection === 'home') {
                setTimeout(() => {
                    if (window.Dashboard && window.Dashboard.load) {
                        window.Dashboard.load();
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Errore gestione login:', error);
            UI.showError('Errore durante il login. Riprova.');
        }
    },

    /**
     * Gestisce il logout dell'utente
     */
    handleUserLogout() {
        console.log('👤 Utente disconnesso');
        
        // Pulisci dati utente
        window.currentUser = null;
        window.currentUserData = null;
        localStorage.removeItem('hc_current_user');
        
        // Pulisci notifiche
        if (Notifications.isInitialized) {
            Notifications.cleanup();
        }
        
        // Reset UI
        this.resetUserInterface();
        
        // Mostra modal login
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'flex';
        }
        
        // Torna alla home se si è in sezione ristretta
        if (window.currentSection && 
            (window.currentSection.startsWith('clan-') || window.currentSection.startsWith('admin-'))) {
            App.switchSection('home');
        }
    },

    /**
     * Carica il profilo utente
     */
    async loadUserProfile(user) {
        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            try {
                const { ref, get } = window.firebaseImports;
                const userRef = ref(window.firebaseDatabase, `users/${user.uid}`);
                const snapshot = await get(userRef);
                
                if (snapshot.exists()) {
                    window.currentUserData = snapshot.val();
                } else {
                    // Utente non esiste nel database, crealo
                    window.currentUserData = {
                        username: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        clan: 'Nessuno',
                        role: window.USER_ROLES.USER,
                        createdAt: Date.now()
                    };
                }
            } catch (error) {
                console.error('Errore caricamento profilo Firebase:', error);
                // Fallback ai dati base dell'utente
                window.currentUserData = {
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    clan: 'Nessuno',
                    role: window.USER_ROLES.USER
                };
            }
        } else {
            // Modalità locale
            this.loadLocalUserProfile(user);
        }
        
        // Aggiorna UI con i dati caricati
        this.updateUserDisplay();
    },

    /**
     * Carica profilo utente in modalità locale
     */
    loadLocalUserProfile(user) {
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        const userData = users[user.email];
        
        if (userData) {
            // Controlla se è il primo utente reale e dovrebbe essere superuser
            const realUsers = Object.values(users).filter(u => 
                !u.uid.startsWith('super_admin_') && 
                !u.uid.startsWith('clan_mod_') && 
                !u.uid.startsWith('user_')
            );
            
            if (realUsers.length > 0 && realUsers[0].uid === userData.uid) {
                if (!userData.role || userData.role === window.USER_ROLES.USER) {
                    userData.role = window.USER_ROLES.SUPERUSER;
                    users[user.email] = userData;
                    localStorage.setItem('hc_local_users', JSON.stringify(users));
                    console.log('🎉 Utente promosso a SUPERUSER:', user.email);
                    
                    setTimeout(() => {
                        alert('🎉 Congratulazioni! Sei stato promosso a SUPERUSER come primo utente registrato!');
                    }, 1000);
                }
            }
            
            window.currentUserData = userData;
        } else {
            // Utente non trovato, crealo come USER
            window.currentUserData = {
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                clan: 'Nessuno',
                role: window.USER_ROLES.USER,
                createdAt: Date.now()
            };
        }
        
        // Salva utente corrente
        localStorage.setItem('hc_current_user', JSON.stringify(user));
    },

    /**
     * Aggiorna la visualizzazione dei dati utente
     */
    updateUserDisplay() {
        const usernameEl = document.getElementById('currentUsername');
        const clanEl = document.getElementById('currentClan');
        const sidebarClanEl = document.getElementById('sidebarClan');
        
        if (usernameEl && window.currentUserData) {
            usernameEl.textContent = window.currentUserData.username || 'Utente';
        }
        
        if (clanEl && window.currentUserData) {
            clanEl.textContent = window.currentUserData.clan || 'Nessuno';
        }
        
        if (sidebarClanEl && window.currentUserData) {
            sidebarClanEl.textContent = window.currentUserData.clan || 'Nessuno';
        }
        
        // Aggiorna badge ruolo
        this.updateUserRoleBadge();
    },

    /**
     * Aggiorna badge ruolo utente
     */
    updateUserRoleBadge() {
        const userNameElement = document.getElementById('currentUsername');
        if (!userNameElement) return;
        
        const existingBadge = userNameElement.querySelector('.user-role');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        const role = Utils.getCurrentUserRole();
        const badge = document.createElement('span');
        badge.className = `user-role role-${role.replace('_', '-')}`;
        
        switch (role) {
            case window.USER_ROLES.SUPERUSER:
                badge.textContent = 'SUPER';
                badge.className = 'user-role role-superuser';
                break;
            case window.USER_ROLES.CLAN_MOD:
                badge.textContent = 'MOD';
                badge.className = 'user-role role-moderator';
                break;
            default:
                badge.textContent = 'USER';
                badge.className = 'user-role role-user';
                break;
        }
        
        userNameElement.appendChild(badge);
    },

    /**
     * Aggiorna interfaccia utente dopo login
     */
    updateUserInterface() {
        const userStatusEl = document.getElementById('userStatus');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (userStatusEl) {
            userStatusEl.className = 'online-indicator';
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
        }
        
        // Aggiorna accesso alle sezioni
        UI.updateClanSectionsAccess();
        UI.updateAdminSectionsAccess();
    },

    /**
     * Reset interfaccia utente dopo logout
     */
    resetUserInterface() {
        const usernameEl = document.getElementById('currentUsername');
        const clanEl = document.getElementById('currentClan');
        const sidebarClanEl = document.getElementById('sidebarClan');
        const userStatusEl = document.getElementById('userStatus');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (usernameEl) {
            usernameEl.textContent = 'Ospite';
            // Rimuovi badge ruolo
            const existingBadge = usernameEl.querySelector('.user-role');
            if (existingBadge) {
                existingBadge.remove();
            }
        }
        
        if (clanEl) clanEl.textContent = 'Nessuno';
        if (sidebarClanEl) sidebarClanEl.textContent = 'Nessuno';
        
        if (userStatusEl) {
            userStatusEl.className = 'offline-indicator';
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        
        // Aggiorna accesso alle sezioni
        UI.updateClanSectionsAccess();
        UI.updateAdminSectionsAccess();
    },

    /**
     * Setup presenza utente (solo Firebase)
     */
    setupUserPresence() {
        if (!window.currentUser || !window.useFirebase || !window.firebaseDatabase || !window.firebaseReady) return;
        
        try {
            const { ref, onDisconnect, set, child, serverTimestamp } = window.firebaseImports;
            
            const userStatusRef = ref(window.firebaseDatabase, `presence/${window.currentUser.uid}`);
            const userRef = ref(window.firebaseDatabase, `users/${window.currentUser.uid}`);
            
            // Quando l'utente si disconnette, imposta offline
            onDisconnect(userStatusRef).set({
                state: 'offline',
                lastSeen: serverTimestamp()
            });
            
            // Aggiorna ultima visita
            set(child(userRef, 'lastSeen'), serverTimestamp());
            
            // Imposta online
            set(userStatusRef, {
                state: 'online',
                lastSeen: serverTimestamp()
            });
        } catch (error) {
            console.error('Errore setup presenza:', error);
        }
    },

    /**
     * Switch modalità login/registrazione
     */
    switchToLogin() {
        this.isLoginMode = true;
        
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const registrationFields = document.getElementById('registrationFields');
        const submitBtn = document.getElementById('submitBtn');
        const googleBtnText = document.getElementById('googleBtnText');
        
        if (loginTab) loginTab.classList.add('active');
        if (registerTab) registerTab.classList.remove('active');
        if (registrationFields) registrationFields.classList.remove('show');
        if (submitBtn) submitBtn.textContent = 'Accedi';
        if (googleBtnText) googleBtnText.textContent = 'Continua con Google';
        
        // Pulisci campi opzionali
        const usernameField = document.getElementById('username');
        if (usernameField) usernameField.value = '';
    },

    /**
     * Switch modalità registrazione
     */
    switchToRegister() {
        this.isLoginMode = false;
        
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const registrationFields = document.getElementById('registrationFields');
        const submitBtn = document.getElementById('submitBtn');
        const googleBtnText = document.getElementById('googleBtnText');
        
        if (registerTab) registerTab.classList.add('active');
        if (loginTab) loginTab.classList.remove('active');
        if (registrationFields) registrationFields.classList.add('show');
        if (submitBtn) submitBtn.textContent = 'Registrati';
        if (googleBtnText) googleBtnText.textContent = 'Registrati con Google';
    },

    /**
     * Gestisce submit del form
     */
    handleSubmit() {
        if (this.isLoginMode) {
            this.handleLogin();
        } else {
            this.handleRegister();
        }
    },

    /**
     * Gestisce il login
     */
    async handleLogin() {
        const emailEl = document.getElementById('email');
        const passwordEl = document.getElementById('password');
        
        if (!emailEl || !passwordEl) return;
        
        const email = emailEl.value;
        const password = passwordEl.value;

        if (!email || !password) {
            UI.showError('Inserisci email e password');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            UI.showError('Email non valida');
            return;
        }

        UI.showLoading(true);
        UI.hideError();

        try {
            if (window.useFirebase && window.firebaseReady) {
                const { signInWithEmailAndPassword } = window.firebaseImports;
                await signInWithEmailAndPassword(window.firebaseAuth, email, password);
                UI.showSuccess('Login effettuato con successo!');
            } else {
                await this.simulateLogin(email, password);
            }
        } catch (error) {
            console.error('Errore login:', error);
            UI.showError(Utils.getErrorMessage(error));
        } finally {
            UI.showLoading(false);
        }
    },

    /**
     * Gestisce la registrazione
     */
    async handleRegister() {
        const emailEl = document.getElementById('email');
        const passwordEl = document.getElementById('password');
        const usernameEl = document.getElementById('username');
        
        if (!emailEl || !passwordEl || !usernameEl) return;
        
        const email = emailEl.value;
        const password = passwordEl.value;
        const username = usernameEl.value;

        if (!email || !password || !username) {
            UI.showError('Inserisci email, password e username');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            UI.showError('Email non valida');
            return;
        }

        const passwordValidation = Utils.validatePassword(password);
        if (!passwordValidation.valid) {
            UI.showError(passwordValidation.errors.join(', '));
            return;
        }

        UI.showLoading(true);
        UI.hideError();

        try {
            const userRole = await this.determineUserRole();
            
            if (window.useFirebase && window.firebaseReady) {
                const { createUserWithEmailAndPassword, updateProfile } = window.firebaseImports;
                const { ref, set, serverTimestamp } = window.firebaseImports;
                
                const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
                const user = userCredential.user;

                await updateProfile(user, { displayName: username });

                await set(ref(window.firebaseDatabase, `users/${user.uid}`), {
                    username: username,
                    email: email,
                    clan: 'Nessuno',
                    role: userRole,
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    provider: 'email'
                });
            } else {
                await this.simulateRegister(email, password, username, userRole);
            }
            
            const roleMessage = userRole === window.USER_ROLES.SUPERUSER ? 
                '\n🎉 Sei il primo utente! Ti sono stati assegnati i privilegi di SUPERUSER.' : '';
            
            UI.showSuccess(`Account creato con successo!${roleMessage}`);
        } catch (error) {
            console.error('Errore registrazione:', error);
            UI.showError(Utils.getErrorMessage(error));
        } finally {
            UI.showLoading(false);
        }
    },

    /**
     * Login con Google
     */
    async handleGoogleLogin() {
        if (!window.useFirebase || !window.firebaseReady || !window.googleProvider) {
            alert('Login con Google non disponibile in modalità demo');
            return;
        }

        const googleBtn = document.getElementById('googleLoginBtn');
        if (googleBtn) {
            googleBtn.disabled = true;
            googleBtn.innerHTML = `
                <div style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                Connessione...
            `;
        }

        try {
            const { signInWithPopup } = window.firebaseImports;
            const { ref, get, set, serverTimestamp } = window.firebaseImports;
            
            const result = await signInWithPopup(window.firebaseAuth, window.googleProvider);
            const user = result.user;
            
            // Verifica se l'utente esiste già nel database
            const userRef = ref(window.firebaseDatabase, `users/${user.uid}`);
            const snapshot = await get(userRef);
            
            if (!snapshot.exists()) {
                // Nuovo utente Google - chiedi dati aggiuntivi
                const username = user.displayName || prompt('Inserisci il tuo username:');
                const clan = prompt('Inserisci il tuo clan (opzionale):') || 'Nessuno';
                
                if (!username) {
                    throw new Error('Username richiesto');
                }
                
                // Salva i dati utente
                await set(userRef, {
                    username: username,
                    email: user.email,
                    clan: clan,
                    role: window.USER_ROLES.USER,
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    provider: 'google'
                });
            }
            
            UI.showSuccess('Login con Google effettuato con successo!');
        } catch (error) {
            console.error('Errore login Google:', error);
            UI.showError(Utils.getErrorMessage(error));
        } finally {
            if (googleBtn) {
                googleBtn.disabled = false;
                googleBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>${this.isLoginMode ? 'Continua con Google' : 'Registrati con Google'}</span>
                `;
            }
        }
    },

    /**
     * Logout
     */
    async handleLogout() {
        try {
            if (window.useFirebase && window.firebaseAuth && window.firebaseReady) {
                const { signOut } = window.firebaseImports;
                await signOut(window.firebaseAuth);
            } else {
                // Logout locale
                localStorage.removeItem('hc_current_user');
                this.handleUserLogout();
            }
        } catch (error) {
            console.error('Errore logout:', error);
            UI.showError('Errore durante il logout');
        }
    },

    /**
     * Simula login locale
     */
    async simulateLogin(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                const user = users[email];
                
                if (user && user.password === password) {
                    const currentUser = {
                        uid: user.uid,
                        email: email,
                        displayName: user.username
                    };
                    
                    window.currentUser = currentUser;
                    this.handleUserLogin(currentUser);
                    resolve();
                } else {
                    reject(new Error('Email o password non validi'));
                }
            }, 1000);
        });
    },

    /**
     * Simula registrazione locale
     */
    async simulateRegister(email, password, username, role) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                
                if (users[email]) {
                    reject(new Error('Utente già esistente'));
                    return;
                }
                
                const userId = 'local_' + Date.now();
                users[email] = {
                    uid: userId,
                    username: username,
                    email: email,
                    password: password,
                    clan: 'Nessuno',
                    role: role || window.USER_ROLES.USER,
                    createdAt: Date.now()
                };
                
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                
                const currentUser = {
                    uid: userId,
                    email: email,
                    displayName: username
                };
                
                window.currentUser = currentUser;
                this.handleUserLogin(currentUser);
                resolve();
            }, 1000);
        });
    },

    /**
     * Determina il ruolo del nuovo utente
     */
    async determineUserRole() {
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                // In Firebase, per sicurezza, assumiamo sempre USER come ruolo di default
                return window.USER_ROLES.USER;
            } else {
                // Modalità locale - controlla se ci sono utenti reali
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                
                const realUsers = Object.values(users).filter(user => 
                    !user.uid.startsWith('super_admin_') && 
                    !user.uid.startsWith('clan_mod_') && 
                    !user.uid.startsWith('user_')
                );
                
                if (realUsers.length === 0) {
                    return window.USER_ROLES.SUPERUSER;
                }
            }
            
            return window.USER_ROLES.USER;
        } catch (error) {
            console.error('Errore determinazione ruolo:', error);
            return window.USER_ROLES.USER;
        }
    }
};

console.log('🔐 Auth module loaded');