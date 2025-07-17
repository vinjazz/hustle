// 🏰 HUSTLE CASTLE COUNCIL - SCRIPT REFACTORIZZATO
// Versione ottimizzata e modulare del sistema forum

// =====================================================
// CONFIGURAZIONE E COSTANTI
// =====================================================

const CONFIG = {
    USER_ROLES: {
        SUPERUSER: 'superuser',
        CLAN_MOD: 'clan_mod',
        USER: 'user'
    },
    
    INTERVALS: {
        BADGE_UPDATE: 60000,
        NOTIFICATION_CHECK: 30000
    },
    
    LIMITS: {
        MAX_NOTIFICATIONS: 20,
        MAX_MESSAGES: 50,
        MAX_THREADS: 20
    },
    
    SECTIONS: {
        'home': { title: '🏠 Dashboard', type: 'dashboard' },
        'salotto': { title: '🛋️ Salotto', type: 'forum' },
        'segnalazioni': { title: '📢 Segnalazioni', type: 'forum' },
        'eventi': { title: '📅 Eventi', type: 'forum' },
        'oggetti': { title: '⚔️ Oggetti', type: 'forum' },
        'novita': { title: '🆕 Novità', type: 'forum' },
        'chat-generale': { title: '💬 Chat Generale', type: 'chat' },
        'associa-clan': { title: '🏠 Associa Clan', type: 'forum' },
        'admin-users': { title: '👥 Gestione Utenti', type: 'admin', requiredRole: 'superuser' },
        'admin-clans': { title: '🏰 Gestione Clan', type: 'admin', requiredRole: 'superuser' },
        'clan-moderation': { title: '🛡️ Moderazione Clan', type: 'clan-admin' },
        'clan-chat': { title: '💬 Chat Clan', type: 'chat' },
        'clan-war': { title: '⚔️ Guerra Clan', type: 'forum' },
        'clan-premi': { title: '🏆 Premi Clan', type: 'forum' },
        'clan-consigli': { title: '💡 Consigli Clan', type: 'forum' },
        'clan-bacheca': { title: '🏰 Bacheca Clan', type: 'forum' }
    }
};

// =====================================================
// GESTIONE STATO CENTRALIZZATA
// =====================================================

class AppState {
    constructor() {
        this.data = {
            currentUser: null,
            currentUserData: null,
            currentSection: 'home',
            currentThread: null,
            isConnected: false,
            firebaseReady: false,
            allUsers: [],
            notificationsData: [],
            userSectionVisits: {},
            isLoginMode: true
        };
        this.listeners = [];
        this.cleanup = [];
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
        this.notifyListeners(key, value);
    }

    update(updates) {
        Object.assign(this.data, updates);
        this.notifyListeners('bulk', updates);
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    notifyListeners(key, value) {
        this.listeners.forEach(listener => {
            try {
                listener(key, value, this.data);
            } catch (error) {
                console.error('Errore listener:', error);
            }
        });
    }

    addCleanup(cleanupFn) {
        this.cleanup.push(cleanupFn);
    }

    performCleanup() {
        this.cleanup.forEach(fn => {
            try {
                fn();
            } catch (error) {
                console.error('Errore cleanup:', error);
            }
        });
        this.cleanup = [];
    }
}

const appState = new AppState();

// =====================================================
// UTILITÀ GENERALI
// =====================================================

class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
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
    }

    static async retry(asyncFn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await asyncFn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }

    static formatTime(timestamp) {
        if (!timestamp) return 'ora';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'ora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
        return date.toLocaleDateString();
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static sanitizeInput(input) {
        return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
                   .replace(/javascript:/gi, '')
                   .replace(/on\w+\s*=\s*[^>]*/gi, '');
    }

    static createElementFromHTML(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }
}

// =====================================================
// GESTIONE ERRORI CENTRALIZZATA
// =====================================================

