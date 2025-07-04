// admin.js - Pannello amministrativo

window.Admin = {
    // Stato dell'admin
    isInitialized: false,
    currentView: null,
    
    /**
     * Inizializza il sistema admin
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('⚙️ Inizializzazione sistema admin...');
        
        this.isInitialized = true;
        console.log('✅ Sistema admin inizializzato');
    },

    /**
     * Carica contenuto amministrativo
     */
    loadContent(sectionKey) {
        console.log(`⚙️ Caricamento contenuto admin: ${sectionKey}`);
        
        this.currentView = sectionKey;
        const threadList = document.getElementById('thread-list');
        
        if (!threadList) return;
        
        // Verifica permessi
        if (!this.hasRequiredPermissions(sectionKey)) {
            this.showAccessDenied();
            return;
        }
        
        switch (sectionKey) {
            case 'admin-users':
                this.loadUsersManagement();
                break;
            case 'admin-clans':
                this.loadClansManagement();
                break;
            case 'clan-moderation':
                this.loadClanModeration();
                break;
            default:
                threadList.innerHTML = '<div style="text-align: center; padding: 40px;">Sezione non trovata</div>';
        }
    },

    /**
     * Verifica permessi richiesti per la sezione
     */
    hasRequiredPermissions(sectionKey) {
        if (sectionKey.startsWith('admin-')) {
            return Utils.getCurrentUserRole() === window.USER_ROLES.SUPERUSER;
        } else if (sectionKey === 'clan-moderation') {
            return Utils.isClanModerator();
        }
        return false;
    },

    /**
     * Mostra messaggio di accesso negato
     */
    showAccessDenied() {
        const threadList = document.getElementById('thread-list');
        if (threadList) {
            threadList.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #e74c3c;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🚫</div>
                    <h3>Accesso Negato</h3>
                    <p>Non hai i permessi necessari per accedere a questa sezione amministrativa.</p>
                </div>
            `;
        }
    },

    /**
     * Carica gestione utenti
     */
    async loadUsersManagement() {
        const threadList = document.getElementById('thread-list');
        
        threadList.innerHTML = `
            <div class="admin-panel">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>👥 Gestione Utenti</h3>
                    <div class="admin-controls">
                        <button onclick="Admin.exportUsers()" class="admin-btn" style="background: #3498db; color: white;">
                            📊 Esporta Dati
                        </button>
                        <button onclick="Admin.showUserStats()" class="admin-btn" style="background: #9b59b6; color: white;">
                            📈 Statistiche
                        </button>
                    </div>
                </div>
                <div id="users-grid" class="users-grid">
                    <div style="text-align: center; padding: 20px;">
                        <div>🔄 Caricamento utenti...</div>
                    </div>
                </div>
            </div>
        `;

        // Carica lista utenti
        await this.loadUsersList();
    },

    /**
     * Carica lista utenti
     */
    async loadUsersList() {
        const usersGrid = document.getElementById('users-grid');
        if (!usersGrid) return;
        
        try {
            let users = [];
            
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                users = await this.loadFirebaseUsers();
            } else {
                users = this.loadLocalUsers();
            }

            this.displayUsersList(users);
        } catch (error) {
            console.error('Errore caricamento utenti:', error);
            usersGrid.innerHTML = '<div style="text-align: center; color: red;">Errore nel caricamento degli utenti</div>';
        }
    },

    /**
     * Carica utenti da Firebase
     */
    async loadFirebaseUsers() {
        const { ref, get } = window.firebaseImports;
        const usersRef = ref(window.firebaseDatabase, 'users');
        const snapshot = await get(usersRef);
        
        const users = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                users.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }
        
        return users;
    },

    /**
     * Carica utenti locali
     */
    loadLocalUsers() {
        const localUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        return Object.entries(localUsers).map(([email, userData]) => ({
            id: userData.uid,
            email: email,
            ...userData
        }));
    },

    /**
     * Visualizza lista utenti
     */
    displayUsersList(users) {
        const usersGrid = document.getElementById('users-grid');
        if (!usersGrid) return;
        
        if (users.length === 0) {
            usersGrid.innerHTML = '<div style="text-align: center; padding: 20px;">Nessun utente trovato</div>';
            return;
        }

        // Ordina utenti per data di creazione (più recenti prima)
        users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        usersGrid.innerHTML = users.map(user => this.createUserCardHTML(user)).join('');
    },

    /**
     * Crea HTML per card utente
     */
    createUserCardHTML(user) {
        const roleText = this.getRoleDisplayText(user.role);
        const roleClass = this.getRoleClass(user.role);
        const isCurrentUser = window.currentUser && (user.id === window.currentUser.uid || user.email === window.currentUser.email);
        
        return `
            <div class="user-card ${isCurrentUser ? 'current-user' : ''}">
                <div class="user-card-header">
                    <div class="user-card-name">
                        ${Utils.escapeHtml(user.username || user.email.split('@')[0])} 
                        <span class="user-role ${roleClass}">
                            ${roleText}
                        </span>
                        ${isCurrentUser ? '<span class="current-user-badge">TU</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ${Utils.formatTime(user.createdAt)}
                    </div>
                </div>
                <div class="user-card-info">
                    <div>📧 ${Utils.escapeHtml(user.email)}</div>
                    <div>🏰 Clan: ${Utils.escapeHtml(user.clan || 'Nessuno')}</div>
                    <div>🔗 Provider: ${user.provider || 'email'}</div>
                    ${user.lastSeen ? `<div>👁️ Ultimo accesso: ${Utils.formatTime(user.lastSeen)}</div>` : ''}
                </div>
                <div class="user-card-actions">
                    <button class="admin-btn btn-assign-clan" onclick="Admin.assignClan('${user.id}', '${Utils.escapeHtml(user.username || user.email)}')">
                        🏰 Assegna Clan
                    </button>
                    ${!isCurrentUser ? `
                        <button class="admin-btn btn-change-role" onclick="Admin.changeUserRole('${user.id}', '${Utils.escapeHtml(user.username || user.email)}', '${user.role || 'user'}')">
                            🔄 Cambia Ruolo
                        </button>
                    ` : ''}
                    ${user.clan && user.clan !== 'Nessuno' ? `
                        <button class="admin-btn btn-remove-clan" onclick="Admin.removeFromClan('${user.id}', '${Utils.escapeHtml(user.username || user.email)}')">
                            ❌ Rimuovi Clan
                        </button>
                    ` : ''}
                    ${!isCurrentUser ? `
                        <button class="admin-btn btn-delete-user" onclick="Admin.deleteUser('${user.id}', '${Utils.escapeHtml(user.username || user.email)}')" style="background: #e74c3c; color: white;">
                            🗑️ Elimina
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Ottieni testo visualizzato per ruolo
     */
    getRoleDisplayText(role) {
        switch (role) {
            case window.USER_ROLES.SUPERUSER: return 'SUPER';
            case window.USER_ROLES.CLAN_MOD: return 'MOD';
            default: return 'USER';
        }
    },

    /**
     * Ottieni classe CSS per ruolo
     */
    getRoleClass(role) {
        switch (role) {
            case window.USER_ROLES.SUPERUSER: return 'role-superuser';
            case window.USER_ROLES.CLAN_MOD: return 'role-moderator';
            default: return 'role-user';
        }
    },

    /**
     * Assegna clan a utente
     */
    async assignClan(userId, username) {
        try {
            const availableClans = await this.getAvailableClans();
            let clanList = 'Clan disponibili:\n';
            
            if (availableClans.length > 0) {
                clanList += availableClans.map((clan, index) => `${index + 1}. ${clan}`).join('\n');
                clanList += '\n\nScrivi il nome del clan o "nuovo" per crearne uno:';
            } else {
                clanList += 'Nessun clan esistente.\n\nScrivi il nome del nuovo clan da creare:';
            }
            
            const clanName = prompt(`Assegna clan a ${username}:\n\n${clanList}`);
            if (!clanName || clanName.trim() === '') return;
            
            const trimmedName = clanName.trim();
            
            // Se l'utente scrive "nuovo", chiedi il nome del nuovo clan
            if (trimmedName.toLowerCase() === 'nuovo') {
                const newClanName = prompt('Nome del nuovo clan:');
                if (!newClanName || newClanName.trim() === '') return;
                await this.updateUserClan(userId, newClanName.trim());
                UI.showSuccess(`${username} è stato assegnato al nuovo clan "${newClanName.trim()}"`);
            } else {
                await this.updateUserClan(userId, trimmedName);
                UI.showSuccess(`${username} è stato assegnato al clan "${trimmedName}"`);
            }
            
            this.loadUsersList(); // Ricarica lista
        } catch (error) {
            console.error('Errore assegnazione clan:', error);
            UI.showError('Errore nell\'assegnazione del clan');
        }
    },

    /**
     * Cambia ruolo utente
     */
    async changeUserRole(userId, username, currentRole) {
        const roles = [
            { value: window.USER_ROLES.USER, label: 'USER - Utente normale' },
            { value: window.USER_ROLES.CLAN_MOD, label: 'CLAN_MOD - Moderatore di clan' },
            { value: window.USER_ROLES.SUPERUSER, label: 'SUPERUSER - Super amministratore' }
        ];
        
        let roleList = `Cambia ruolo di ${username}:\n\nRuolo attuale: ${currentRole}\n\nRuoli disponibili:\n`;
        roleList += roles.map((role, index) => `${index + 1}. ${role.label}`).join('\n');
        roleList += '\n\nInserisci il numero del nuovo ruolo:';
        
        const roleChoice = prompt(roleList);
        if (!roleChoice) return;
        
        const roleIndex = parseInt(roleChoice) - 1;
        if (roleIndex < 0 || roleIndex >= roles.length) {
            UI.showError('Scelta non valida');
            return;
        }
        
        const newRole = roles[roleIndex].value;
        
        if (newRole === currentRole) {
            UI.showError('Il ruolo selezionato è già quello attuale');
            return;
        }
        
        // Conferma per ruoli critici
        if (newRole === window.USER_ROLES.SUPERUSER) {
            if (!confirm(`⚠️ ATTENZIONE: Stai per assegnare privilegi di SUPERUSER a ${username}.\n\nQuesto darà accesso completo al sistema. Continuare?`)) {
                return;
            }
        }
        
        try {
            await this.updateUserRole(userId, newRole);
            UI.showSuccess(`Ruolo di ${username} cambiato in "${roles[roleIndex].label}"`);
            this.loadUsersList(); // Ricarica lista
        } catch (error) {
            console.error('Errore cambio ruolo:', error);
            UI.showError('Errore nel cambio del ruolo');
        }
    },

    /**
     * Rimuovi utente dal clan
     */
    async removeFromClan(userId, username) {
        if (confirm(`Rimuovere ${username} dal clan?`)) {
            try {
                await this.updateUserClan(userId, 'Nessuno');
                UI.showSuccess(`${username} è stato rimosso dal clan`);
                this.loadUsersList(); // Ricarica lista
            } catch (error) {
                console.error('Errore rimozione clan:', error);
                UI.showError('Errore nella rimozione dal clan');
            }
        }
    },

    /**
     * Elimina utente
     */
    async deleteUser(userId, username) {
        if (!confirm(`⚠️ ATTENZIONE: Stai per eliminare definitivamente l'utente ${username}.\n\nQuesta azione NON può essere annullata.\n\nContinuare?`)) {
            return;
        }
        
        // Doppia conferma per sicurezza
        const confirmText = prompt(`Per confermare l'eliminazione, scrivi: ${username}`);
        if (confirmText !== username) {
            UI.showError('Conferma non valida. Eliminazione annullata.');
            return;
        }
        
        try {
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                const { ref, remove } = window.firebaseImports;
                const userRef = ref(window.firebaseDatabase, `users/${userId}`);
                await remove(userRef);
            } else {
                // Rimozione locale
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                const userEmail = Object.keys(users).find(email => users[email].uid === userId);
                if (userEmail) {
                    delete users[userEmail];
                    localStorage.setItem('hc_local_users', JSON.stringify(users));
                }
            }
            
            UI.showSuccess(`Utente ${username} eliminato con successo`);
            this.loadUsersList(); // Ricarica lista
        } catch (error) {
            console.error('Errore eliminazione utente:', error);
            UI.showError('Errore nell\'eliminazione dell\'utente');
        }
    },

    /**
     * Aggiorna clan utente
     */
    async updateUserClan(userId, clanName) {
        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, set } = window.firebaseImports;
            const userRef = ref(window.firebaseDatabase, `users/${userId}/clan`);
            await set(userRef, clanName);
        } else {
            // Aggiorna localStorage
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            for (const email in users) {
                if (users[email].uid === userId) {
                    users[email].clan = clanName;
                    localStorage.setItem('hc_local_users', JSON.stringify(users));
                    break;
                }
            }
        }
    },

    /**
     * Aggiorna ruolo utente
     */
    async updateUserRole(userId, newRole) {
        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const { ref, set } = window.firebaseImports;
            const userRef = ref(window.firebaseDatabase, `users/${userId}/role`);
            await set(userRef, newRole);
        } else {
            // Aggiorna localStorage
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            for (const email in users) {
                if (users[email].uid === userId) {
                    users[email].role = newRole;
                    localStorage.setItem('hc_local_users', JSON.stringify(users));
                    break;
                }
            }
        }
    },

    /**
     * Carica gestione clan
     */
    async loadClansManagement() {
        const threadList = document.getElementById('thread-list');
        
        threadList.innerHTML = `
            <div class="clan-management">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>🏰 Gestione Clan</h3>
                    <div class="admin-controls">
                        <button onclick="Admin.createNewClan()" class="create-clan-btn">
                            + Crea Nuovo Clan
                        </button>
                        <button onclick="Admin.exportClans()" class="admin-btn" style="background: #3498db; color: white;">
                            📊 Esporta Dati
                        </button>
                    </div>
                </div>
                <div id="clans-grid" class="clan-list">
                    <div style="text-align: center; padding: 20px;">
                        <div>🔄 Caricamento clan...</div>
                    </div>
                </div>
            </div>
        `;

        await this.loadClansList();
    },

    /**
     * Carica lista clan
     */
    async loadClansList() {
        const clansGrid = document.getElementById('clans-grid');
        if (!clansGrid) return;
        
        try {
            const clans = await this.getAvailableClans();
            const clanStats = await this.getClanStats(clans);
            
            if (clans.length === 0) {
                clansGrid.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🏰</div>
                        <h4>Nessun clan trovato</h4>
                        <p>Crea il primo clan per iniziare!</p>
                    </div>
                `;
                return;
            }

            clansGrid.innerHTML = clans.map(clan => `
                <div class="clan-card">
                    <h4>🏰 ${Utils.escapeHtml(clan)}</h4>
                    <div class="clan-stats">
                        <div class="clan-members">
                            👥 ${clanStats[clan]?.memberCount || 0} membri
                        </div>
                        <div class="clan-moderators">
                            🛡️ ${clanStats[clan]?.moderatorCount || 0} moderatori
                        </div>
                        <div class="clan-activity">
                            📈 ${clanStats[clan]?.activityLevel || 'Bassa'} attività
                        </div>
                    </div>
                    <div class="clan-actions">
                        <button class="admin-btn" onclick="Admin.viewClanDetails('${clan}')" style="background: #3498db; color: white;">
                            👁️ Dettagli
                        </button>
                        <button class="admin-btn btn-remove-clan" onclick="Admin.deleteClan('${clan}')">
                            🗑️ Elimina
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento clan:', error);
            clansGrid.innerHTML = '<div style="text-align: center; color: red;">Errore nel caricamento dei clan</div>';
        }
    },

    /**
     * Ottieni clan disponibili
     */
    async getAvailableClans() {
        let clans = [];
        
        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            const users = await this.loadFirebaseUsers();
            const clanSet = new Set();
            users.forEach(user => {
                if (user.clan && user.clan !== 'Nessuno') {
                    clanSet.add(user.clan);
                }
            });
            clans = Array.from(clanSet);
        } else {
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
    },

    /**
     * Ottieni statistiche clan
     */
    async getClanStats(clans) {
        const stats = {};
        
        let users = [];
        if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
            users = await this.loadFirebaseUsers();
        } else {
            users = Object.values(JSON.parse(localStorage.getItem('hc_local_users') || '{}'));
        }
        
        clans.forEach(clan => {
            const clanMembers = users.filter(user => user.clan === clan);
            const moderators = clanMembers.filter(user => 
                user.role === window.USER_ROLES.CLAN_MOD || user.role === window.USER_ROLES.SUPERUSER
            );
            
            // Calcola livello di attività basato su ultimo accesso
            const now = Date.now();
            const activeMembers = clanMembers.filter(user => {
                const lastSeen = user.lastSeen || user.createdAt || 0;
                return (now - lastSeen) < (7 * 24 * 60 * 60 * 1000); // 7 giorni
            });
            
            let activityLevel = 'Bassa';
            const activityRatio = activeMembers.length / Math.max(clanMembers.length, 1);
            if (activityRatio > 0.7) activityLevel = 'Alta';
            else if (activityRatio > 0.4) activityLevel = 'Media';
            
            stats[clan] = {
                memberCount: clanMembers.length,
                moderatorCount: moderators.length,
                activeMembers: activeMembers.length,
                activityLevel: activityLevel
            };
        });
        
        return stats;
    },

    /**
     * Crea nuovo clan
     */
    async createNewClan() {
        const clanName = prompt('Nome del nuovo clan:');
        if (!clanName || clanName.trim() === '') return;
        
        const trimmedName = clanName.trim();
        
        // Verifica che il clan non esista già
        const existingClans = await this.getAvailableClans();
        if (existingClans.includes(trimmedName)) {
            UI.showError('Questo clan esiste già!');
            return;
        }
        
        // Valida nome clan
        if (trimmedName.length < 3) {
            UI.showError('Il nome del clan deve essere di almeno 3 caratteri');
            return;
        }
        
        if (trimmedName.length > 30) {
            UI.showError('Il nome del clan non può superare i 30 caratteri');
            return;
        }
        
        UI.showSuccess(`Clan "${trimmedName}" creato! Ora puoi assegnare utenti a questo clan.`);
        this.loadClansList();
    },

    /**
     * Visualizza dettagli clan
     */
    async viewClanDetails(clanName) {
        try {
            let users = [];
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                users = await this.loadFirebaseUsers();
            } else {
                users = Object.values(JSON.parse(localStorage.getItem('hc_local_users') || '{}'));
            }
            
            const clanMembers = users.filter(user => user.clan === clanName);
            
            if (clanMembers.length === 0) {
                alert(`Il clan "${clanName}" non ha membri.`);
                return;
            }
            
            let details = `🏰 Dettagli Clan: ${clanName}\n\n`;
            details += `👥 Membri totali: ${clanMembers.length}\n\n`;
            
            // Raggruppa per ruolo
            const byRole = {
                [window.USER_ROLES.SUPERUSER]: [],
                [window.USER_ROLES.CLAN_MOD]: [],
                [window.USER_ROLES.USER]: []
            };
            
            clanMembers.forEach(user => {
                const role = user.role || window.USER_ROLES.USER;
                byRole[role].push(user);
            });
            
            if (byRole[window.USER_ROLES.SUPERUSER].length > 0) {
                details += `👑 Super Amministratori:\n`;
                byRole[window.USER_ROLES.SUPERUSER].forEach(user => {
                    details += `  • ${user.username || user.email}\n`;
                });
                details += '\n';
            }
            
            if (byRole[window.USER_ROLES.CLAN_MOD].length > 0) {
                details += `🛡️ Moderatori:\n`;
                byRole[window.USER_ROLES.CLAN_MOD].forEach(user => {
                    details += `  • ${user.username || user.email}\n`;
                });
                details += '\n';
            }
            
            if (byRole[window.USER_ROLES.USER].length > 0) {
                details += `⚔️ Membri:\n`;
                byRole[window.USER_ROLES.USER].forEach(user => {
                    details += `  • ${user.username || user.email}\n`;
                });
            }
            
            alert(details);
        } catch (error) {
            console.error('Errore caricamento dettagli clan:', error);
            UI.showError('Errore nel caricamento dei dettagli del clan');
        }
    },

    /**
     * Elimina clan
     */
    async deleteClan(clanName) {
        if (!confirm(`⚠️ ATTENZIONE: Stai per eliminare il clan "${clanName}".\n\nTutti i membri verranno rimossi dal clan.\n\nQuesta azione NON può essere annullata.\n\nContinuare?`)) {
            return;
        }
        
        // Doppia conferma
        const confirmText = prompt(`Per confermare l'eliminazione, scrivi: ${clanName}`);
        if (confirmText !== clanName) {
            UI.showError('Conferma non valida. Eliminazione annullata.');
            return;
        }
        
        try {
            // Rimuovi tutti gli utenti dal clan
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                const { ref, get, update } = window.firebaseImports;
                const usersRef = ref(window.firebaseDatabase, 'users');
                const snapshot = await get(usersRef);
                
                if (snapshot.exists()) {
                    const updates = {};
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        if (userData.clan === clanName) {
                            updates[`users/${childSnapshot.key}/clan`] = 'Nessuno';
                        }
                    });
                    
                    if (Object.keys(updates).length > 0) {
                        await update(ref(window.firebaseDatabase), updates);
                    }
                }
            } else {
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                Object.keys(users).forEach(email => {
                    if (users[email].clan === clanName) {
                        users[email].clan = 'Nessuno';
                    }
                });
                localStorage.setItem('hc_local_users', JSON.stringify(users));
            }
            
            UI.showSuccess(`Clan "${clanName}" eliminato con successo`);
            this.loadClansList();
        } catch (error) {
            console.error('Errore eliminazione clan:', error);
            UI.showError('Errore nell\'eliminazione del clan');
        }
    },

    /**
     * Carica moderazione clan
     */
    async loadClanModeration() {
        const threadList = document.getElementById('thread-list');
        
        threadList.innerHTML = `
            <div class="admin-panel">
                <h3>🛡️ Moderazione Clan ${Utils.getCurrentUserClan()}</h3>
                <div id="moderation-content">
                    <div style="text-align: center; padding: 20px;">
                        <div>🔄 Caricamento contenuti da moderare...</div>
                    </div>
                </div>
            </div>
        `;

        await this.loadPendingThreads();
    },

    /**
     * Carica thread in attesa di approvazione
     */
    async loadPendingThreads() {
        const moderationContent = document.getElementById('moderation-content');
        if (!moderationContent) return;
        
        try {
            const userClan = Utils.getCurrentUserClan();
            const pendingThreads = await this.getPendingThreadsForClan(userClan);
            
            if (pendingThreads.length === 0) {
                moderationContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #27ae60;">
                        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
                        <h4>Tutto in ordine!</h4>
                        <p>Nessun contenuto in attesa di approvazione</p>
                    </div>
                `;
                return;
            }

            moderationContent.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h4>📋 Thread in attesa di approvazione (${pendingThreads.length})</h4>
                    <p style="color: #666; font-size: 14px;">Controlla e approva/rifiuta i contenuti sottoposti dai membri del clan</p>
                </div>
                ${pendingThreads.map(thread => this.createPendingThreadHTML(thread)).join('')}
            `;
        } catch (error) {
            console.error('Errore caricamento thread pending:', error);
            moderationContent.innerHTML = `
                <div style="text-align: center; color: red; padding: 20px;">
                    Errore nel caricamento dei contenuti da moderare
                </div>
            `;
        }
    },

    /**
     * Crea HTML per thread in attesa
     */
    createPendingThreadHTML(thread) {
        return `
            <div class="thread-item thread-pending" style="margin-bottom: 15px; border: 2px solid #f39c12; border-radius: 8px;">
                <div class="thread-main" style="padding: 20px;">
                    <div class="thread-title" style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                        ${Utils.escapeHtml(thread.title)}
                        <span class="pending-indicator">IN ATTESA</span>
                    </div>
                    <div class="thread-author" style="margin-bottom: 15px;">
                        da ${Utils.escapeHtml(thread.author)} • ${Utils.formatTime(thread.createdAt)} • Sezione: ${this.getSectionDisplayName(thread.section)}
                    </div>
                    <div class="thread-preview" style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 6px; margin-bottom: 15px; max-height: 100px; overflow: hidden;">
                        ${Utils.escapeHtml(thread.content || '').substring(0, 200)}${(thread.content || '').length > 200 ? '...' : ''}
                    </div>
                    <div class="moderation-actions" style="display: flex; gap: 10px;">
                        <button class="approve-btn" onclick="Admin.approveThread('${thread.id}', '${thread.section}')" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            ✅ Approva
                        </button>
                        <button class="reject-btn" onclick="Admin.rejectThread('${thread.id}', '${thread.section}')" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            ❌ Rifiuta
                        </button>
                        <button onclick="Admin.viewFullThread('${thread.id}', '${thread.section}')" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            👁️ Visualizza
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Ottieni nome visualizzato per sezione
     */
    getSectionDisplayName(sectionKey) {
        const section = window.SECTION_CONFIG[sectionKey];
        return section ? section.title.replace(/[📅⚔️🆕💬🛡️🏰🏆💡]/g, '').trim() : sectionKey;
    },

    /**
     * Ottieni thread in attesa per clan
     */
    async getPendingThreadsForClan(clanName) {
        const pendingThreads = [];
        const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
        
        for (const section of clanSections) {
            try {
                const dataPath = Utils.getDataPath(section, 'threads');
                if (!dataPath) continue;
                
                let threads = [];
                
                if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                    const { ref, get } = window.firebaseImports;
                    const threadsRef = ref(window.firebaseDatabase, dataPath);
                    const snapshot = await get(threadsRef);
                    
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            const threadData = childSnapshot.val();
                            if (threadData.status === 'pending') {
                                threads.push({
                                    id: childSnapshot.key,
                                    section: section,
                                    ...threadData
                                });
                            }
                        });
                    }
                } else {
                    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
                    const localThreads = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    threads = localThreads.filter(t => t.status === 'pending').map(t => ({
                        ...t,
                        section: section
                    }));
                }
                
                pendingThreads.push(...threads);
            } catch (error) {
                console.error(`Errore caricamento thread pending per ${section}:`, error);
            }
        }
        
        return pendingThreads.sort((a, b) => b.createdAt - a.createdAt);
    },

    /**
     * Approva thread
     */
    async approveThread(threadId, section) {
        try {
            await Forum.updateThreadStatus(threadId, section, 'approved');
            UI.showSuccess('Thread approvato con successo!');
            this.loadPendingThreads(); // Ricarica lista
        } catch (error) {
            console.error('Errore approvazione thread:', error);
            UI.showError('Errore nell\'approvazione del thread');
        }
    },

    /**
     * Rifiuta thread
     */
    async rejectThread(threadId, section) {
        const reason = prompt('Motivo del rifiuto (sarà comunicato all\'autore):');
        
        try {
            await Forum.updateThreadStatus(threadId, section, 'rejected', reason);
            UI.showSuccess('Thread rifiutato');
            this.loadPendingThreads(); // Ricarica lista
        } catch (error) {
            console.error('Errore rifiuto thread:', error);
            UI.showError('Errore nel rifiuto del thread');
        }
    },

    /**
     * Visualizza thread completo
     */
    async viewFullThread(threadId, section) {
        try {
            const thread = await Forum.getThread(threadId, section);
            if (!thread) {
                UI.showError('Thread non trovato');
                return;
            }
            
            const content = `🏰 ${thread.title}\n\n` +
                           `👤 Autore: ${thread.author}\n` +
                           `📅 Data: ${new Date(thread.createdAt).toLocaleString()}\n` +
                           `📂 Sezione: ${this.getSectionDisplayName(section)}\n\n` +
                           `📝 Contenuto:\n${thread.content}`;
            
            alert(content);
        } catch (error) {
            console.error('Errore visualizzazione thread:', error);
            UI.showError('Errore nella visualizzazione del thread');
        }
    },

    /**
     * Esporta dati utenti
     */
    async exportUsers() {
        try {
            let users = [];
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                users = await this.loadFirebaseUsers();
            } else {
                users = this.loadLocalUsers();
            }
            
            const csvContent = this.convertUsersToCSV(users);
            this.downloadCSV(csvContent, 'utenti_hustle_castle.csv');
            UI.showSuccess('Dati utenti esportati con successo!');
        } catch (error) {
            console.error('Errore esportazione utenti:', error);
            UI.showError('Errore durante l\'esportazione');
        }
    },

    /**
     * Esporta dati clan
     */
    async exportClans() {
        try {
            const clans = await this.getAvailableClans();
            const clanStats = await this.getClanStats(clans);
            
            const csvContent = this.convertClansToCSV(clans, clanStats);
            this.downloadCSV(csvContent, 'clan_hustle_castle.csv');
            UI.showSuccess('Dati clan esportati con successo!');
        } catch (error) {
            console.error('Errore esportazione clan:', error);
            UI.showError('Errore durante l\'esportazione');
        }
    },

    /**
     * Converti utenti in CSV
     */
    convertUsersToCSV(users) {
        const headers = ['Username', 'Email', 'Clan', 'Ruolo', 'Data Registrazione', 'Ultimo Accesso', 'Provider'];
        const rows = users.map(user => [
            user.username || user.email.split('@')[0],
            user.email,
            user.clan || 'Nessuno',
            this.getRoleDisplayText(user.role),
            new Date(user.createdAt || 0).toLocaleString(),
            user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Mai',
            user.provider || 'email'
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    },

    /**
     * Converti clan in CSV
     */
    convertClansToCSV(clans, clanStats) {
        const headers = ['Nome Clan', 'Membri Totali', 'Moderatori', 'Membri Attivi', 'Livello Attività'];
        const rows = clans.map(clan => [
            clan,
            clanStats[clan]?.memberCount || 0,
            clanStats[clan]?.moderatorCount || 0,
            clanStats[clan]?.activeMembers || 0,
            clanStats[clan]?.activityLevel || 'Bassa'
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell.toString()}"`).join(',')
        ).join('\n');
    },

    /**
     * Download CSV
     */
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Mostra statistiche utenti
     */
    async showUserStats() {
        try {
            let users = [];
            if (window.useFirebase && window.firebaseDatabase && window.firebaseReady) {
                users = await this.loadFirebaseUsers();
            } else {
                users = this.loadLocalUsers();
            }
            
            const stats = this.calculateUserStats(users);
            const statsText = this.formatUserStats(stats);
            
            alert(statsText);
        } catch (error) {
            console.error('Errore calcolo statistiche:', error);
            UI.showError('Errore nel calcolo delle statistiche');
        }
    },

    /**
     * Calcola statistiche utenti
     */
    calculateUserStats(users) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;
        
        return {
            total: users.length,
            byRole: {
                superuser: users.filter(u => u.role === window.USER_ROLES.SUPERUSER).length,
                clanMod: users.filter(u => u.role === window.USER_ROLES.CLAN_MOD).length,
                user: users.filter(u => !u.role || u.role === window.USER_ROLES.USER).length
            },
            activity: {
                activeToday: users.filter(u => (now - (u.lastSeen || u.createdAt || 0)) < oneDay).length,
                activeWeek: users.filter(u => (now - (u.lastSeen || u.createdAt || 0)) < oneWeek).length,
                activeMonth: users.filter(u => (now - (u.lastSeen || u.createdAt || 0)) < oneMonth).length
            },
            clans: {
                withClan: users.filter(u => u.clan && u.clan !== 'Nessuno').length,
                withoutClan: users.filter(u => !u.clan || u.clan === 'Nessuno').length
            },
            registration: {
                today: users.filter(u => (now - (u.createdAt || 0)) < oneDay).length,
                week: users.filter(u => (now - (u.createdAt || 0)) < oneWeek).length,
                month: users.filter(u => (now - (u.createdAt || 0)) < oneMonth).length
            }
        };
    },

    /**
     * Formatta statistiche utenti
     */
    formatUserStats(stats) {
        return `📊 STATISTICHE UTENTI\n\n` +
               `👥 Totale utenti: ${stats.total}\n\n` +
               `🎭 PER RUOLO:\n` +
               `  • Super Admin: ${stats.byRole.superuser}\n` +
               `  • Clan Moderatori: ${stats.byRole.clanMod}\n` +
               `  • Utenti: ${stats.byRole.user}\n\n` +
               `📈 ATTIVITÀ:\n` +
               `  • Attivi oggi: ${stats.activity.activeToday}\n` +
               `  • Attivi questa settimana: ${stats.activity.activeWeek}\n` +
               `  • Attivi questo mese: ${stats.activity.activeMonth}\n\n` +
               `🏰 CLAN:\n` +
               `  • Con clan: ${stats.clans.withClan}\n` +
               `  • Senza clan: ${stats.clans.withoutClan}\n\n` +
               `📝 REGISTRAZIONI:\n` +
               `  • Oggi: ${stats.registration.today}\n` +
               `  • Questa settimana: ${stats.registration.week}\n` +
               `  • Questo mese: ${stats.registration.month}`;
    },

    /**
     * Cleanup del sistema admin
     */
    cleanup() {
        this.currentView = null;
        this.isInitialized = false;
        console.log('⚙️ Admin system cleaned up');
    }
};

// Rendi le funzioni globali per onclick
window.assignClan = Admin.assignClan.bind(Admin);
window.changeUserRole = Admin.changeUserRole.bind(Admin);
window.removFromClan = Admin.removeFromClan.bind(Admin);
window.createNewClan = Admin.createNewClan.bind(Admin);
window.deleteClan = Admin.deleteClan.bind(Admin);

console.log('⚙️ Admin module loaded');