class ErrorHandler {
    static logError(error, context = 'Generic') {
        const errorInfo = {
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
            context,
            stack: error.stack
        };

        console.error(`❌ ${context}:`, errorInfo);

        // Salva in localStorage per debug
        try {
            const errorLog = JSON.parse(localStorage.getItem('hc_error_log') || '[]');
            errorLog.unshift(errorInfo);
            if (errorLog.length > 10) errorLog.pop();
            localStorage.setItem('hc_error_log', JSON.stringify(errorLog));
        } catch (e) {
            console.warn('Impossibile salvare log errori:', e);
        }
    }

    static async handleAsync(asyncFn, fallbackFn = null, context = 'Operation') {
        try {
            return await asyncFn();
        } catch (error) {
            this.logError(error, context);
            if (fallbackFn) {
                try {
                    return await fallbackFn();
                } catch (fallbackError) {
                    this.logError(fallbackError, `${context} Fallback`);
                    throw fallbackError;
                }
            }
            throw error;
        }
    }
}

// =====================================================
// GESTIONE DATABASE (SUPABASE + FIREBASE)
// =====================================================

class DatabaseManager {
    constructor() {
        this.supabase = null;
        this.firebase = null;
        this.syncLocks = {};
    }

    async init() {
        // Inizializza Supabase
        if (window.supabase && window.supabaseUrl && window.supabaseKey) {
            this.supabase = window.supabase.createClient(window.supabaseUrl, window.supabaseKey);
            console.log('✅ Supabase inizializzato');
        }

        // Inizializza Firebase
        if (window.useFirebase && window.firebaseDatabase) {
            this.firebase = window.firebaseDatabase;
            console.log('✅ Firebase inizializzato');
        }
    }

    async upsertUser(userData) {
        const lockKey = `sync_${userData.uid}`;
        if (this.syncLocks[lockKey]) return;
        
        this.syncLocks[lockKey] = true;
        
        try {
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('users')
                    .upsert(userData, { onConflict: 'uid' })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
            return userData;
        } finally {
            delete this.syncLocks[lockKey];
        }
    }

    async getUsers() {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data;
        }
        
        // Fallback localStorage
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        return Object.values(users);
    }

    async createNotification(notification) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('notifications')
                .insert([notification])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        
        // Fallback localStorage
        const storageKey = `hc_notifications_${notification.user_id}`;
        const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
        notification.id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        notification.created_at = new Date().toISOString();
        notifications.unshift(notification);
        localStorage.setItem(storageKey, JSON.stringify(notifications.slice(0, 20)));
        return notification;
    }

    async getNotifications(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data;
        }
        
        // Fallback localStorage
        const storageKey = `hc_notifications_${userId}`;
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
    }

    async createThread(threadData) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('threads')
                .insert([threadData])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        
        // Fallback localStorage
        const storageKey = `hc_threads_${threadData.section}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        threadData.id = 'thread_' + Date.now();
        threadData.created_at = new Date().toISOString();
        threads.unshift(threadData);
        localStorage.setItem(storageKey, JSON.stringify(threads));
        return threadData;
    }

    async getThreads(section) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('threads')
                .select('*')
                .eq('section', section)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data;
        }
        
        // Fallback localStorage
        const storageKey = `hc_threads_${section}`;
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
    }
}

const db = new DatabaseManager();

// =====================================================
// GESTIONE UTENTI
// =====================================================

class UserManager {
    static getCurrentUser() {
        return appState.get('currentUser');
    }

    static getCurrentUserData() {
        return appState.get('currentUserData');
    }

    static getCurrentUserRole() {
        return appState.get('currentUserData')?.role || CONFIG.USER_ROLES.USER;
    }

    static getCurrentUserClan() {
        return appState.get('currentUserData')?.clan || 'Nessuno';
    }

    static hasRole(requiredRole) {
        const currentRole = this.getCurrentUserRole();
        if (currentRole === CONFIG.USER_ROLES.SUPERUSER) return true;
        if (requiredRole === CONFIG.USER_ROLES.CLAN_MOD && currentRole === CONFIG.USER_ROLES.CLAN_MOD) return true;
        if (requiredRole === CONFIG.USER_ROLES.USER) return true;
        return false;
    }

    static canAccessSection(sectionKey) {
        const section = CONFIG.SECTIONS[sectionKey];
        if (!section) return false;

        if (sectionKey.startsWith('clan-') && this.getCurrentUserClan() === 'Nessuno') {
            return false;
        }

        if (section.requiredRole && !this.hasRole(section.requiredRole)) {
            return false;
        }

        return true;
    }

    static async login(credentials) {
        return ErrorHandler.handleAsync(
            async () => {
                if (window.useFirebase && window.firebaseAuth) {
                    const { signInWithEmailAndPassword } = window.firebaseImports;
                    const userCredential = await signInWithEmailAndPassword(
                        window.firebaseAuth, 
                        credentials.email, 
                        credentials.password
                    );
                    return userCredential.user;
                } else {
                    return this.simulateLogin(credentials);
                }
            },
            null,
            'Login'
        );
    }

    static async register(userData) {
        return ErrorHandler.handleAsync(
            async () => {
                if (window.useFirebase && window.firebaseAuth) {
                    const { createUserWithEmailAndPassword, updateProfile } = window.firebaseImports;
                    const userCredential = await createUserWithEmailAndPassword(
                        window.firebaseAuth,
                        userData.email,
                        userData.password
                    );
                    
                    await updateProfile(userCredential.user, {
                        displayName: userData.username
                    });
                    
                    const dbUserData = {
                        uid: userCredential.user.uid,
                        email: userData.email,
                        username: userData.username,
                        clan: 'Nessuno',
                        role: CONFIG.USER_ROLES.USER,
                        created_at: new Date().toISOString()
                    };
                    
                    await db.upsertUser(dbUserData);
                    return userCredential.user;
                } else {
                    return this.simulateRegister(userData);
                }
            },
            null,
            'Registration'
        );
    }

    static async logout() {
        return ErrorHandler.handleAsync(
            async () => {
                if (window.useFirebase && window.firebaseAuth) {
                    const { signOut } = window.firebaseImports;
                    await signOut(window.firebaseAuth);
                }
                
                appState.performCleanup();
                appState.update({
                    currentUser: null,
                    currentUserData: null,
                    currentSection: 'home'
                });
                
                this.updateUI();
            },
            null,
            'Logout'
        );
    }

    static async loadUserProfile() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return;

        return ErrorHandler.handleAsync(
            async () => {
                if (window.useFirebase && window.firebaseDatabase) {
                    const { ref, get } = window.firebaseImports;
                    const userRef = ref(window.firebaseDatabase, `users/${currentUser.uid}`);
                    const snapshot = await get(userRef);
                    
                    if (snapshot.exists()) {
                        appState.set('currentUserData', snapshot.val());
                    }
                } else {
                    this.loadLocalUserProfile();
                }
                
                this.updateUI();
            },
            () => this.loadLocalUserProfile(),
            'Load User Profile'
        );
    }

    static loadLocalUserProfile() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return;

        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        const userData = users[currentUser.email];
        
        if (userData) {
            appState.set('currentUserData', userData);
        }
    }

    static updateUI() {
        const currentUser = this.getCurrentUser();
        const currentUserData = this.getCurrentUserData();
        
        if (currentUser && currentUserData) {
            document.getElementById('currentUsername').textContent = currentUserData.username;
            document.getElementById('currentClan').textContent = currentUserData.clan || 'Nessuno';
            document.getElementById('userStatus').className = 'online-indicator';
            document.getElementById('logoutBtn').style.display = 'inline-block';
            document.getElementById('loginModal').style.display = 'none';
        } else {
            document.getElementById('currentUsername').textContent = 'Ospite';
            document.getElementById('currentClan').textContent = 'Nessuno';
            document.getElementById('userStatus').className = 'offline-indicator';
            document.getElementById('logoutBtn').style.display = 'none';
            document.getElementById('loginModal').style.display = 'flex';
        }
    }

    static simulateLogin(credentials) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
                const user = users[credentials.email];

                if (user && user.password === credentials.password) {
                    const mockUser = {
                        uid: user.uid,
                        email: credentials.email,
                        displayName: user.username
                    };
                    resolve(mockUser);
                } else {
                    reject(new Error('Email o password non validi'));
                }
            }, 1000);
        });
    }

    static simulateRegister(userData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');

                if (users[userData.email]) {
                    reject(new Error('Utente già esistente'));
                    return;
                }

                const userId = 'local_' + Date.now();
                const newUser = {
                    uid: userId,
                    username: userData.username,
                    email: userData.email,
                    password: userData.password,
                    clan: 'Nessuno',
                    role: CONFIG.USER_ROLES.USER,
                    created_at: new Date().toISOString()
                };

                users[userData.email] = newUser;
                localStorage.setItem('hc_local_users', JSON.stringify(users));

                resolve({
                    uid: userId,
                    email: userData.email,
                    displayName: userData.username
                });
            }, 1000);
        });
    }
}

// =====================================================
// GESTIONE NOTIFICHE
// =====================================================

class NotificationManager {
    constructor() {
        this.subscription = null;
        this.updateBadgesDebounced = Utils.debounce(this.updateBadges.bind(this), 2000);
    }

    async init() {
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser) return;

        await this.loadNotifications();
        this.setupRealTimeListener();
        this.updateBadgesDebounced();
    }

    async loadNotifications() {
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser) return;

        return ErrorHandler.handleAsync(
            async () => {
                const notifications = await db.getNotifications(currentUser.uid);
                appState.set('notificationsData', notifications);
                this.updateUI();
            },
            null,
            'Load Notifications'
        );
    }

    setupRealTimeListener() {
        if (!db.supabase) return;

        const currentUser = UserManager.getCurrentUser();
        if (!currentUser) return;

        this.subscription = db.supabase
            .channel(`notifications_${currentUser.uid}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${currentUser.uid}`
            }, (payload) => {
                const notifications = appState.get('notificationsData');
                notifications.unshift(payload.new);
                appState.set('notificationsData', notifications.slice(0, CONFIG.LIMITS.MAX_NOTIFICATIONS));
                this.updateUI();
                this.showToast(payload.new);
            })
            .subscribe();

        appState.addCleanup(() => {
            if (this.subscription) {
                this.subscription.unsubscribe();
                this.subscription = null;
            }
        });
    }

    async create(type, targetUserId, data) {
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser || targetUserId === currentUser.uid) return;

        const notification = {
            type,
            from_user: UserManager.getCurrentUserData()?.username || 'Utente',
            from_user_id: currentUser.uid,
            user_id: targetUserId,
            read: false,
            created_at: new Date().toISOString(),
            ...data
        };

        return ErrorHandler.handleAsync(
            () => db.createNotification(notification),
            null,
            'Create Notification'
        );
    }

    updateUI() {
        const notifications = appState.get('notificationsData');
        const unreadCount = notifications.filter(n => !n.read).length;

        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    async updateBadges() {
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser) return;

        const sectionsToCheck = Object.keys(CONFIG.SECTIONS).filter(key => 
            CONFIG.SECTIONS[key].type === 'forum' && UserManager.canAccessSection(key)
        );

        for (const sectionKey of sectionsToCheck) {
            const navItem = document.querySelector(`[data-section="${sectionKey}"]`);
            if (!navItem) continue;

            try {
                const newCount = await this.countNewThreadsInSection(sectionKey);
                this.updateSectionBadge(navItem, newCount);
            } catch (error) {
                console.error(`Errore conteggio per ${sectionKey}:`, error);
            }
        }
    }

    async countNewThreadsInSection(sectionKey) {
        const userSectionVisits = appState.get('userSectionVisits');
        const lastVisit = userSectionVisits[sectionKey];
        if (!lastVisit) return 0;

        const threads = await db.getThreads(sectionKey);
        return threads.filter(thread => {
            const threadTime = new Date(thread.created_at).getTime();
            return threadTime > new Date(lastVisit).getTime();
        }).length;
    }

    updateSectionBadge(navItem, newCount) {
        const existingBadge = navItem.querySelector('.section-badge');
        if (existingBadge) existingBadge.remove();

        if (newCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'section-badge';
            badge.textContent = newCount > 99 ? '99+' : newCount.toString();
            badge.title = `${newCount} nuovi thread`;
            navItem.appendChild(badge);
        }
    }

    showToast(notification) {
        // Implementazione toast per nuove notifiche
        const toast = document.createElement('div');
        toast.className = 'toast mention';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">Nuova menzione</div>
                <div class="toast-message">${notification.from_user} ti ha menzionato</div>
            </div>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

const notificationManager = new NotificationManager();

// =====================================================
// GESTIONE NAVIGAZIONE
// =====================================================

class NavigationManager {
    static switchSection(sectionKey) {
        if (appState.get('switchingSections')) return;
        appState.set('switchingSections', true);

        const section = CONFIG.SECTIONS[sectionKey];
        if (!section || !UserManager.canAccessSection(sectionKey)) {
            appState.set('switchingSections', false);
            return;
        }

        const previousSection = appState.get('currentSection');
        appState.set('currentSection', sectionKey);

        // Aggiorna UI
        document.getElementById('section-title').textContent = section.title;
        document.getElementById('section-description').textContent = section.description || '';

        // Nascondi tutti i contenuti
        ['forum-content', 'chat-content', 'thread-view'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

        // Mostra contenuto appropriato
        this.showSectionContent(section);

        // Aggiorna navigazione
        this.updateNavigation(sectionKey);

        // Marca sezione precedente come visitata
        if (previousSection && previousSection !== sectionKey) {
            setTimeout(() => this.markSectionAsVisited(previousSection), 100);
        }

        setTimeout(() => appState.set('switchingSections', false), 500);
    }

    static showSectionContent(section) {
        const sectionKey = appState.get('currentSection');

        switch (section.type) {
            case 'forum':
                document.getElementById('forum-content').style.display = 'block';
                document.getElementById('new-thread-btn').style.display = 'block';
                ContentManager.loadThreads(sectionKey);
                break;
            case 'chat':
                document.getElementById('chat-content').style.display = 'flex';
                ContentManager.loadMessages(sectionKey);
                break;
            case 'admin':
                document.getElementById('forum-content').style.display = 'block';
                AdminManager.loadContent(sectionKey);
                break;
            case 'dashboard':
                document.getElementById('forum-content').style.display = 'block';
                DashboardManager.load();
                break;
        }
    }

    static updateNavigation(sectionKey) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const targetNav = document.querySelector(`[data-section="${sectionKey}"]`);
        if (targetNav) {
            targetNav.classList.add('active');
            const badge = targetNav.querySelector('.section-badge');
            if (badge) badge.remove();
        }
    }

    static async markSectionAsVisited(sectionKey) {
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser) return;

        const userSectionVisits = appState.get('userSectionVisits');
        const visitTimestamp = new Date().toISOString();
        userSectionVisits[sectionKey] = visitTimestamp;
        appState.set('userSectionVisits', userSectionVisits);

        // Salva in localStorage come fallback
        const storageKey = `hc_section_visits_${currentUser.uid}`;
        localStorage.setItem(storageKey, JSON.stringify(userSectionVisits));

        // Aggiorna badge
        notificationManager.updateBadgesDebounced();
    }
}

// =====================================================
// GESTIONE CONTENUTI
// =====================================================

class ContentManager {
    static async loadThreads(sectionKey) {
        return ErrorHandler.handleAsync(
            async () => {
                const threads = await db.getThreads(sectionKey);
                this.displayThreads(threads);
            },
            null,
            'Load Threads'
        );
    }

    static displayThreads(threads) {
        const threadList = document.getElementById('thread-list');
        if (!threadList) return;

        if (threads.length === 0) {
            threadList.innerHTML = this.getEmptyThreadsHTML();
            return;
        }

        const visibleThreads = threads.filter(thread => {
            if (UserManager.hasRole(CONFIG.USER_ROLES.CLAN_MOD)) return true;
            return !thread.status || thread.status === 'approved';
        });

        threadList.innerHTML = this.getThreadsHeaderHTML() + 
            visibleThreads.map(thread => this.getThreadItemHTML(thread)).join('');
    }

    static getEmptyThreadsHTML() {
        return `
            <div class="forum-header">
                <div>Discussione</div>
                <div>Risposte</div>
                <div>Visualizzazioni</div>
                <div>Ultimo Messaggio</div>
            </div>
            <div style="text-align: center; padding: 40px; color: #666;">
                Nessun thread in questa sezione. Creane uno!
            </div>
        `;
    }

    static getThreadsHeaderHTML() {
        return `
            <div class="forum-header">
                <div>Discussione</div>
                <div>Risposte</div>
                <div>Visualizzazioni</div>
                <div>Ultimo Messaggio</div>
            </div>
        `;
    }

    static getThreadItemHTML(thread) {
        const statusClass = thread.status === 'pending' ? 'thread-pending' : 
                           thread.status === 'rejected' ? 'thread-rejected' : '';
        
        return `
            <div class="thread-item ${statusClass}">
                <div class="thread-main">
                    <div class="thread-title" onclick="openThread('${thread.id}', '${appState.get('currentSection')}')">
                        ${thread.title}
                    </div>
                    <div class="thread-author-info">
                        <span class="thread-author-name">da ${thread.author}</span>
                    </div>
                </div>
                <div class="thread-replies">${thread.replies || 0}</div>
                <div class="thread-stats">${thread.views || 0}</div>
                <div class="thread-last-post">
                    <div>${Utils.formatTime(thread.created_at)}</div>
                    <div>da <strong>${thread.author}</strong></div>
                </div>
            </div>
        `;
    }

    static async loadMessages(sectionKey) {
        // Implementazione per caricare messaggi chat
        // Similar pattern a loadThreads ma per messaggi
    }

    static async createThread(threadData) {
        return ErrorHandler.handleAsync(
            async () => {
                const currentUser = UserManager.getCurrentUser();
                if (!currentUser) throw new Error('Utente non autenticato');

                const thread = await db.createThread({
                    ...threadData,
                    author: UserManager.getCurrentUserData()?.username || 'Utente',
                    author_id: currentUser.uid,
                    section: appState.get('currentSection'),
                    status: 'approved',
                    replies: 0,
                    views: 0
                });

                await this.loadThreads(appState.get('currentSection'));
                return thread;
            },
            null,
            'Create Thread'
        );
    }
}

// =====================================================
// GESTIONE ADMIN
// =====================================================

class AdminManager {
    static async loadContent(sectionKey) {
        switch (sectionKey) {
            case 'admin-users':
                await this.loadUsersManagement();
                break;
            case 'admin-clans':
                await this.loadClansManagement();
                break;
        }
    }

    static async loadUsersManagement() {
        const threadList = document.getElementById('thread-list');
        if (!threadList) return;

        threadList.innerHTML = `
            <div class="admin-panel">
                <h3>👥 Gestione Utenti</h3>
                <div id="users-loading">🔄 Caricamento utenti...</div>
                <div id="users-grid" class="users-grid"></div>
            </div>
        `;

        return ErrorHandler.handleAsync(
            async () => {
                const users = await db.getUsers();
                appState.set('allUsers', users);
                this.displayUsers(users);
            },
            null,
            'Load Users Management'
        );
    }

    static displayUsers(users) {
        const loadingDiv = document.getElementById('users-loading');
        const usersGrid = document.getElementById('users-grid');
        
        if (!loadingDiv || !usersGrid) return;

        loadingDiv.style.display = 'none';
        
        if (users.length === 0) {
            usersGrid.innerHTML = '<div>Nessun utente trovato</div>';
            return;
        }

        usersGrid.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-card-name">
                        ${user.username}
                        <span class="user-role role-${user.role?.replace('_', '-') || 'user'}">
                            ${user.role === 'superuser' ? 'SUPER' : user.role === 'clan_mod' ? 'MOD' : 'USER'}
                        </span>
                    </div>
                </div>
                <div class="user-card-info">
                    <div><strong>Email:</strong> ${user.email}</div>
                    <div><strong>Clan:</strong> ${user.clan || 'Nessuno'}</div>
                    <div><strong>Registrato:</strong> ${Utils.formatTime(user.created_at)}</div>
                </div>
            </div>
        `).join('');
    }

    static async loadClansManagement() {
        const threadList = document.getElementById('thread-list');
        if (!threadList) return;

        threadList.innerHTML = `
            <div class="admin-panel">
                <h3>🏰 Gestione Clan</h3>
                <p>Funzionalità di gestione clan disponibile solo in modalità locale per questa demo.</p>
            </div>
        `;
    }
}

// =====================================================
// GESTIONE DASHBOARD
// =====================================================

class DashboardManager {
    static load() {
        const threadList = document.getElementById('thread-list');
        if (!threadList) return;

        const currentUser = UserManager.getCurrentUser();
        const currentUserData = UserManager.getCurrentUserData();

        threadList.innerHTML = `
            <div class="dashboard-container">
                <div class="welcome-section">
                    <h2>🏰 Benvenuto in Hustle Castle Council</h2>
                    <p>Il tuo centro di comando per strategie, clan e conquiste!</p>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>👤 Profilo</h3>
                        <p>Utente: <strong>${currentUserData?.username || 'Ospite'}</strong></p>
                        <p>Clan: <strong>${currentUserData?.clan || 'Nessuno'}</strong></p>
                        <p>Ruolo: <strong>${this.getRoleDisplayName()}</strong></p>
                    </div>
                    
                    <div class="stat-card">
                        <h3>🔥 Stato</h3>
                        <p>Connessione: <strong>${appState.get('isConnected') ? '🟢 Online' : '🔴 Offline'}</strong></p>
                        <p>Modalità: <strong>${window.useFirebase ? '🔥 Firebase + 🗄️ Supabase' : '🏠 Locale'}</strong></p>
                    </div>
                    
                    <div class="stat-card">
                        <h3>🚀 Azioni Rapide</h3>
                        <button onclick="NavigationManager.switchSection('eventi')" class="quick-btn">📅 Eventi</button>
                        <button onclick="NavigationManager.switchSection('chat-generale')" class="quick-btn">💬 Chat</button>
                        <button onclick="NavigationManager.switchSection('oggetti')" class="quick-btn">⚔️ Oggetti</button>
                    </div>
                </div>
            </div>
        `;
    }

    static getRoleDisplayName() {
        const role = UserManager.getCurrentUserRole();
        switch (role) {
            case CONFIG.USER_ROLES.SUPERUSER: return 'Super Admin';
            case CONFIG.USER_ROLES.CLAN_MOD: return 'Clan Moderator';
            default: return 'Utente';
        }
    }
}

// =====================================================
// EVENT LISTENERS E INIZIALIZZAZIONE
// =====================================================

class EventManager {
    static setupEventListeners() {
        // Login/Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => UserManager.logout());

        // Navigazione
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                if (section) NavigationManager.switchSection(section);
            });
        });

        // Form submissions
        ['email', 'password', 'username'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                    }
                });
            }
        });
    }

    static setupCleanupListeners() {
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            appState.performCleanup();
        });

        // Cleanup on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                appState.performCleanup();
            }
        });
    }
}

// =====================================================
// FUNZIONI GLOBALI PER COMPATIBILITÀ
// =====================================================

// Esporta funzioni per compatibilità con HTML
window.switchSection = NavigationManager.switchSection;
window.UserManager = UserManager;
window.NavigationManager = NavigationManager;
window.ContentManager = ContentManager;
window.NotificationManager = notificationManager;

// Funzioni di form
window.switchToLogin = () => appState.set('isLoginMode', true);
window.switchToRegister = () => appState.set('isLoginMode', false);

window.handleSubmit = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;

    try {
        if (appState.get('isLoginMode')) {
            const user = await UserManager.login({ email, password });
            appState.set('currentUser', user);
            await UserManager.loadUserProfile();
            notificationManager.init();
        } else {
            const user = await UserManager.register({ email, password, username });
            appState.set('currentUser', user);
            await UserManager.loadUserProfile();
            notificationManager.init();
        }
    } catch (error) {
        console.error('Errore form:', error);
        alert(error.message);
    }
};

window.createThread = async () => {
    const title = document.getElementById('thread-title-input').value.trim();
    const content = document.getElementById('thread-content-input').value.trim();

    if (!title || !content) {
        alert('Inserisci sia il titolo che il contenuto del thread');
        return;
    }

    try {
        await ContentManager.createThread({ title, content });
        document.getElementById('threadCreationModal').style.display = 'none';
        document.getElementById('thread-title-input').value = '';
        document.getElementById('thread-content-input').value = '';
        alert('Thread creato con successo!');
    } catch (error) {
        console.error('Errore creazione thread:', error);
        alert('Errore nella creazione del thread');
    }
};

// Funzioni modal
window.showThreadCreationModal = () => {
    document.getElementById('threadCreationModal').style.display = 'flex';
};

window.hideThreadCreationModal = () => {
    document.getElementById('threadCreationModal').style.display = 'none';
};

// =====================================================
// INIZIALIZZAZIONE APPLICAZIONE
// =====================================================

async function initializeApp() {
    console.log('🔥 Inizializzazione applicazione refactorizzata...');

    try {
        // Inizializza database
        await db.init();

        // Imposta Firebase se disponibile
        if (window.firebaseImports) {
            appState.set('firebaseReady', true);
            
            // Setup auth state listener
            const { onAuthStateChanged } = window.firebaseImports;
            onAuthStateChanged(window.firebaseAuth, async (user) => {
                if (user) {
                    appState.set('currentUser', user);
                    await UserManager.loadUserProfile();
                    await notificationManager.init();
                } else {
                    appState.set('currentUser', null);
                    UserManager.updateUI();
                }
            });
        }

        // Setup event listeners
        EventManager.setupEventListeners();
        EventManager.setupCleanupListeners();

        // Carica dashboard iniziale
        NavigationManager.switchSection('home');
        
        // Inizializza dati locali se necessario
        if (!window.useFirebase) {
            initializeLocalData();
        }

        console.log('✅ Applicazione inizializzata con successo');

    } catch (error) {
        console.error('❌ Errore inizializzazione:', error);
        alert('Errore di inizializzazione. L\'app funzionerà in modalità ridotta.');
    }
}

// Inizializza al caricamento della pagina
window.addEventListener('load', initializeApp);

// Disabilita Activity Tracker se presente
window.addEventListener('load', () => {
    if (window.activityTracker) {
        window.activityTracker.init = function() {
            console.log('🔕 Activity Tracker disabilitato');
        };
    }
});

// Demo data initialization
function initializeLocalData() {
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
    
    if (Object.keys(users).length === 0) {
        const defaultUsers = {
            'admin@hustlecastle.com': {
                uid: 'super_admin_001',
                username: 'SuperAdmin',
                email: 'admin@hustlecastle.com',
                password: 'admin123',
                clan: 'Nessuno',
                role: CONFIG.USER_ROLES.SUPERUSER,
                created_at: new Date().toISOString()
            },
            'mod@draghi.com': {
                uid: 'clan_mod_001',
                username: 'ModeratoreDraghi',
                email: 'mod@draghi.com',
                password: 'mod123',
                clan: 'Draghi Rossi',
                role: CONFIG.USER_ROLES.CLAN_MOD,
                created_at: new Date().toISOString()
            },
            'player@leoni.com': {
                uid: 'user_001',
                username: 'GiocatoreLeoni',
                email: 'player@leoni.com',
                password: 'player123',
                clan: 'Leoni Neri',
                role: CONFIG.USER_ROLES.USER,
                created_at: new Date().toISOString()
            }
        };

        localStorage.setItem('hc_local_users', JSON.stringify(defaultUsers));
    }
}

console.log('🏰 Hustle Castle Council - Script Refactorizzato Caricato');