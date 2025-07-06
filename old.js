window.addEventListener('load', async() => {
    await new Promise(resolve => {
        const checkFirebase = () => {
            if (window.firebaseApp && window.firebaseAuth && window.firebaseDatabase) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
    initializeApp();
});
let currentUser = null;
let currentSection = 'home';
let messageListeners = {};
let threadListeners = {};
let messageCount = 0;
let isConnected = false;
let firebaseReady = false;
let isLoginMode = true;
let currentUserData = null;
let currentThread = null;
let currentThreadId = null;
let currentThreadSection = null;
let commentImageUploadInitialized = false;
let notificationsData = [];
let unreadNotificationsCount = 0;
let allUsers = [];
let mentionAutocompleteVisible = false;
let currentMentionInput = null;
let currentMentionPosition = 0;
const USER_ROLES = {
    SUPERUSER: 'superuser',
    CLAN_MOD: 'clan_mod',
    USER: 'user'
};
let signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, GoogleAuthProvider, signInWithPopup, ref, push, set, get, onValue, off, serverTimestamp, onDisconnect, child, update, storageRef, uploadBytes, getDownloadURL, deleteObject;
window.switchToLogin = switchToLogin;
window.switchToRegister = switchToRegister;
window.handleSubmit = handleSubmit;
window.handleGoogleLogin = handleGoogleLogin;
window.sendMessage = sendMessage;
window.showThreadCreationModal = showThreadCreationModal;
window.hideThreadCreationModal = hideThreadCreationModal;
window.createThread = createThread;
window.openThread = openThread;
window.backToForum = backToForum;
window.addComment = addComment;
window.toggleEmoticonPicker = toggleEmoticonPicker;
window.addEmoticon = addEmoticon;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.approveThread = approveThread;
window.rejectThread = rejectThread;
window.assignClan = assignClan;
window.changeUserRole = changeUserRole;
window.removFromClan = removFromClan;
window.createNewClan = createNewClan;
window.deleteClan = deleteClan;
window.switchSection = switchSection;
window.handleImageSelect = handleImageSelect;
window.removeSelectedImage = removeSelectedImage;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
window.toggleCommentImageUpload = toggleCommentImageUpload;
window.handleCommentImageSelect = handleCommentImageSelect;
window.removeCommentSelectedImage = removeCommentSelectedImage;
window.handleCommentImageSelect = handleCommentImageSelect;
window.removeCommentSelectedImage = removeCommentSelectedImage;
window.cleanupCommentImageUpload = cleanupCommentImageUpload;
window.toggleNotificationsPanel = toggleNotificationsPanel;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.handleNotificationClick = handleNotificationClick;
window.selectMentionSuggestion = selectMentionSuggestion;
window.dismissToast = dismissToast;
window.handleToastAction = handleToastAction;
function getCurrentUserRole() {
    return currentUserData?.role || USER_ROLES.USER;
}
function getCurrentUserClan() {
    const clanElement = document.getElementById('currentClan');
    return clanElement ? clanElement.textContent : 'Nessuno';
}
function hasRole(requiredRole) {
    const currentRole = getCurrentUserRole();
    if (currentRole === USER_ROLES.SUPERUSER)
        return true;
    if (requiredRole === USER_ROLES.CLAN_MOD && currentRole === USER_ROLES.CLAN_MOD)
        return true;
    if (requiredRole === USER_ROLES.USER)
        return true;
    return false;
}
function isClanModerator() {
    const currentRole = getCurrentUserRole();
    const userClan = getCurrentUserClan();
    return (currentRole === USER_ROLES.CLAN_MOD || currentRole === USER_ROLES.SUPERUSER) && userClan !== 'Nessuno';
}
function canModerateSection(sectionKey) {
    const currentRole = getCurrentUserRole();
    const userClan = getCurrentUserClan();
    if (currentRole === USER_ROLES.SUPERUSER)
        return true;
    if (sectionKey.startsWith('clan-') && currentRole === USER_ROLES.CLAN_MOD) {
        return userClan !== 'Nessuno';
    }
    return false;
}
function canAccessSection(sectionKey) {
    const section = sectionConfig[sectionKey];
    if (!section)
        return false;
    if (sectionKey.startsWith('clan-') && getCurrentUserClan() === 'Nessuno') {
        return false;
    }
    if (section.requiredRole === USER_ROLES.SUPERUSER && getCurrentUserRole() !== USER_ROLES.SUPERUSER) {
        return false;
    }
    return true;
}
const sectionConfig = {
    'home': {
        title: '🏠 Dashboard',
        description: 'Benvenuto nel Forum di Hustle Castle Council! Ecco le ultime novità',
        type: 'dashboard'
    },
    'eventi': {
        title: '📅 Eventi',
        description: 'Scopri tutti gli eventi in corso e futuri di Hustle Castle Council',
        type: 'forum'
    },
    'oggetti': {
        title: '⚔️ Oggetti',
        description: 'Discussioni su armi, armature e oggetti del gioco',
        type: 'forum'
    },
    'novita': {
        title: '🆕 Novità',
        description: 'Ultime notizie e aggiornamenti del gioco',
        type: 'forum'
    },
    'chat-generale': {
        title: '💬 Chat Generale',
        description: 'Chiacchiere libere tra tutti i giocatori',
        type: 'chat'
    },
    'associa-clan': {
        title: '🏠 Associa Clan',
        description: 'Richiedi di essere associato ad un clan',
        type: 'forum'
    },
    'admin-users': {
        title: '👥 Gestione Utenti',
        description: 'Pannello amministrativo per gestire utenti e clan',
        type: 'admin',
        requiredRole: USER_ROLES.SUPERUSER
    },
    'admin-clans': {
        title: '🏰 Gestione Clan',
        description: 'Creazione e gestione dei clan',
        type: 'admin',
        requiredRole: USER_ROLES.SUPERUSER
    },
    'clan-moderation': {
        title: '🛡️ Moderazione Clan',
        description: 'Gestione e approvazione contenuti del clan',
        type: 'clan-admin'
    },
    'clan-chat': {
        title: '💬 Chat Clan',
        description: 'Chat privata del tuo clan',
        type: 'chat'
    },
    'clan-war': {
        title: '⚔️ Guerra Clan',
        description: 'Strategie e coordinamento per le guerre tra clan',
        type: 'forum'
    },
    'clan-premi': {
        title: '🏆 Premi Clan',
        description: 'Ricompense e achievement del clan',
        type: 'forum'
    },
    'clan-consigli': {
        title: '💡 Consigli Clan',
        description: 'Suggerimenti e guide per i membri del clan',
        type: 'forum'
    },
    'clan-bacheca': {
        title: '🏰 Bacheca Clan',
        description: 'Messaggi importanti per i membri del clan',
        type: 'forum'
    }
};
function initializeNotifications() {
    console.log('🔔 Inizializzazione sistema notifiche...');
    loadNotifications();
    setupMentionListeners();
    loadUsersList();
    document.addEventListener('click', handleClickOutside);
    console.log('✅ Sistema notifiche inizializzato');
}
function detectMentions(text) {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        const username = match[1];
        const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user && user.uid !== currentUser?.uid) {
            mentions.push({
                username: username,
                userId: user.uid,
                position: match.index,
                length: match[0].length
            });
        }
    }
    return mentions;
}
function handleClickOutside(event) {
    const notifPanel = document.getElementById('notificationsPanel');
    const notifBell = document.getElementById('notificationsBell');
    if (!notifPanel.contains(event.target) && !notifBell.contains(event.target)) {
        notifPanel.classList.remove('show');
    }
    const mentionAutocomplete = document.getElementById('mentionAutocomplete');
    const isInputFocused = ['message-input', 'comment-text', 'thread-content-input'].includes(event.target.id);
    if (!mentionAutocomplete.contains(event.target) && !isInputFocused) {
        hideMentionAutocomplete();
    }
}
function highlightMentions(text, currentUserId = null) {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    return text.replace(mentionRegex, (match, username) => {
        const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            const isSelf = user.uid === currentUserId;
            const className = isSelf ? 'mention self' : 'mention';
            return `<span class="${className}" data-user-id="${user.uid}">@${username}</span>`;
        }
        return match;
    });
}
function setupMentionListeners() {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('input', handleMentionInput);
        messageInput.addEventListener('keydown', handleMentionKeydown);
    }
    const commentTextarea = document.getElementById('comment-text');
    if (commentTextarea) {
        commentTextarea.addEventListener('input', handleMentionInput);
        commentTextarea.addEventListener('keydown', handleMentionKeydown);
    }
    const threadTextarea = document.getElementById('thread-content-input');
    if (threadTextarea) {
        threadTextarea.addEventListener('input', handleMentionInput);
        threadTextarea.addEventListener('keydown', handleMentionKeydown);
    }
}
function handleMentionInput(event) {
    const input = event.target;
    const text = input.value;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
            currentMentionInput = input;
            currentMentionPosition = lastAtIndex;
            showMentionAutocomplete(textAfterAt, input);
            return;
        }
    }
    hideMentionAutocomplete();
}
function handleMentionKeydown(event) {
    if (!mentionAutocompleteVisible)
        return;
    const autocomplete = document.getElementById('mentionAutocomplete');
    const suggestions = autocomplete.querySelectorAll('.mention-suggestion');
    let selectedIndex = Array.from(suggestions).findIndex(s => s.classList.contains('selected'));
    switch (event.key) {
    case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        updateAutocompleteSelection(suggestions, selectedIndex);
        break;
    case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateAutocompleteSelection(suggestions, selectedIndex);
        break;
    case 'Enter':
    case 'Tab':
        event.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            selectMentionSuggestion(suggestions[selectedIndex]);
        }
        break;
    case 'Escape':
        hideMentionAutocomplete();
        break;
    }
}
function showMentionAutocomplete(query, inputElement) {
    const autocomplete = document.getElementById('mentionAutocomplete');
    const filteredUsers = allUsers.filter(user => user.username.toLowerCase().includes(query.toLowerCase()) && user.uid !== currentUser?.uid).slice(0, 8);
    if (filteredUsers.length === 0) {
        hideMentionAutocomplete();
        return;
    }
    autocomplete.innerHTML = filteredUsers.map((user, index) => `

        <div class="mention-suggestion ${index === 0 ? 'selected' : ''}" 

             data-username="${user.username}" 

             data-user-id="${user.uid}"

             onclick="selectMentionSuggestion(this)">

            <div class="mention-suggestion-avatar">

                ${user.username.charAt(0).toUpperCase()}

            </div>

            <div class="mention-suggestion-info">

                <div class="mention-suggestion-name">${user.username}</div>

                <div class="mention-suggestion-clan">${user.clan || 'Nessun clan'}</div>

            </div>

        </div>

    `).join('');
    positionAutocomplete(inputElement);
    autocomplete.classList.add('show');
    mentionAutocompleteVisible = true;
}
function positionAutocomplete(inputElement) {
    const autocomplete = document.getElementById('mentionAutocomplete');
    const rect = inputElement.getBoundingClientRect();
    autocomplete.style.position = 'fixed';
    autocomplete.style.left = rect.left + 'px';
    autocomplete.style.top = (rect.bottom + 5) + 'px';
    autocomplete.style.width = Math.min(300, rect.width) + 'px';
}
function updateAutocompleteSelection(suggestions, selectedIndex) {
    suggestions.forEach((s, i) => {
        s.classList.toggle('selected', i === selectedIndex);
    });
}
function selectMentionSuggestion(suggestion) {
    const username = suggestion.dataset.username;
    const input = currentMentionInput;
    if (input && username) {
        const text = input.value;
        const beforeMention = text.substring(0, currentMentionPosition);
        const afterCursor = text.substring(input.selectionStart);
        const newText = beforeMention + '@' + username + ' ' + afterCursor;
        input.value = newText;
        const newCursorPos = beforeMention.length + username.length + 2;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();
    }
    hideMentionAutocomplete();
}
function hideMentionAutocomplete() {
    const autocomplete = document.getElementById('mentionAutocomplete');
    autocomplete.classList.remove('show');
    mentionAutocompleteVisible = false;
    currentMentionInput = null;
}
async function createNotification(type, targetUserId, data) {
    if (!currentUser || targetUserId === currentUser.uid)
        return;
    const notification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: type,
        fromUser: currentUser.displayName || 'Utente',
        fromUserId: currentUser.uid,
        targetUserId: targetUserId,
        timestamp: window.useFirebase ? serverTimestamp() : Date.now(),
        read: false,
        ...data
    };
    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            const notifRef = ref(window.firebaseDatabase, `notifications/${targetUserId}/${notification.id}`);
            await set(notifRef, notification);
        } else {
            saveLocalNotification(targetUserId, notification);
        }
        console.log('📨 Notifica creata:', notification);
        showMentionToast(notification);
    } catch (error) {
        console.error('Errore creazione notifica:', error);
    }
}
function saveLocalNotification(targetUserId, notification) {
    const storageKey = `hc_notifications_${targetUserId}`;
    const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
    notifications.unshift(notification);
    if (notifications.length > 50) {
        notifications.splice(50);
    }
    localStorage.setItem(storageKey, JSON.stringify(notifications));
    if (targetUserId === currentUser?.uid) {
        loadNotifications();
    }
}
function loadNotifications() {
    if (!currentUser)
        return;
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const notifRef = ref(window.firebaseDatabase, `notifications/${currentUser.uid}`);
        onValue(notifRef, (snapshot) => {
            const notifications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    notifications.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }
            notifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            notificationsData = notifications;
            updateNotificationsUI();
        });
    } else {
        const storageKey = `hc_notifications_${currentUser.uid}`;
        const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
        notificationsData = notifications;
        updateNotificationsUI();
    }
}
function updateNotificationsUI() {
    const unreadCount = notificationsData.filter(n => !n.read).length;
    unreadNotificationsCount = unreadCount;
    const badge = document.getElementById('notificationBadge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    if (document.getElementById('notificationsPanel').classList.contains('show')) {
        displayNotificationsList();
    }
}
function displayNotificationsList() {
    const listContainer = document.getElementById('notificationsList');
    if (notificationsData.length === 0) {
        listContainer.innerHTML = `

            <div class="notifications-empty">

                <div class="empty-icon">🔕</div>

                <div>Nessuna notifica</div>

            </div>

        `;
        return;
    }
    listContainer.innerHTML = notificationsData.map(notification => `

        <div class="notification-item ${!notification.read ? 'unread' : ''}" 

             onclick="handleNotificationClick('${notification.id}')">

            <div class="notification-content">

                <div class="notification-icon">

                    ${getNotificationIcon(notification.type)}

                </div>

                <div class="notification-text">

                    <div class="notification-user">${notification.fromUser}</div>

                    <div class="notification-message">${getNotificationMessage(notification)}</div>

                    ${notification.threadTitle ? `<div class="notification-thread">in"${notification.threadTitle}"</div>` : ''}

                    <div class="notification-time">${formatTime(notification.timestamp)}</div>

                </div>

            </div>

        </div>

    `).join('');
}
function getNotificationIcon(type) {
    switch (type) {
    case 'mention':
        return '💬';
    case 'reply':
        return '↩️';
    case 'like':
        return '❤️';
    default:
        return '🔔';
    }
}
function getNotificationMessage(notification) {
    switch (notification.type) {
    case 'mention':
        return `ti ha menzionato: "${notification.message || 'Messaggio'}"`;
    case 'reply':
        return `ha risposto al tuo thread: "${notification.message || 'Risposta'}"`;
    default:
        return notification.message || 'Nuova notifica';
    }
}
function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    const isVisible = panel.classList.contains('show');
    if (isVisible) {
        panel.classList.remove('show');
    } else {
        panel.classList.add('show');
        displayNotificationsList();
        setTimeout(() => {
            markVisibleNotificationsAsRead();
        }, 1000);
    }
}
async function handleNotificationClick(notificationId) {
    const notification = notificationsData.find(n => n.id === notificationId);
    if (!notification)
        return;
    await markNotificationAsRead(notificationId);
    navigateToNotificationContent(notification);
    document.getElementById('notificationsPanel').classList.remove('show');
}
function navigateToNotificationContent(notification) {
    closeMobileMenu();
    if (notification.threadId && notification.section) {
        switchSection(notification.section);
        setTimeout(() => {
            openThread(notification.threadId, notification.section);
        }, 500);
    } else if (notification.section) {
        switchSection(notification.section);
    }
}
async function markNotificationAsRead(notificationId) {
    const notification = notificationsData.find(n => n.id === notificationId);
    if (!notification || notification.read)
        return;
    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            const notifRef = ref(window.firebaseDatabase, `notifications/${currentUser.uid}/${notificationId}/read`);
            await set(notifRef, true);
        } else {
            const storageKey = `hc_notifications_${currentUser.uid}`;
            const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const index = notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                notifications[index].read = true;
                localStorage.setItem(storageKey, JSON.stringify(notifications));
                loadNotifications();
            }
        }
    } catch (error) {
        console.error('Errore aggiornamento notifica:', error);
    }
}
async function markAllNotificationsAsRead() {
    const unreadNotifications = notificationsData.filter(n => !n.read);
    for (const notification of unreadNotifications) {
        await markNotificationAsRead(notification.id);
    }
}
function markVisibleNotificationsAsRead() {
    const unreadNotifications = notificationsData.filter(n => !n.read).slice(0, 10);
    unreadNotifications.forEach(notification => {
        markNotificationAsRead(notification.id);
    });
}
function showMentionToast(notification) {
    if (notification.targetUserId !== currentUser?.uid)
        return;
    const toast = createToast({
        type: 'mention',
        title: 'Nuova menzione',
        message: `${notification.fromUser} ti ha menzionato`,
        duration: 5000,
        actions: [{
                text: 'Vai al messaggio',
                action: () => navigateToNotificationContent(notification)
            }, {
                text: 'Ignora',
                action: () => {},
                secondary: true
            }
        ]
    });
    showToast(toast);
}
function createToast(options) {
    const toastId = 'toast_' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast ${options.type || ''}`;
    toast.id = toastId;
    toast.innerHTML = `

        <div class="toast-header">

            <div class="toast-icon">${getNotificationIcon(options.type || 'notification')}</div>

            <div class="toast-title">${options.title}</div>

            <button class="toast-close" onclick="dismissToast('${toastId}')">&times;</button>

        </div>

        <div class="toast-body">

            ${options.message}

        </div>

        ${options.actions ? `<div class="toast-actions">${options.actions.map((action, index) => `

                    <button class="toast-btn ${action.secondary ? 'toast-btn-secondary' : ''}" 

                            onclick="handleToastAction('${toastId}', ${index})">

                        ${action.text}

                    </button>

                `).join('')}</div>` : ''}

    `;
    toast._actions = options.actions || [];
    return toast;
}
function showToast(toastElement) {
    const container = document.getElementById('toastContainer');
    container.appendChild(toastElement);
    setTimeout(() => {
        toastElement.classList.add('show');
    }, 100);
    const duration = 5000;
    setTimeout(() => {
        dismissToast(toastElement.id);
    }, duration);
}
function dismissToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }
}
function handleToastAction(toastId, actionIndex) {
    const toast = document.getElementById(toastId);
    if (toast && toast._actions && toast._actions[actionIndex]) {
        toast._actions[actionIndex].action();
        dismissToast(toastId);
    }
}
async function loadUsersList() {
    try {
        let users = [];
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            const usersRef = ref(window.firebaseDatabase, 'users');
            const snapshot = await get(usersRef);
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    users.push({
                        uid: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }
        } else {
            const localUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            users = Object.values(localUsers);
        }
        allUsers = users;
        console.log('👥 Caricati', users.length, 'utenti per autocomplete');
    } catch (error) {
        console.error('Errore caricamento utenti:', error);
    }
}
function initializeApp() {
    console.log('🔥 Inizializzazione applicazione...');
    if (window.firebaseImports) {
        ({
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            onAuthStateChanged,
            signOut,
            updateProfile,
            GoogleAuthProvider,
            signInWithPopup,
            ref,
            push,
            set,
            get,
            onValue,
            off,
            serverTimestamp,
            onDisconnect,
            child,
            update,
            storageRef,
            uploadBytes,
            getDownloadURL,
            deleteObject
        } = window.firebaseImports);
        firebaseReady = true;
    }
    const statusEl = document.getElementById('firebase-status');
    const hintEl = document.getElementById('demo-hint');
    if (window.useFirebase && window.firebaseAuth && firebaseReady) {
        console.log('✅ Modalità Firebase attiva');
        statusEl.style.background = 'rgba(0, 255, 0, 0.1)';
        statusEl.style.color = '#008800';
        if (window.appCheckEnabled) {
            statusEl.textContent = '🔥 Firebase + App Check attivi - Sistema completo';
        } else {
            statusEl.textContent = '🔥 Firebase attivo - App Check disabilitato (funzionalità ridotte)';
        }
        hintEl.innerHTML = `🔐 <strong>Primo accesso?</strong><br>

                    1. Registrati normalmente (sarai USER)<br>

                    2. Configura regole Firebase o usa admin@hustlecastle.com / admin123 (SUPER)<br>

                    3. Usa il pannello admin per promuovere il tuo account`;
        onAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
                currentUser = user;
                handleUserLogin(user);
            } else {
                currentUser = null;
                handleUserLogout();
            }
        });
        const connectedRef = ref(window.firebaseDatabase, '.info/connected');
        onValue(connectedRef, (snapshot) => {
            isConnected = snapshot.val() === true;
            updateConnectionStatus();
        });
    } else {
        console.log('⚠️ Modalità locale attiva');
        statusEl.style.background = 'rgba(255, 165, 0, 0.1)';
        statusEl.style.color = '#ff8800';
        statusEl.textContent = '⚠️ Modalità Demo - Login Google non disponibile';
        hintEl.textContent = '💡 Demo: SuperUser (admin@hustlecastle.com / admin123), Clan Mod (mod@draghi.com / mod123), User (player@leoni.com / player123)';
        document.getElementById('googleLoginBtn').style.display = 'none';
        document.getElementById('recaptcha-container').style.display = 'none';
        initializeLocalData();
        handleUserLogout();
        isConnected = true;
        updateConnectionStatus();
    }
    setupEventListeners();
    initializeNotifications();
    switchSection('home');
}
function handleUserLogin(user) {
    console.log('👤 Utente loggato:', user.email);
    document.getElementById('loginModal').style.display = 'none';
    updateUserInterface();
    setupUserPresence();
    loadUserProfile();
    if (currentSection === 'home') {
        setTimeout(() => {
            loadDashboard();
        }, 500);
    }
}
function handleUserLogout() {
    console.log('👤 Utente disconnesso');
    cleanupListeners();
    currentUserData = null;
    document.getElementById('currentUsername').textContent = 'Ospite';
    document.getElementById('currentClan').textContent = 'Nessuno';
    document.getElementById('sidebarClan').textContent = 'Nessuno';
    document.getElementById('userStatus').className = 'offline-indicator';
    document.getElementById('logoutBtn').style.display = 'none';
    const userNameElement = document.getElementById('currentUsername');
    const existingBadge = userNameElement.querySelector('.user-role');
    if (existingBadge) {
        existingBadge.remove();
    }
    updateClanSectionsAccess();
    updateAdminSectionsAccess();
    if (currentSection.startsWith('clan-') || currentSection.startsWith('admin-')) {
        switchSection('home');
    }
    if (document.getElementById('thread-view').style.display === 'flex') {
        backToForum();
    }
    document.getElementById('loginModal').style.display = 'flex';
}
async function loadUserProfile() {
    if (!currentUser) {
        updateClanSectionsAccess();
        return;
    }
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && get) {
        try {
            const userRef = ref(window.firebaseDatabase, `users/${currentUser.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
                document.getElementById('currentUsername').textContent = currentUserData.username || 'Utente';
                document.getElementById('currentClan').textContent = currentUserData.clan || 'Nessuno';
                document.getElementById('sidebarClan').textContent = currentUserData.clan || 'Nessuno';
                updateUserRoleBadge();
                if (currentSection === 'home') {
                    loadDashboard();
                }
            }
        } catch (error) {
            console.error('Errore caricamento profilo:', error);
        }
    } else {
        loadLocalUserProfile();
    }
    updateClanSectionsAccess();
    updateAdminSectionsAccess();
}
function loadLocalUserProfile() {
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
    const userData = users[currentUser.email];
    if (userData) {
        const realUsers = Object.values(users).filter(user => !user.uid.startsWith('super_admin_') && !user.uid.startsWith('clan_mod_') && !user.uid.startsWith('user_'));
        if (realUsers.length > 0 && realUsers[0].uid === userData.uid) {
            if (!userData.role || userData.role === USER_ROLES.USER) {
                userData.role = USER_ROLES.SUPERUSER;
                users[currentUser.email] = userData;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                console.log('🎉 Utente promosso a SUPERUSER:', currentUser.email);
                setTimeout(() => {
                    alert('🎉 Congratulazioni! Sei stato promosso a SUPERUSER come primo utente registrato!');
                }, 1000);
            }
        }
        currentUserData = userData;
        document.getElementById('currentUsername').textContent = userData.username;
        document.getElementById('currentClan').textContent = userData.clan || 'Nessuno';
        document.getElementById('sidebarClan').textContent = userData.clan || 'Nessuno';
        updateUserRoleBadge();
        if (currentSection === 'home') {
            loadDashboard();
        }
    }
}
function updateUserRoleBadge() {
    const userNameElement = document.getElementById('currentUsername');
    const existingBadge = userNameElement.querySelector('.user-role');
    if (existingBadge) {
        existingBadge.remove();
    }
    const role = getCurrentUserRole();
    const badge = document.createElement('span');
    badge.className = `user-role role-${role.replace('_', '-')}`;
    switch (role) {
    case USER_ROLES.SUPERUSER:
        badge.textContent = 'SUPER';
        badge.className = 'user-role role-superuser';
        break;
    case USER_ROLES.CLAN_MOD:
        badge.textContent = 'MOD';
        badge.className = 'user-role role-moderator';
        break;
    default:
        badge.textContent = 'USER';
        badge.className = 'user-role role-user';
        break;
    }
    userNameElement.appendChild(badge);
}
function updateAdminSectionsAccess() {
    const adminSection = document.getElementById('adminSection');
    const clanModerationItem = document.getElementById('clanModerationItem');
    const canAccessGlobalAdmin = getCurrentUserRole() === USER_ROLES.SUPERUSER;
    if (canAccessGlobalAdmin) {
        adminSection.style.display = 'block';
    } else {
        adminSection.style.display = 'none';
        if (currentSection.startsWith('admin-')) {
            switchSection('eventi');
        }
    }
    const canModerateClan = isClanModerator();
    if (canModerateClan) {
        clanModerationItem.style.display = 'block';
    } else {
        clanModerationItem.style.display = 'none';
        if (currentSection === 'clan-moderation') {
            switchSection('clan-chat');
        }
    }
}
function setupUserPresence() {
    if (!currentUser || !window.useFirebase || !window.firebaseDatabase || !firebaseReady || !ref || !onDisconnect || !set || !child || !serverTimestamp)
        return;
    try {
        const userStatusRef = ref(window.firebaseDatabase, `presence/${currentUser.uid}`);
        const userRef = ref(window.firebaseDatabase, `users/${currentUser.uid}`);
        onDisconnect(userStatusRef).set({
            state: 'offline',
            lastSeen: serverTimestamp()
        });
        set(child(userRef, 'lastSeen'), serverTimestamp());
        set(userStatusRef, {
            state: 'online',
            lastSeen: serverTimestamp()
        });
    } catch (error) {
        console.error('Errore setup presenza:', error);
    }
}
function updateUserInterface() {
    if (currentUser) {
        document.getElementById('userStatus').className = 'online-indicator';
        document.getElementById('logoutBtn').style.display = 'inline-block';
    }
    updateClanSectionsAccess();
}
function updateClanSectionsAccess() {
    const userClan = getCurrentUserClan();
    const clanItems = document.querySelectorAll('.nav-item.clan-only');
    clanItems.forEach(item => {
        if (userClan === 'Nessuno') {
            item.classList.add('disabled');
            item.style.pointerEvents = 'none';
        } else {
            item.classList.remove('disabled');
            item.style.pointerEvents = 'auto';
        }
    });
}
function updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (window.useFirebase) {
        if (isConnected) {
            statusEl.className = 'connection-status online';
            statusEl.textContent = '🟢 Firebase Connesso';
        } else {
            statusEl.className = 'connection-status offline';
            statusEl.textContent = '🔴 Firebase Disconnesso';
        }
    } else {
        statusEl.className = 'connection-status online';
        statusEl.textContent = '🟡 Modalità Demo Locale';
    }
}
function switchToLogin() {
    isLoginMode = true;
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    document.getElementById('registrationFields').classList.remove('show');
    document.getElementById('submitBtn').textContent = 'Accedi';
    document.getElementById('googleBtnText').textContent = 'Continua con Google';
    document.getElementById('username').value = '';
    if (window.useFirebase && window.appCheckEnabled && typeof window.resetRecaptcha === 'function') {
        window.resetRecaptcha();
    }
    hideError();
}
function switchToRegister() {
    isLoginMode = false;
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registrationFields').classList.add('show');
    document.getElementById('submitBtn').textContent = 'Registrati';
    document.getElementById('googleBtnText').textContent = 'Registrati con Google';
    if (window.useFirebase && window.appCheckEnabled && typeof window.resetRecaptcha === 'function') {
        window.resetRecaptcha();
    }
    hideError();
}
function handleSubmit() {
    if (isLoginMode) {
        handleLogin();
    } else {
        handleRegister();
    }
}
async function handleGoogleLogin() {
    if (!window.useFirebase || !firebaseReady || !signInWithPopup || !window.googleProvider) {
        alert('Login con Google non disponibile in modalità demo');
        return;
    }
    const googleBtn = document.getElementById('googleLoginBtn');
    googleBtn.disabled = true;
    googleBtn.innerHTML = `

                <div style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>

                Connessione...

            `;
    try {
        const result = await signInWithPopup(window.firebaseAuth, window.googleProvider);
        const user = result.user;
        const userRef = ref(window.firebaseDatabase, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            const username = user.displayName || prompt('Inserisci il tuo username:');
            const clan = prompt('Inserisci il tuo clan (opzionale):') || 'Nessuno';
            if (!username) {
                throw new Error('Username richiesto');
            }
            const userRole = await determineUserRole();
            await set(userRef, {
                username: username,
                email: user.email,
                clan: clan,
                role: userRole,
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                provider: 'google'
            });
            const roleMessage = userRole === USER_ROLES.SUPERUSER ? ' Ti sono stati assegnati i privilegi di SUPERUSER!' : '';
            showSuccess(`Account Google creato con successo!${roleMessage}`);
        } else {
            showSuccess('Login con Google effettuato con successo!');
        }
    } catch (error) {
        console.error('Errore login Google:', error);
        let errorMessage = 'Errore nel login con Google';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login annullato dall\'utente';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Popup bloccato dal browser. Abilita i popup per questo sito.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Errore di connessione. Controlla la tua connessione internet.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        showError(errorMessage);
    } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = `

                    <svg width="20" height="20" viewBox="0 0 24 24">

                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>

                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>

                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>

                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>

                    </svg>

                    <span>${isLoginMode ? 'Continua con Google' : 'Registrati con Google'}</span>

                `;
    }
}
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
        showError('Inserisci email e password');
        return;
    }
    if (window.useFirebase && window.appCheckEnabled && typeof grecaptcha !== 'undefined') {
        if (!window.verifyRecaptcha()) {
            showError('🤖 Completa la verifica reCAPTCHA');
            return;
        }
    }
    showLoading(true);
    hideError();
    try {
        if (window.useFirebase && firebaseReady && signInWithEmailAndPassword) {
            await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            showSuccess('Login effettuato con successo!');
        } else {
            await simulateLogin(email, password);
        }
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } catch (error) {
        console.error('Errore login:', error);
        showError(getErrorMessage(error));
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } finally {
        showLoading(false);
    }
}
async function handleRegister() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    if (!email || !password || !username) {
        showError('Inserisci email, password e username');
        return;
    }
    if (window.useFirebase && window.appCheckEnabled && typeof grecaptcha !== 'undefined') {
        if (!window.verifyRecaptcha()) {
            showError('🤖 Completa la verifica reCAPTCHA');
            return;
        }
    }
    showLoading(true);
    hideError();
    try {
        const userRole = await determineUserRole();
        if (window.useFirebase && firebaseReady && createUserWithEmailAndPassword) {
            const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            const user = userCredential.user;
            await updateProfile(user, {
                displayName: username
            });
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
            await simulateRegister(email, password, username, 'Nessuno', userRole);
        }
        const roleMessage = userRole === USER_ROLES.SUPERUSER ? '\n🎉 Sei il primo utente! Ti sono stati assegnati i privilegi di SUPERUSER.' : '';
        showSuccess(`Account creato con successo!${roleMessage}`);
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } catch (error) {
        console.error('Errore registrazione:', error);
        showError(getErrorMessage(error));
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } finally {
        showLoading(false);
    }
}
async function determineUserRole() {
    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            return USER_ROLES.USER;
        } else {
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            const realUsers = Object.values(users).filter(user => !user.uid.startsWith('super_admin_') && !user.uid.startsWith('clan_mod_') && !user.uid.startsWith('user_'));
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
async function simulateLogin(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            const user = users[email];
            if (user && user.password === password) {
                currentUser = {
                    uid: user.uid,
                    email: email,
                    displayName: user.username
                };
                currentUserData = user;
                document.getElementById('currentUsername').textContent = user.username;
                document.getElementById('currentClan').textContent = user.clan || 'Nessuno';
                document.getElementById('sidebarClan').textContent = user.clan || 'Nessuno';
                handleUserLogin(currentUser);
                resolve();
            } else {
                reject(new Error('Email o password non validi'));
            }
        }, 1000);
    });
}
async function simulateRegister(email, password, username, clan, role) {
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
                clan: clan || 'Nessuno',
                role: role || USER_ROLES.USER,
                createdAt: Date.now()
            };
            localStorage.setItem('hc_local_users', JSON.stringify(users));
            currentUser = {
                uid: userId,
                email: email,
                displayName: username
            };
            currentUserData = users[email];
            document.getElementById('currentUsername').textContent = username;
            document.getElementById('currentClan').textContent = clan || 'Nessuno';
            document.getElementById('sidebarClan').textContent = clan || 'Nessuno';
            handleUserLogin(currentUser);
            resolve();
        }, 1000);
    });
}
async function handleLogout() {
    try {
        if (window.useFirebase && window.firebaseAuth && firebaseReady && signOut) {
            await signOut(window.firebaseAuth);
        } else {
            currentUser = null;
            handleUserLogout();
        }
    } catch (error) {
        console.error('Errore logout:', error);
    }
}
function initializeLocalData() {
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
    const realUsers = Object.values(users).filter(user => !user.uid.startsWith('super_admin_') && !user.uid.startsWith('clan_mod_') && !user.uid.startsWith('user_'));
    if (realUsers.length > 0) {
        const firstRealUser = realUsers[0];
        if (!firstRealUser.role || firstRealUser.role === USER_ROLES.USER) {
            firstRealUser.role = USER_ROLES.SUPERUSER;
            for (const email in users) {
                if (users[email].uid === firstRealUser.uid) {
                    users[email].role = USER_ROLES.SUPERUSER;
                    localStorage.setItem('hc_local_users', JSON.stringify(users));
                    console.log('🎉 Primo utente reale promosso a SUPERUSER:', email);
                    break;
                }
            }
        }
    }
    if (realUsers.length === 0) {
        const defaultSuperUser = {
            uid: 'super_admin_001',
            username: 'SuperAdmin',
            email: 'admin@hustlecastle.com',
            password: 'admin123',
            clan: 'Nessuno',
            role: USER_ROLES.SUPERUSER,
            createdAt: Date.now()
        };
        const clanMod = {
            uid: 'clan_mod_001',
            username: 'ModeratoreDraghi',
            email: 'mod@draghi.com',
            password: 'mod123',
            clan: 'Draghi Rossi',
            role: USER_ROLES.CLAN_MOD,
            createdAt: Date.now()
        };
        const normalUser = {
            uid: 'user_001',
            username: 'GiocatoreLeoni',
            email: 'player@leoni.com',
            password: 'player123',
            clan: 'Leoni Neri',
            role: USER_ROLES.USER,
            createdAt: Date.now()
        };
        users['admin@hustlecastle.com'] = defaultSuperUser;
        users['mod@draghi.com'] = clanMod;
        users['player@leoni.com'] = normalUser;
        localStorage.setItem('hc_local_users', JSON.stringify(users));
        console.log('🔧 Utenti di esempio creati:', {
            superuser: {
                email: 'admin@hustlecastle.com',
                password: 'admin123'
            },
            clanMod: {
                email: 'mod@draghi.com',
                password: 'mod123'
            },
            user: {
                email: 'player@leoni.com',
                password: 'player123'
            }
        });
    }
    const sections = ['eventi', 'oggetti', 'novita', 'associa-clan'];
    sections.forEach(section => {
        const threads = JSON.parse(localStorage.getItem(`hc_threads_${section}`) || '[]');
        if (threads.length === 0) {
            const exampleThreads = getExampleThreads(section);
            localStorage.setItem(`hc_threads_${section}`, JSON.stringify(exampleThreads));
        }
    });
    const messages = JSON.parse(localStorage.getItem(`hc_messages_chat-generale`) || '[]');
    if (messages.length === 0) {
        const exampleMessages = getExampleMessages('chat-generale');
        localStorage.setItem(`hc_messages_chat-generale`, JSON.stringify(exampleMessages));
    }
    const exampleClans = ['Draghi Rossi', 'Leoni Neri', 'Aquile Bianche'];
    exampleClans.forEach(clan => {
        const safeClanName = clan.replace(/[.#$[\]]/g, '_');
        const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
        clanSections.forEach(section => {
            const storageKey = `hc_threads_clan_${safeClanName}_${section}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (threads.length === 0) {
                const exampleThreads = getExampleClanThreads(section, clan);
                localStorage.setItem(storageKey, JSON.stringify(exampleThreads));
            }
        });
        const chatStorageKey = `hc_messages_clan_${safeClanName}_clan-chat`;
        const chatMessages = JSON.parse(localStorage.getItem(chatStorageKey) || '[]');
        if (chatMessages.length === 0) {
            const exampleMessages = getExampleClanMessages(clan);
            localStorage.setItem(chatStorageKey, JSON.stringify(exampleMessages));
        }
    });
}
function getExampleThreads(section) {
    const examples = {
        'eventi': [{
                id: 'evt_demo_1',
                title: '🎃 Evento Halloween - Strategie e Premi',
                content: 'Discussione sulle migliori strategie per l\'evento Halloween! Condividete i vostri setup e le ricompense ottenute.',
                author: 'EventMaster',
                createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
                replies: 15,
                views: 87,
                status: 'approved',
                imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY2NjAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfjoMgRXZlbnRvIEhhbGxvd2VlbiDwn46DPC90ZXh0Pjwvc3ZnPg==',
                imageName: 'halloween_event.jpg'
            }
        ],
        'novita': [{
                id: 'news_demo_1',
                title: '📢 Aggiornamento 1.58.0 - Nuove Features!',
                content: 'Ecco tutte le novità dell\'ultimo aggiornamento: nuovi eroi, dungeon migliorati e molto altro!',
                author: 'GameUpdater',
                createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
                replies: 23,
                views: 145,
                status: 'approved',
                imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDA4OGNjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfkKIgQWdnaW9ybmFtZW50byB2MS41OC4wIPCfkKI8L3RleHQ+PC9zdmc+',
                imageName: 'update_158.jpg'
            }
        ]
    };
    return examples[section] || [];
}
function getExampleClanThreads(section, clanName) {
    const examples = {
        'clan-war': [],
        'clan-premi': [],
        'clan-consigli': [],
        'clan-bacheca': []
    };
    return examples[section] || [];
}
function getExampleMessages(section) {
    const examples = {
        'chat-generale': []
    };
    return examples[section] || [];
}
function getExampleClanMessages(clanName) {
    return [{
            id: 'cmsg1',
            author: `Leader${clanName.replace(' ', '')}`,
            message: `Benvenuti nel clan ${clanName}! Preparatevi per la guerra di domani!`,
            timestamp: Date.now() - 15 * 60 * 1000
        }, {
            id: 'cmsg2',
            author: 'WarriorClan',
            message: 'Le mie truppe sono pronte! ⚔️',
            timestamp: Date.now() - 10 * 60 * 1000
        }, {
            id: 'cmsg3',
            author: 'DefenderMaster',
            message: 'Chi ha bisogno di aiuto per il setup delle difese?',
            timestamp: Date.now() - 5 * 60 * 1000
        }
    ];
}
function getErrorMessage(error) {
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
    case 'auth/recaptcha-not-enabled':
        return 'reCAPTCHA non abilitato. Contatta l\'amministratore.';
    case 'auth/too-many-requests':
        return 'Troppi tentativi. Riprova più tardi o completa la verifica reCAPTCHA.';
    default:
        if (error.message && error.message.includes('recaptcha')) {
            return 'Errore nella verifica reCAPTCHA. Riprova.';
        }
        return error.message || 'Errore sconosciuto';
    }
}
function showError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => errorEl.classList.remove('show'), 5000);
}
function showSuccess(message) {
    const successEl = document.getElementById('loginSuccess');
    successEl.textContent = message;
    successEl.classList.add('show');
    setTimeout(() => successEl.classList.remove('show'), 3000);
}
function hideError() {
    document.getElementById('loginError').classList.remove('show');
}
function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    loadingEl.classList.toggle('show', show);
}
function switchSection(sectionKey) {
    const section = sectionConfig[sectionKey];
    if (!section)
        return;
    if (!canAccessSection(sectionKey)) {
        if (sectionKey.startsWith('clan-')) {
            if (sectionKey === 'clan-moderation' && !isClanModerator()) {
                alert('Solo i moderatori del clan possono accedere a questa sezione!');
            } else {
                alert('Devi appartenere a un clan per accedere a questa sezione!');
            }
        } else if (sectionKey.startsWith('admin-')) {
            alert('Non hai i permessi per accedere a questa sezione!');
        }
        return;
    }
    cleanupListeners();
    cleanupCommentImageUpload();
    currentSection = sectionKey;
    document.getElementById('section-title').textContent = section.title;
    document.getElementById('section-description').textContent = section.description;
    const forumContent = document.getElementById('forum-content');
    const chatContent = document.getElementById('chat-content');
    const threadView = document.getElementById('thread-view');
    const newThreadBtn = document.getElementById('new-thread-btn');
    forumContent.style.display = 'none';
    chatContent.style.display = 'none';
    threadView.style.display = 'none';
    newThreadBtn.style.display = 'none';
    if (section.type === 'forum') {
        forumContent.style.display = 'block';
        newThreadBtn.style.display = 'block';
        loadThreads(sectionKey);
    } else if (section.type === 'chat') {
        chatContent.style.display = 'flex';
        loadMessages(sectionKey);
    } else if (section.type === 'admin') {
        forumContent.style.display = 'block';
        loadAdminContent(sectionKey);
    } else if (section.type === 'clan-admin') {
        forumContent.style.display = 'block';
        loadClanModerationContent();
    } else if (section.type === 'dashboard') {
        forumContent.style.display = 'block';
        loadDashboard();
    }
    closeMobileMenu();
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionKey}"]`).classList.add('active');
}
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (sidebar.classList.contains('open')) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}
function openMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = 'auto';
}
function loadDashboard() {
    const threadList = document.getElementById('thread-list');
    if (!currentUser) {
        threadList.innerHTML = `

                    <div style="text-align: center; padding: 60px; color: #666;">

                        <div style="font-size: 64px; margin-bottom: 20px;">⏳</div>

                        <h2 style="color: #8B4513; margin-bottom: 10px;">Caricamento Dashboard...</h2>

                        <p>Preparazione della tua area personale</p>

                    </div>

                `;
        return;
    }
    const userName = currentUser.displayName || 'Guerriero';
    const userClan = getCurrentUserClan();
    const userRole = getCurrentUserRole();
    let welcomeMessage = '';
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
        welcomeMessage = '🌅 Buongiorno';
    } else if (currentHour < 18) {
        welcomeMessage = '☀️ Buon pomeriggio';
    } else {
        welcomeMessage = '🌙 Buonasera';
    }
    let roleDisplay = '';
    switch (userRole) {
    case USER_ROLES.SUPERUSER:
        roleDisplay = '<span class="user-role role-superuser">👑 SUPER ADMIN</span>';
        break;
    case USER_ROLES.CLAN_MOD:
        roleDisplay = '<span class="user-role role-moderator">🛡️ MODERATORE</span>';
        break;
    default:
        roleDisplay = '<span class="user-role role-user">⚔️ GUERRIERO</span>';
    }
    threadList.innerHTML = `

                <div style="display: grid; gap: 25px;">

                    <!-- Welcome Section -->

                    <div style="background: linear-gradient(135deg, rgba(218, 165, 32, 0.1) 0%, rgba(244, 164, 96, 0.1) 100%); border-radius: 15px; padding: 25px; border: 2px solid rgba(218, 165, 32, 0.3); position: relative; overflow: hidden;">

                        <div style="position: absolute; top: -20px; right: -20px; font-size: 80px; opacity: 0.1;">🏰</div>

                        <h2 style="color: #8B4513; margin-bottom: 15px; font-size: 28px;">

                            ${welcomeMessage}, ${userName}! ${roleDisplay}

                        </h2>

                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">

                            Benvenuto nel forum ufficiale di Hustle Castle Council! Qui puoi discutere strategie, 

                            condividere esperienze e rimanere aggiornato sugli ultimi eventi del gioco.

                        </p>

                        ${userClan !== 'Nessuno' ? `<div style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #3498db;"><strong style="color: #3498db;">🏰 Clan:${userClan}</strong><p style="color: #666; font-size: 14px; margin-top: 5px;">Accedi alle sezioni dedicate del tuo clan dal menu laterale</p></div>` : `<div style="background: rgba(255, 193, 7, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #ffc107;"><strong style="color: #e68900;">⚠️ Non hai un clan</strong><p style="color: #666; font-size: 14px; margin-top: 5px;">Unisciti a un clan per accedere a funzionalità esclusive!</p></div>`}

                    </div>



                    <!-- Quick Navigation -->

                    <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">

                        <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">

                            <span>🧭</span> Navigazione Rapida

                        </h3>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">

                            <div class="dashboard-card" onclick="switchSection('eventi')" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">

                                <div style="font-size: 32px; margin-bottom: 10px;">📅</div>

                                <h4 style="margin-bottom: 8px;">Eventi</h4>

                                <p style="font-size: 12px; opacity: 0.9;">Scopri eventi in corso</p>

                            </div>

                            <div class="dashboard-card" onclick="switchSection('oggetti')" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">

                                <div style="font-size: 32px; margin-bottom: 10px;">⚔️</div>

                                <h4 style="margin-bottom: 8px;">Oggetti</h4>

                                <p style="font-size: 12px; opacity: 0.9;">Guide su armi e armature</p>

                            </div>

                            <div class="dashboard-card" onclick="switchSection('novita')" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">

                                <div style="font-size: 32px; margin-bottom: 10px;">🆕</div>

                                <h4 style="margin-bottom: 8px;">Novità</h4>

                                <p style="font-size: 12px; opacity: 0.9;">Ultimi aggiornamenti</p>

                            </div>

       <div class="dashboard-card" onclick="switchSection('novita')" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">

                                <div style="font-size: 32px; margin-bottom: 10px;"> 🏠</div>

                                <h4 style="margin-bottom: 8px;">Associa Clan</h4>

                                <p style="font-size: 12px; opacity: 0.9;">Richiedi di associarti ad un clan</p>

                            </div>

                            <div class="dashboard-card" onclick="switchSection('chat-generale')" style="background: linear-gradient(135deg, #27ae60, #229954); color: white; padding: 20px; border-radius: 10px; cursor: pointer; transition: transform 0.3s ease; text-align: center;">

                                <div style="font-size: 32px; margin-bottom: 10px;">💬</div>

                                <h4 style="margin-bottom: 8px;">Chat</h4>

                                <p style="font-size: 12px; opacity: 0.9;">Chiacchiera con la community</p>

                            </div>

                        </div>

                    </div>



                    <!-- Stats and Tips Grid -->

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">

                        <!-- Forum Stats -->

                        <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">

                            <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">

                                <span>📊</span> Statistiche Forum

                            </h3>

                            <div style="display: grid; gap: 15px;">

                                <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">

                                    <span style="color: #666;">📝 Thread Totali</span>

                                    <strong style="color: #8B4513;">${getForumStats().totalThreads}</strong>

                                </div>

                                <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">

                                    <span style="color: #666;">💬 Messaggi Chat</span>

                                    <strong style="color: #8B4513;">${getForumStats().totalMessages}</strong>

                                </div>

                                <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">

                                    <span style="color: #666;">👥 Utenti Registrati</span>

                                    <strong style="color: #8B4513;">${getForumStats().totalUsers}</strong>

                                </div>

                                <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(218, 165, 32, 0.1); border-radius: 8px;">

                                    <span style="color: #666;">🏰 Clan Attivi</span>

                                    <strong style="color: #8B4513;">${getForumStats().totalClans}</strong>

                                </div>

                            </div>

                        </div>



                        <!-- Quick Tips -->

                        <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">

                            <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">

                                <span>💡</span> Suggerimenti Rapidi

                            </h3>

                            <div style="display: grid; gap: 12px;">

                                <div style="padding: 12px; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border-left: 4px solid #2ecc71;">

                                    <strong style="color: #27ae60; font-size: 14px;">🎯 Partecipa alle Discussioni</strong>

                                    <p style="color: #666; font-size: 12px; margin-top: 4px;">Condividi le tue strategie nella sezione Eventi</p>

                                </div>

                                <div style="padding: 12px; background: rgba(52, 152, 219, 0.1); border-radius: 8px; border-left: 4px solid #3498db;">

                                    <strong style="color: #2980b9; font-size: 14px;">🏰 Unisciti a un Clan</strong>

                                    <p style="color: #666; font-size: 12px; margin-top: 4px;">Accedi a chat e funzionalità esclusive</p>

                                </div>

                                <div style="padding: 12px; background: rgba(155, 89, 182, 0.1); border-radius: 8px; border-left: 4px solid #9b59b6;">

                                    <strong style="color: #8e44ad; font-size: 14px;">⚔️ Condividi Equipaggiamenti</strong>

                                    <p style="color: #666; font-size: 12px; margin-top: 4px;">Mostra le tue armi leggendarie!</p>

                                </div>

                                <div style="padding: 12px; background: rgba(230, 126, 34, 0.1); border-radius: 8px; border-left: 4px solid #e67e22;">

                                    <strong style="color: #d68910; font-size: 14px;">📢 Rimani Aggiornato</strong>

                                    <p style="color: #666; font-size: 12px; margin-top: 4px;">Controlla regolarmente le Novità</p>

                                </div>

        <div style="padding: 12px; background: rgba(230, 126, 34, 0.1); border-radius: 8px; border-left: 4px solid #e67e22;">

                                    <strong style="color: #d68910; font-size: 14px;">📢 Unisciti ad un clan</strong>

                                    <p style="color: #666; font-size: 12px; margin-top: 4px;">Cerca il tuo clan per e unisciti al gruppo</p>

                                </div>

                            </div>

                        </div>

                    </div>



                    <!-- Quick Actions & Tips -->

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">

                        <!-- Quick Actions -->

                        <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">

                            <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">

                                <span>⚡</span> Azioni Rapide

                            </h3>

                            <div style="display: grid; gap: 12px;">

                                <button onclick="switchSection('eventi')" class="quick-action-btn" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;">

                                    <span style="font-size: 20px;">📅</span>

                                    <span>Controlla Eventi Attuali</span>

                                </button>

                                <button onclick="switchSection('chat-generale')" class="quick-action-btn" style="background: linear-gradient(135deg, #27ae60, #229954); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;">

                                    <span style="font-size: 20px;">💬</span>

                                    <span>Inizia una Conversazione</span>

                                </button>

                                <button onclick="showThreadCreationModal()" class="quick-action-btn" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;">

                                    <span style="font-size: 20px;">✍️</span>

                                    <span>Crea Nuovo Thread</span>

                                </button>

                                ${userClan !== 'Nessuno' ? `<button onclick="switchSection('clan-chat')"class="quick-action-btn"style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px;"><span style="font-size: 20px;">🏰</span><span>Chat del Clan</span></button>` : `<button onclick="alert('Unisciti a un clan per accedere a questa funzionalità!')"class="quick-action-btn"style="background: linear-gradient(135deg, #95a5a6, #7f8c8d); color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 10px; opacity: 0.6;"><span style="font-size: 20px;">🔒</span><span>Chat del Clan(Locked)</span></button>`}

                            </div>

                        </div>



                        <!-- Daily Tips -->

                        <div style="background: rgba(255, 255, 255, 0.8); border-radius: 15px; padding: 25px; border: 1px solid rgba(218, 165, 32, 0.3);">

                            <h3 style="color: #8B4513; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">

                                <span>🎯</span> Consiglio del Giorno

                            </h3>

                            <div id="daily-tip" style="padding: 20px; background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(155, 89, 182, 0.1)); border-radius: 10px; border-left: 4px solid #3498db;">

                                <!-- Il consiglio verrà inserito qui -->

                            </div>

                            <div style="margin-top: 15px; text-align: center;">

                                <button onclick="loadDailyTip()" style="background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; color: #3498db; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.3s ease;">

                                    🔄 Nuovo Consiglio

                                </button>

                            </div>

                        </div>

                    </div>



                    <!-- Community Highlights -->

                    <div style="background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(39, 174, 96, 0.1)); border-radius: 15px; padding: 25px; border: 2px solid #27ae60;">

                        <h3 style="color: #27ae60; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">

                            <span>🌟</span> In Evidenza nella Community

                        </h3>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">

                            <div style="text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid rgba(39, 174, 96, 0.3);">

                                <div style="font-size: 48px; margin-bottom: 10px;">🔥</div>

                                <h4 style="color: #27ae60; margin-bottom: 8px;">Thread Più Visto</h4>

                                <p style="font-size: 12px; color: #666;">Guide alle Gemme Leggendarie</p>

                                <p style="font-size: 11px; color: #999;">445 visualizzazioni</p>

                            </div>

                            <div style="text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid rgba(39, 174, 96, 0.3);">

                                <div style="font-size: 48px; margin-bottom: 10px;">👑</div>

                                <h4 style="color: #27ae60; margin-bottom: 8px;">Utente del Mese</h4>

                                <p style="font-size: 12px; color: #666;">ProPlayer123</p>

                                <p style="font-size: 11px; color: #999;">67 contributi</p>

                            </div>

                            <div style="text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid rgba(39, 174, 96, 0.3);">

                                <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>

                                <h4 style="color: #27ae60; margin-bottom: 8px;">Clan Più Attivo</h4>

                                <p style="font-size: 12px; color: #666;">Draghi Rossi</p>

                                <p style="font-size: 11px; color: #999;">25 membri attivi</p>

                            </div>

                        </div>

                    </div>

                </div>

            `;
    const style = document.createElement('style');
    style.textContent = `

                .dashboard-card:hover {

                    transform: translateY(-5px) scale(1.02);

                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);

                }

            `;
    document.head.appendChild(style);
    setTimeout(loadDailyTip, 300);
}
function getForumStats() {
    let totalThreads = 0;
    let totalMessages = 0;
    let totalUsers = 0;
    let totalClans = 0;
    try {
        if (window.useFirebase) {
            return {
                totalThreads: '50+',
                totalMessages: '200+',
                totalUsers: '15+',
                totalClans: '5+'
            };
        } else {
            const sections = ['eventi', 'oggetti', 'novita', 'associa-clan'];
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
}
function loadDailyTip() {
    const tipContainer = document.getElementById('daily-tip');
    if (!tipContainer)
        return;
    const tips = [{
            icon: '⚔️',
            title: 'Strategia di Combattimento',
            content: 'Bilancia sempre la tua formazione: un tank robusto, DPS equilibrati e un supporto possono fare la differenza in arena!'
        }, {
            icon: '🏰',
            title: 'Gestione del Castello',
            content: 'Aggiorna sempre la sala del trono prima di potenziare altre stanze per massimizzare l\'efficienza delle risorse.'
        }, {
            icon: '💎',
            title: 'Gemme e Equipaggiamento',
            content: 'Non vendere mai le gemme leggendarie! Anche se sembrano deboli ora, potrebbero essere utili per upgrade futuri.'
        }, {
            icon: '🎯',
            title: 'Eventi Speciali',
            content: 'Partecipa sempre agli eventi temporanei: spesso offrono ricompense uniche che non puoi ottenere altrove!'
        }, {
            icon: '👥',
            title: 'Vita di Clan',
            content: 'Coordina sempre con il tuo clan prima delle guerre. La comunicazione è la chiave per la vittoria!'
        }, {
            icon: '📈',
            title: 'Progressione Intelligente',
            content: 'Non avere fretta di salire di Throne Room. Assicurati di avere equipaggiamento e truppe adeguate al tuo livello.'
        }, {
            icon: '🛡️',
            title: 'Difesa del Castello',
            content: 'Posiziona strategicamente le tue difese: mescola danni fisici e magici per contrastare diversi tipi di attacco.'
        }, {
            icon: '⏰',
            title: 'Gestione del Tempo',
            content: 'Ottimizza i tempi di training: inizia sempre con le truppe che richiedono più tempo prima di andare offline.'
        }, {
            icon: '🏆',
            title: 'Arena e PvP',
            content: 'Studia sempre gli avversari prima di attaccare. Una strategia ben pianificata vale più della forza bruta!'
        }, {
            icon: '💰',
            title: 'Economia del Gioco',
            content: 'Investi le gemme saggiamente: priorità a slot di barracks, mastro e velocizzazione di upgrade critici.'
        }
    ];
    const today = new Date().getDate();
    const selectedTip = tips[today % tips.length];
    tipContainer.innerHTML = `

                <div style="display: flex; align-items: flex-start; gap: 15px;">

                    <div style="font-size: 32px; flex-shrink: 0;">${selectedTip.icon}</div>

                    <div>

                        <h4 style="color: #3498db; margin: 0 0 8px 0; font-size: 16px;">${selectedTip.title}</h4>

                        <p style="color: #666; margin: 0; line-height: 1.5; font-size: 14px;">${selectedTip.content}</p>

                    </div>

                </div>

            `;
}
window.loadDailyTip = loadDailyTip;
function loadAdminContent(sectionKey) {
    const threadList = document.getElementById('thread-list');
    switch (sectionKey) {
    case 'admin-users':
        loadUsersManagement();
        break;
    case 'admin-clans':
        loadClansManagement();
        break;
    default:
        threadList.innerHTML = '<div style="text-align: center; padding: 40px;">Sezione non trovata</div>';
    }
}
function loadClanModerationContent() {
    const threadList = document.getElementById('thread-list');
    threadList.innerHTML = `

                <div class="admin-panel">

                    <h3>🛡️ Moderazione Clan ${getCurrentUserClan()}</h3>

                    <div id="moderation-content">

                        <div style="text-align: center; padding: 20px;">

                            <div>🔄 Caricamento contenuti da moderare...</div>

                        </div>

                    </div>

                </div>

            `;
    loadPendingThreads();
}
async function loadPendingThreads() {
    const moderationContent = document.getElementById('moderation-content');
    try {
        const userClan = getCurrentUserClan();
        const pendingThreads = await getPendingThreadsForClan(userClan);
        if (pendingThreads.length === 0) {
            moderationContent.innerHTML = `

                        <div style="text-align: center; padding: 20px; color: #666;">

                            ✅ Nessun contenuto in attesa di approvazione

                        </div>

                    `;
            return;
        }
        moderationContent.innerHTML = `

                    <div style="margin-bottom: 20px;">

                        <h4>📋 Thread in attesa di approvazione (${pendingThreads.length})</h4>

                    </div>

                    ${pendingThreads.map(thread => `<div class="thread-item thread-pending"style="margin-bottom: 15px;"><div class="thread-main"><div class="thread-title">${thread.title}<span class="pending-indicator">PENDING</span></div><div class="thread-author">da ${thread.author}• ${formatTime(thread.createdAt)}</div><div class="moderation-actions"><button class="approve-btn"onclick="approveThread('${thread.id}', '${thread.section}')">✅ Approva</button><button class="reject-btn"onclick="rejectThread('${thread.id}', '${thread.section}')">❌ Rifiuta</button></div></div></div>`).join('')}

                `;
    } catch (error) {
        console.error('Errore caricamento thread pending:', error);
        moderationContent.innerHTML = `

                    <div style="text-align: center; color: red;">

                        Errore nel caricamento dei contenuti da moderare

                    </div>

                `;
    }
}
async function getPendingThreadsForClan(clanName) {
    const pendingThreads = [];
    const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
    for (const section of clanSections) {
        try {
            const dataPath = getDataPath(section, 'threads');
            if (!dataPath)
                continue;
            let threads = [];
            if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
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
}
async function approveThread(threadId, section) {
    try {
        await updateThreadStatus(threadId, section, 'approved');
        alert('Thread approvato con successo!');
        loadPendingThreads();
    } catch (error) {
        console.error('Errore approvazione thread:', error);
        alert('Errore nell\'approvazione del thread');
    }
}
async function rejectThread(threadId, section) {
    const reason = prompt('Motivo del rifiuto (opzionale):');
    try {
        await updateThreadStatus(threadId, section, 'rejected', reason);
        alert('Thread rifiutato');
        loadPendingThreads();
    } catch (error) {
        console.error('Errore rifiuto thread:', error);
        alert('Errore nel rifiuto del thread');
    }
}
async function updateThreadStatus(threadId, section, status, reason = null) {
    const dataPath = getDataPath(section, 'threads');
    if (!dataPath)
        return;
    const updateData = {
        status: status,
        moderatedAt: window.useFirebase ? serverTimestamp() : Date.now(),
        moderatedBy: currentUser.displayName || 'Moderatore'
    };
    if (reason) {
        updateData.rejectionReason = reason;
    }
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const threadRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
        const snapshot = await get(threadRef);
        if (snapshot.exists()) {
            const existingData = snapshot.val();
            const updatedThread = {
                ...existingData,
                ...updateData
            };
            await set(threadRef, updatedThread);
        } else {
            console.warn(`Thread con id ${threadId} non trovato in ${dataPath}`);
        }
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const threadIndex = threads.findIndex(t => t.id === threadId);
        if (threadIndex !== -1) {
            threads[threadIndex] = {
                ...threads[threadIndex],
                ...updateData
            };
            localStorage.setItem(storageKey, JSON.stringify(threads));
        }
    }
}
async function loadUsersManagement() {
    const threadList = document.getElementById('thread-list');
    threadList.innerHTML = `

                <div class="admin-panel">

                    <h3>👥 Gestione Utenti</h3>

                    <div id="users-grid" class="users-grid">

                        <div style="text-align: center; padding: 20px;">

                            <div>🔄 Caricamento utenti...</div>

                        </div>

                    </div>

                </div>

            `;
    loadUsersList();
}
async function loadUsersList() {
    const usersGrid = document.getElementById('users-grid');
    try {
        let users = [];
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            const usersRef = ref(window.firebaseDatabase, 'users');
            const snapshot = await get(usersRef);
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    users.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }
        } else {
            const localUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            users = Object.values(localUsers);
        }
        displayUsersList(users);
    } catch (error) {
        console.error('Errore caricamento utenti:', error);
        usersGrid.innerHTML = '<div style="text-align: center; color: red;">Errore nel caricamento degli utenti</div>';
    }
}
function displayUsersList(users) {
    const usersGrid = document.getElementById('users-grid');
    if (users.length === 0) {
        usersGrid.innerHTML = '<div style="text-align: center; padding: 20px;">Nessun utente trovato</div>';
        return;
    }
    usersGrid.innerHTML = users.map(user => {
        const roleText = user.role === 'superuser' ? 'SUPER' : user.role === 'clan_mod' ? 'CLAN MOD' : 'USER';
        const roleClass = user.role === 'superuser' ? 'role-superuser' : user.role === 'clan_mod' ? 'role-moderator' : 'role-user';
        return `

                    <div class="user-card">

                        <div class="user-card-header">

                            <div class="user-card-name">

                                ${user.username} 

                                <span class="user-role ${roleClass}">

                                    ${roleText}

                                </span>

                            </div>

                            <div style="font-size: 12px; color: #666;">

                                ${formatTime(user.createdAt)}

                            </div>

                        </div>

                        <div class="user-card-info">

                            <div>📧 ${user.email}</div>

                            <div>🏰 Clan: ${user.clan || 'Nessuno'}</div>

                            <div>🔗 Provider: ${user.provider || 'email'}</div>

                        </div>

                        <div class="user-card-actions">

                            <button class="admin-btn btn-assign-clan" onclick="assignClan('${user.id || user.uid}', '${user.username}')">

                                Assegna Clan

                            </button>

                            ${getCurrentUserRole() === USER_ROLES.SUPERUSER ? `<button class="admin-btn btn-change-role"onclick="changeUserRole('${user.id || user.uid}', '${user.username}', '${user.role || 'user'}')">Cambia Ruolo</button>` : ''}

                            ${user.clan && user.clan !== 'Nessuno' ? `<button class="admin-btn btn-remove-clan"onclick="removFromClan('${user.id || user.uid}', '${user.username}')">Rimuovi Clan</button>` : ''}

                        </div>

                    </div>

                `;
    }).join('');
}
async function assignClan(userId, username) {
    const availableClans = await getAvailableClans();
    const clanList = availableClans.length > 0 ? availableClans.join('\n') : 'Nessun clan disponibile';
    const clanName = prompt(`Assegna un clan a ${username}:\n\nClan disponibili:\n${clanList}\n\nInserisci il nome del clan:`);
    if (!clanName || clanName.trim() === '')
        return;
    try {
        await updateUserClan(userId, clanName.trim());
        alert(`${username} è stato assegnato al clan "${clanName}"`);
        loadUsersList();
    } catch (error) {
        console.error('Errore assegnazione clan:', error);
        alert('Errore nell\'assegnazione del clan');
    }
}
async function changeUserRole(userId, username, currentRole) {
    if (getCurrentUserRole() !== USER_ROLES.SUPERUSER) {
        alert('Solo i superuser possono modificare i ruoli');
        return;
    }
    const newRole = prompt(`Cambia il ruolo di ${username}:\n\nRuolo attuale: ${currentRole}\n\nOpzioni:\n- user (utente normale)\n- clan_mod (moderatore di clan)\n- superuser (super amministratore)\n\nInserisci il nuovo ruolo:`);
    if (!newRole || !Object.values(USER_ROLES).includes(newRole)) {
        alert('Ruolo non valido');
        return;
    }
    try {
        await updateUserRole(userId, newRole);
        alert(`Ruolo di ${username} cambiato in "${newRole}"`);
        loadUsersList();
    } catch (error) {
        console.error('Errore cambio ruolo:', error);
        alert('Errore nel cambio del ruolo');
    }
}
async function removFromClan(userId, username) {
    if (confirm(`Rimuovere ${username} dal clan?`)) {
        try {
            await updateUserClan(userId, 'Nessuno');
            alert(`${username} è stato rimosso dal clan`);
            loadUsersList();
        } catch (error) {
            console.error('Errore rimozione clan:', error);
            alert('Errore nella rimozione dal clan');
        }
    }
}
async function updateUserClan(userId, clanName) {
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const userRef = ref(window.firebaseDatabase, `users/${userId}/clan`);
        await set(userRef, clanName);
    } else {
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        for (const email in users) {
            if (users[email].uid === userId) {
                users[email].clan = clanName;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                break;
            }
        }
    }
}
async function updateUserRole(userId, newRole) {
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const userRef = ref(window.firebaseDatabase, `users/${userId}/role`);
        await set(userRef, newRole);
    } else {
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        for (const email in users) {
            if (users[email].uid === userId) {
                users[email].role = newRole;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                break;
            }
        }
    }
}
async function loadClansManagement() {
    const threadList = document.getElementById('thread-list');
    threadList.innerHTML = `

                <div class="clan-management">

                    <h3>🏰 Gestione Clan</h3>

                    <button class="create-clan-btn" onclick="createNewClan()">

                        + Crea Nuovo Clan

                    </button>

                    <div id="clans-grid" class="clan-list">

                        <div style="text-align: center; padding: 20px;">

                            <div>🔄 Caricamento clan...</div>

                        </div>

                    </div>

                </div>

            `;
    loadClansList();
}
async function loadClansList() {
    const clansGrid = document.getElementById('clans-grid');
    try {
        const clans = await getAvailableClans();
        const clanStats = await getClanStats(clans);
        if (clans.length === 0) {
            clansGrid.innerHTML = '<div style="text-align: center; padding: 20px;">Nessun clan trovato</div>';
            return;
        }
        clansGrid.innerHTML = clans.map(clan => `

                    <div class="clan-card">

                        <h4>${clan}</h4>

                        <div class="clan-members">

                            👥 ${clanStats[clan] || 0} membri

                        </div>

                        <div style="margin-top: 10px;">

                            <button class="admin-btn btn-remove-clan" onclick="deleteClan('${clan}')">

                                Elimina Clan

                            </button>

                        </div>

                    </div>

                `).join('');
    } catch (error) {
        console.error('Errore caricamento clan:', error);
        clansGrid.innerHTML = '<div style="text-align: center; color: red;">Errore nel caricamento dei clan</div>';
    }
}
async function getAvailableClans() {
    let clans = [];
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
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
async function getClanStats(clans) {
    const stats = {};
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const usersRef = ref(window.firebaseDatabase, 'users');
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
            clans.forEach(clan => stats[clan] = 0);
            snapshot.forEach((childSnapshot) => {
                const userData = childSnapshot.val();
                if (userData.clan && stats.hasOwnProperty(userData.clan)) {
                    stats[userData.clan]++;
                }
            });
        }
    } else {
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        clans.forEach(clan => stats[clan] = 0);
        Object.values(users).forEach(user => {
            if (user.clan && stats.hasOwnProperty(user.clan)) {
                stats[user.clan]++;
            }
        });
    }
    return stats;
}
async function createNewClan() {
    const clanName = prompt('Nome del nuovo clan:');
    if (!clanName || clanName.trim() === '')
        return;
    const trimmedName = clanName.trim();
    const existingClans = await getAvailableClans();
    if (existingClans.includes(trimmedName)) {
        alert('Questo clan esiste già!');
        return;
    }
    alert(`Clan "${trimmedName}" creato! Ora puoi assegnare utenti a questo clan.`);
    loadClansList();
}
async function deleteClan(clanName) {
    if (!confirm(`Sei sicuro di voler eliminare il clan "${clanName}"?\n\nTutti i membri verranno rimossi dal clan.`)) {
        return;
    }
    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
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
                await update(ref(window.firebaseDatabase), updates);
            }
        } else {
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            Object.values(users).forEach(user => {
                if (user.clan === clanName) {
                    user.clan = 'Nessuno';
                }
            });
            localStorage.setItem('hc_local_users', JSON.stringify(users));
        }
        alert(`Clan "${clanName}" eliminato con successo`);
        loadClansList();
    } catch (error) {
        console.error('Errore eliminazione clan:', error);
        alert('Errore nell\'eliminazione del clan');
    }
}
function getDataPath(sectionKey, dataType) {
    if (sectionKey.startsWith('clan-')) {
        const userClan = getCurrentUserClan();
        if (userClan === 'Nessuno') {
            return null;
        }
        const safeClanName = userClan.replace(/[.#$[\]]/g, '_');
        return `${dataType}/clan/${safeClanName}/${sectionKey}`;
    } else {
        return `${dataType}/${sectionKey}`;
    }
}
async function uploadThreadImage(file, progressCallback) {
    if (!file)
        return null;
    try {
        if (window.useFirebase && window.firebaseStorage && firebaseReady && storageRef && uploadBytes && getDownloadURL) {
            try {
                const timestamp = Date.now();
                const filename = `threads/${currentUser.uid}/${timestamp}_${file.name}`;
                const imageRef = storageRef(window.firebaseStorage, filename);
                const uploadTask = uploadBytes(imageRef, file);
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 30;
                    if (progress > 90)
                        progress = 90;
                    progressCallback(progress);
                }, 200);
                const snapshot = await uploadTask;
                clearInterval(progressInterval);
                progressCallback(100);
                const downloadURL = await getDownloadURL(snapshot.ref);
                return downloadURL;
            } catch (storageError) {
                console.warn('⚠️ Errore Firebase Storage, uso fallback locale:', storageError.message);
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        progressCallback(100);
                        console.log('📷 Immagine convertita in base64 (fallback)');
                        resolve(e.target.result);
                    };
                    reader.readAsDataURL(file);
                });
            }
        } else {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    progressCallback(100);
                    resolve(e.target.result);
                };
                reader.readAsDataURL(file);
            });
        }
    } catch (error) {
        console.error('Errore upload immagine:', error);
        console.log('🔄 Tentativo fallback base64...');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                progressCallback(100);
                console.log('📷 Immagine salvata come base64 (fallback finale)');
                resolve(e.target.result);
            };
            reader.onerror = function () {
                reject(new Error('Errore nella conversione dell\'immagine'));
            };
            reader.readAsDataURL(file);
        });
    }
}
function updateUploadProgress(progress) {
    const progressContainer = document.getElementById('upload-progress');
    const progressPercent = Math.round(progress);
    progressContainer.innerHTML = `

                <div style="background: rgba(45, 130, 181, 0.2); border-radius: 10px; padding: 10px; margin-top: 10px;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">

                        <span style="font-size: 12px; color: #3498db; font-weight: 600;">Caricamento immagine...</span>

                        <span style="font-size: 12px; color: #3498db; font-weight: 600;">${progressPercent}%</span>

                    </div>

                    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 5px; height: 6px; overflow: hidden;">

                        <div style="background: linear-gradient(90deg, #3498db, #2ecc71); height: 100%; width: ${progressPercent}%; transition: width 0.3s ease; border-radius: 5px;"></div>

                    </div>

                </div>

            `;
    progressContainer.style.display = 'block';
    if (progress >= 100) {
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
    }
}
function loadThreads(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath)
        return;
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue && off) {
        const threadsRef = ref(window.firebaseDatabase, dataPath);
        if (threadListeners[sectionKey]) {
            const oldRef = ref(window.firebaseDatabase, threadListeners[sectionKey].path);
            off(oldRef, threadListeners[sectionKey].callback);
        }
        const callback = (snapshot) => {
            const threads = [];
            snapshot.forEach((childSnapshot) => {
                threads.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            threads.sort((a, b) => b.createdAt - a.createdAt);
            displayThreads(threads);
        };
        threadListeners[sectionKey] = {
            path: dataPath,
            callback: callback
        };
        onValue(threadsRef, callback);
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        threads.sort((a, b) => b.createdAt - a.createdAt);
        displayThreads(threads);
    }
}
function displayThreads(threads) {
    const threadList = document.getElementById('thread-list');
    if (threads.length === 0) {
        threadList.innerHTML = `

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
        return;
    }
    const visibleThreads = threads.filter(thread => {
        if (canModerateSection(currentSection)) {
            return true;
        }
        return !thread.status || thread.status === 'approved';
    });
    threadList.innerHTML = `

                <div class="forum-header">

                    <div>Discussione</div>

                    <div>Risposte</div>

                    <div>Visualizzazioni</div>

                    <div>Ultimo Messaggio</div>

                </div>

            ` + visibleThreads.map(thread => {
            const statusClass = thread.status === 'pending' ? 'thread-pending' : thread.status === 'rejected' ? 'thread-rejected' : '';
            const statusIndicator = thread.status === 'pending' ? '<span class="pending-indicator">PENDING</span>' : thread.status === 'rejected' ? '<span class="pending-indicator" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c;">RIFIUTATO</span>' : '';
            return `

                    <div class="thread-item ${statusClass}">

                        <div class="thread-main">

                            <div class="thread-title" onclick="openThread('${thread.id}', '${currentSection}')">

                                ${thread.title}

                                ${statusIndicator}

                            </div>

                            <div class="thread-author">da ${thread.author}</div>

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

                                    <span>${formatTime(thread.createdAt)}</span>

                                </div>

                            </div>

                            ${thread.status === 'pending' && canModerateSection(currentSection) ? `<div class="moderation-actions"><button class="approve-btn"onclick="approveThread('${thread.id}', '${currentSection}')">✅ Approva</button><button class="reject-btn"onclick="rejectThread('${thread.id}', '${currentSection}')">❌ Rifiuta</button></div>` : ''}

                        </div>

                        <div class="thread-replies">${thread.replies || 0}</div>

                        <div class="thread-stats">${thread.views || 0}</div>

                        <div class="thread-last-post">

                            <div>${formatTime(thread.createdAt)}</div>

                            <div>da <strong>${thread.author}</strong></div>

                        </div>

                    </div>

                `;
        }).join('');
}
function showThreadCreationModal() {
    if (!currentUser) {
        alert('Devi effettuare l\'accesso per creare thread');
        return;
    }
    if (currentSection.startsWith('clan-') && getCurrentUserClan() === 'Nessuno') {
        alert('Devi appartenere a un clan per creare thread qui!');
        return;
    }
    document.getElementById('threadCreationModal').style.display = 'flex';
    document.getElementById('thread-title-input').focus();
    setupImageUpload();
}
function setupImageUpload() {
    const imageInput = document.getElementById('thread-image-input');
    const imageLabel = document.querySelector('.image-upload-label');
    imageInput.removeEventListener('change', handleImageSelect);
    imageLabel.removeEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageSelect);
    imageLabel.addEventListener('click', () => imageInput.click());
}
function handleImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('image-preview');
    const progressContainer = document.getElementById('upload-progress');
    if (!file)
        return;
    if (!file.type.startsWith('image/')) {
        alert('Seleziona solo file immagine (JPG, PNG, GIF, etc.)');
        return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('L\'immagine è troppo grande. Massimo 5MB consentiti.');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        preview.innerHTML = `

                    <img src="${e.target.result}" alt="Anteprima immagine">

                    <button type="button" class="remove-image" onclick="removeSelectedImage()">

                        🗑️ Rimuovi Immagine

                    </button>

                `;
    };
    reader.readAsDataURL(file);
    progressContainer.style.display = 'none';
}
function removeSelectedImage() {
    document.getElementById('thread-image-input').value = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('upload-progress').style.display = 'none';
}
function hideThreadCreationModal() {
    document.getElementById('threadCreationModal').style.display = 'none';
    document.getElementById('thread-title-input').value = '';
    document.getElementById('thread-content-input').value = '';
    removeSelectedImage();
}
async function createThread() {
    const title = document.getElementById('thread-title-input').value.trim();
    const content = document.getElementById('thread-content-input').value.trim();
    const imageInput = document.getElementById('thread-image-input');
    const imageFile = imageInput.files[0];
    if (!title || !content) {
        alert('Inserisci sia il titolo che il contenuto del thread');
        return;
    }
    const createBtn = document.querySelector('.btn-create-thread');
    const progressContainer = document.getElementById('upload-progress');
    createBtn.disabled = true;
    createBtn.textContent = 'Creazione...';
    try {
        const threadData = {
            title: title,
            content: content,
            author: currentUser.displayName || 'Utente',
            authorId: currentUser.uid
        };
        if (imageFile) {
            createBtn.textContent = 'Caricamento immagine...';
            progressContainer.style.display = 'block';
            const imageUrl = await uploadThreadImage(imageFile, (progress) => {
                updateUploadProgress(progress);
            });
            if (imageUrl) {
                threadData.imageUrl = imageUrl;
                threadData.imageName = imageFile.name;
            }
        }
        const needsApproval = currentSection.startsWith('clan-') && !canModerateSection(currentSection);
        if (needsApproval) {
            threadData.status = 'pending';
        } else {
            threadData.status = 'approved';
        }
        const dataPath = getDataPath(currentSection, 'threads');
        if (!dataPath)
            return;
        createBtn.textContent = 'Salvando thread...';
        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push && serverTimestamp) {
            const threadsRef = ref(window.firebaseDatabase, dataPath);
            threadData.createdAt = serverTimestamp();
            threadData.replies = 0;
            threadData.views = 0;
            await push(threadsRef, threadData);
        } else {
            saveLocalThread(currentSection, threadData);
        }
        hideThreadCreationModal();
        if (needsApproval) {
            alert('Thread creato! È in attesa di approvazione da parte del moderatore del clan.');
        } else {
            alert('Thread creato con successo!');
        }
    } catch (error) {
        console.error('Errore creazione thread:', error);
        alert('Errore nella creazione del thread: ' + (error.message || error));
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = 'Crea Thread';
        progressContainer.style.display = 'none';
    }
    loadThreads(currentSection);
}
async function openThread(threadId, section) {
    if (!currentUser) {
        alert('Devi effettuare l\'accesso per visualizzare i thread');
        return;
    }
    try {
        const thread = await getThread(threadId, section);
        if (!thread) {
            alert('Thread non trovato');
            return;
        }
        await incrementThreadViews(threadId, section);
        currentThread = thread;
        currentThreadId = threadId;
        currentThreadSection = section;
        document.getElementById('forum-content').style.display = 'none';
        document.getElementById('chat-content').style.display = 'none';
        document.getElementById('thread-view').style.display = 'flex';
        document.getElementById('new-thread-btn').style.display = 'none';
        document.getElementById('thread-title').textContent = thread.title;
        document.getElementById('thread-author').textContent = thread.author;
        document.getElementById('thread-date').textContent = formatTime(thread.createdAt);
        document.getElementById('thread-views').textContent = `${thread.views || 0} visualizzazioni`;
        const threadContentEl = document.getElementById('thread-content');
        let contentHtml = escapeHtml(thread.content || 'Nessun contenuto disponibile');
        if (thread.imageUrl) {
            contentHtml += `

                        <div class="thread-image">

                            <img src="${thread.imageUrl}" 

                                 alt="${thread.imageName || 'Immagine del thread'}" 

                                 onclick="openImageModal('${thread.imageUrl}', '${thread.imageName || 'Immagine del thread'}')"

                                 title="Clicca per ingrandire">

                        </div>

                    `;
        }
        threadContentEl.innerHTML = contentHtml;
        loadThreadComments(threadId, section);
        commentImageUploadInitialized = false;
        closeMobileMenu();
    } catch (error) {
        console.error('Errore apertura thread:', error);
        alert('Errore nell\'apertura del thread');
    }
}
function backToForum() {
    document.getElementById('thread-view').style.display = 'none';
    document.getElementById('forum-content').style.display = 'block';
    document.getElementById('new-thread-btn').style.display = 'block';
    cleanupCommentImageUpload();
    currentThread = null;
    currentThreadId = null;
    currentThreadSection = null;
    if (currentSection && sectionConfig[currentSection]) {
        const section = sectionConfig[currentSection];
        if (section.type === 'forum') {
            loadThreads(currentSection);
        } else if (section.type === 'dashboard') {
            loadDashboard();
        }
    }
}
async function getThread(threadId, section) {
    const dataPath = getDataPath(section, 'threads');
    if (!dataPath)
        return null;
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && get) {
        const threadRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
        const snapshot = await get(threadRef);
        return snapshot.exists() ? {
            id: threadId,
            ...snapshot.val()
        }
         : null;
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return threads.find(t => t.id === threadId) || null;
    }
}
async function incrementThreadViews(threadId, section) {
    const dataPath = getDataPath(section, 'threads');
    if (!dataPath)
        return;
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && update) {
        const threadRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
        await update(ref(window.firebaseDatabase), {
            [`${dataPath}/${threadId}/views`]: (currentThread?.views || 0) + 1
        });
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const threadIndex = threads.findIndex(t => t.id === threadId);
        if (threadIndex !== -1) {
            threads[threadIndex].views = (threads[threadIndex].views || 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify(threads));
        }
    }
}
function loadThreadComments(threadId, section) {
    const dataPath = getDataPath(section, 'comments');
    if (!dataPath)
        return;
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue) {
        const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
        onValue(commentsRef, (snapshot) => {
            const comments = [];
            snapshot.forEach((childSnapshot) => {
                comments.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            comments.sort((a, b) => a.timestamp - b.timestamp);
            displayThreadComments(comments);
        });
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
        const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
        comments.sort((a, b) => a.timestamp - b.timestamp);
        displayThreadComments(comments);
    }
}
function displayThreadComments(comments) {
    const commentsContainer = document.getElementById('thread-comments');
    if (comments.length === 0) {
        commentsContainer.innerHTML = `

            <div style="text-align: center; padding: 20px; color: #666;">

                Nessun commento ancora. Sii il primo a commentare!

            </div>

        `;
        return;
    }
    commentsContainer.innerHTML = comments.map(comment => {
        let commentContentHtml = '';
        if (comment.content && comment.content.trim()) {
            commentContentHtml += `<div class="comment-text">${escapeHtml(comment.content)}</div>`;
        }
        if (comment.imageUrl) {
            commentContentHtml += `

                <div class="comment-image">

                    <img src="${comment.imageUrl}" 

                         alt="${comment.imageName || 'Immagine del commento'}" 

                         onclick="openImageModal('${comment.imageUrl}', '${comment.imageName || 'Immagine del commento'}')"

                         title="Clicca per ingrandire">

                </div>

            `;
        }
        return `

            <div class="comment">

                <div class="comment-header">

                    <span class="comment-author">${comment.author}</span>

                    <span class="comment-time">${formatTime(comment.timestamp)}</span>

                </div>

                <div class="comment-content">${commentContentHtml}</div>

            </div>

        `;
    }).join('');
    commentsContainer.scrollTop = commentsContainer.scrollHeight;
}
async function addComment() {
    if (!currentUser) {
        alert('Devi effettuare l\'accesso per commentare');
        return;
    }
    const commentText = document.getElementById('comment-text').value.trim();
    const imageInput = document.getElementById('comment-image-input');
    const imageFile = imageInput.files[0];
    if (!commentText && !imageFile) {
        alert('Scrivi un commento o aggiungi un\'immagine prima di inviare');
        return;
    }
    const commentBtn = document.getElementById('submit-comment-btn');
    const progressContainer = document.getElementById('comment-upload-progress');
    commentBtn.disabled = true;
    commentBtn.textContent = 'Invio...';
    try {
        const commentData = {
            author: currentUser.displayName || 'Utente',
            authorId: currentUser.uid,
            content: commentText || '',
            threadId: currentThreadId
        };
        if (imageFile) {
            commentBtn.textContent = 'Caricamento immagine...';
            progressContainer.style.display = 'block';
            const imageUrl = await uploadThreadImage(imageFile, (progress) => {
                updateCommentUploadProgress(progress);
            });
            if (imageUrl) {
                commentData.imageUrl = imageUrl;
                commentData.imageName = imageFile.name;
            }
        }
        const dataPath = getDataPath(currentThreadSection, 'comments');
        if (!dataPath)
            return;
        commentBtn.textContent = 'Salvando commento...';
        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push && serverTimestamp) {
            const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${currentThreadId}`);
            commentData.timestamp = serverTimestamp();
            await push(commentsRef, commentData);
            await incrementThreadReplies(currentThreadId, currentThreadSection);
        } else {
            saveLocalComment(currentThreadSection, currentThreadId, commentData);
        }
        document.getElementById('comment-text').value = '';
        removeCommentSelectedImage();
        const uploadSection = document.getElementById('comment-image-upload');
        uploadSection.classList.remove('show');
    } catch (error) {
        console.error('Errore invio commento:', error);
        alert('Errore nell\'invio del commento: ' + (error.message || error));
    } finally {
        commentBtn.disabled = false;
        commentBtn.textContent = 'Commenta';
        progressContainer.style.display = 'none';
    }
}
function saveLocalComment(section, threadId, commentData) {
    const dataPath = getDataPath(section, 'comments');
    if (!dataPath)
        return;
    const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
    const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    commentData.timestamp = Date.now();
    commentData.id = 'comment_' + Date.now();
    comments.push(commentData);
    localStorage.setItem(storageKey, JSON.stringify(comments));
    incrementThreadReplies(threadId, section);
    loadThreadComments(threadId, section);
}
async function incrementThreadReplies(threadId, section) {
    const dataPath = getDataPath(section, 'threads');
    if (!dataPath)
        return;
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && update) {
        const threadRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
        await update(ref(window.firebaseDatabase), {
            [`${dataPath}/${threadId}/replies`]: (currentThread?.replies || 0) + 1
        });
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const threadIndex = threads.findIndex(t => t.id === threadId);
        if (threadIndex !== -1) {
            threads[threadIndex].replies = (threads[threadIndex].replies || 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify(threads));
        }
    }
}
function toggleEmoticonPicker(type) {
    const panel = document.getElementById(`${type}-emoticon-panel`);
    const isVisible = panel.classList.contains('show');
    document.querySelectorAll('.emoticon-panel').forEach(p => {
        p.classList.remove('show');
    });
    if (!isVisible) {
        panel.classList.add('show');
    }
}
function addEmoticon(type, emoticon) {
    const input = type === 'chat' ? document.getElementById('message-input') : document.getElementById('comment-text');
    const cursorPos = input.selectionStart;
    const textBefore = input.value.substring(0, cursorPos);
    const textAfter = input.value.substring(cursorPos);
    input.value = textBefore + emoticon + textAfter;
    input.focus();
    input.setSelectionRange(cursorPos + emoticon.length, cursorPos + emoticon.length);
    document.getElementById(`${type}-emoticon-panel`).classList.remove('show');
}
function openImageModal(imageUrl, imageName) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageUrl;
    modalImage.alt = imageName || 'Immagine';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}
document.addEventListener('click', function (event) {
    if (!event.target.closest('.emoticon-picker')) {
        document.querySelectorAll('.emoticon-panel').forEach(panel => {
            panel.classList.remove('show');
        });
    }
});
function loadMessages(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'messages');
    if (!dataPath)
        return;
    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue && off) {
        const messagesRef = ref(window.firebaseDatabase, dataPath);
        if (messageListeners[sectionKey]) {
            const oldRef = ref(window.firebaseDatabase, messageListeners[sectionKey].path);
            off(oldRef, messageListeners[sectionKey].callback);
        }
        const callback = (snapshot) => {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                messages.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            messages.sort((a, b) => a.timestamp - b.timestamp);
            displayMessages(messages);
            updateMessageCounter(messages.length);
        };
        messageListeners[sectionKey] = {
            path: dataPath,
            callback: callback
        };
        onValue(messagesRef, callback);
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        messages.sort((a, b) => a.timestamp - b.timestamp);
        displayMessages(messages);
        updateMessageCounter(messages.length);
    }
}
function displayMessages(messages) {
    const originalDisplayMessages = window.displayMessages;
    if (originalDisplayMessages) {
        window.displayMessages = function (messages) {
            const chatMessages = document.getElementById('chat-messages');
            if (messages.length === 0) {
                chatMessages.innerHTML = `

       <div style="text-align: center; padding: 40px; color: #666;">

        Nessun messaggio in questa chat. Inizia la conversazione!

       </div>

      `;
                return;
            }
            chatMessages.innerHTML = messages.map(msg => `

      <div class="message">

       <div class="message-author">

        ${msg.author}

        <span class="message-time">${formatTime(msg.timestamp)}</span>

       </div>

       <div>${highlightMentions(escapeHtml(msg.message), currentUser?.uid)}</div>

      </div>

     `).join('');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
    }
    function saveLocalMessage(section, messageData) {
        const dataPath = getDataPath(section, 'messages');
        if (!dataPath)
            return;
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        messageData.timestamp = Date.now();
        messageData.id = 'msg_' + Date.now();
        messages.push(messageData);
        localStorage.setItem(storageKey, JSON.stringify(messages));
        loadMessages(section);
    }
    function saveLocalThread(section, threadData) {
        const dataPath = getDataPath(section, 'threads');
        if (!dataPath)
            return;
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        threadData.createdAt = Date.now();
        threadData.id = 'thread_' + Date.now();
        threadData.replies = 0;
        threadData.views = 0;
        if (!threadData.status) {
            threadData.status = 'approved';
        }
        if (!threadData.content) {
            threadData.content = 'Nessun contenuto disponibile';
        }
        threads.push(threadData);
        localStorage.setItem(storageKey, JSON.stringify(threads));
        loadThreads(section);
    }
    async function sendMessage() {
        const originalSendMessage = window.sendMessage;
        window.sendMessage = async function () {
            if (!currentUser) {
                alert('Devi effettuare l\'accesso per inviare messaggi');
                return;
            }
            if (currentSection.startsWith('clan-') && getCurrentUserClan() === 'Nessuno') {
                alert('Devi appartenere a un clan per inviare messaggi qui!');
                return;
            }
            const input = document.getElementById('message-input');
            const sendBtn = document.getElementById('send-message-btn');
            const message = input.value.trim();
            if (!message)
                return;
            const mentions = detectMentions(message);
            input.disabled = true;
            sendBtn.disabled = true;
            try {
                const messageData = {
                    author: currentUser.displayName || 'Utente',
                    authorId: currentUser.uid,
                    message: message
                };
                const dataPath = getDataPath(currentSection, 'messages');
                if (!dataPath)
                    return;
                if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push && serverTimestamp) {
                    const messagesRef = ref(window.firebaseDatabase, dataPath);
                    messageData.timestamp = serverTimestamp();
                    await push(messagesRef, messageData);
                } else {
                    saveLocalMessage(currentSection, messageData);
                }
                for (const mention of mentions) {
                    await createNotification('mention', mention.userId, {
                        message: message,
                        section: currentSection,
                        sectionTitle: sectionConfig[currentSection]?.title || 'Chat'
                    });
                }
                input.value = '';
            } catch (error) {
                console.error('Errore invio messaggio:', error);
                alert('Errore nell\'invio del messaggio');
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                input.focus();
            }
        }
    };
    function formatTime(timestamp) {
        if (!timestamp)
            return 'ora';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        if (diff < 60000)
            return 'ora';
        if (diff < 3600000)
            return `${Math.floor(diff / 60000)} min fa`;
        if (diff < 86400000)
            return `${Math.floor(diff / 3600000)} ore fa`;
        if (diff < 2592000000)
            return `${Math.floor(diff / 86400000)} giorni fa`;
        return date.toLocaleDateString();
    }
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    function updateMessageCounter(count) {
        messageCount = count;
        document.getElementById('messageCounter').textContent = `💬 ${count} messaggi`;
    }
    function cleanupListeners() {
        if (!window.useFirebase || !window.firebaseDatabase || !firebaseReady || !ref || !off)
            return;
        try {
            Object.keys(messageListeners).forEach(section => {
                const listener = messageListeners[section];
                if (listener && listener.path && listener.callback) {
                    const messagesRef = ref(window.firebaseDatabase, listener.path);
                    off(messagesRef, listener.callback);
                }
            });
            messageListeners = {};
            Object.keys(threadListeners).forEach(section => {
                const listener = threadListeners[section];
                if (listener && listener.path && listener.callback) {
                    const threadsRef = ref(window.firebaseDatabase, listener.path);
                    off(threadsRef, listener.callback);
                }
            });
            threadListeners = {};
            cleanupCommentImageUpload();
        } catch (error) {
            console.error('Errore pulizia listeners:', error);
        }
    }
    function setupEventListeners() {
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                if (section)
                    switchSection(section);
            });
        });
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        document.getElementById('comment-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                addComment();
            }
        });
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
        document.getElementById('thread-title-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('thread-content-input').focus();
            }
        });
        document.getElementById('thread-content-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                createThread();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('threadCreationModal').style.display === 'flex') {
                    hideThreadCreationModal();
                } else if (document.getElementById('imageModal').style.display === 'flex') {
                    closeImageModal();
                }
            }
        });
        document.getElementById('threadCreationModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('threadCreationModal')) {
                hideThreadCreationModal();
            }
        });
        document.getElementById('modalImage').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    function toggleCommentImageUpload() {
        const uploadSection = document.getElementById('comment-image-upload');
        const isVisible = uploadSection.classList.contains('show');
        console.log('📷 Toggle upload commento, visibile:', isVisible);
        if (isVisible) {
            uploadSection.classList.remove('show');
            removeCommentSelectedImage();
            console.log('📷 Sezione upload nascosta');
        } else {
            uploadSection.classList.add('show');
            if (!commentImageUploadInitialized) {
                setupCommentImageUploadSafe();
            }
            console.log('📷 Sezione upload mostrata');
        }
    }
    function setupCommentImageUploadSafe() {
        const imageInput = document.getElementById('comment-image-input');
        const imageLabel = document.querySelector('#comment-image-upload .image-upload-label');
        if (!imageInput || !imageLabel) {
            console.log('❌ Elementi upload commento non trovati');
            return;
        }
        cleanupCommentImageListeners();
        console.log('🔧 Setup listener upload commento (SAFE)');
        const clickHandler = () => {
            console.log('🖱️ Click su label upload');
            imageInput.click();
        };
        const changeHandler = (event) => {
            console.log('📁 File selezionato tramite input');
            handleCommentImageSelect(event);
        };
        imageLabel._commentClickHandler = clickHandler;
        imageInput._commentChangeHandler = changeHandler;
        imageLabel.addEventListener('click', clickHandler);
        imageInput.addEventListener('change', changeHandler);
        commentImageUploadInitialized = true;
        console.log('✅ Listener upload commento configurati');
    }
    function cleanupCommentImageListeners() {
        const imageInput = document.getElementById('comment-image-input');
        const imageLabel = document.querySelector('#comment-image-upload .image-upload-label');
        if (imageInput && imageInput._commentChangeHandler) {
            imageInput.removeEventListener('change', imageInput._commentChangeHandler);
            delete imageInput._commentChangeHandler;
            console.log('🧹 Rimosso listener change esistente');
        }
        if (imageLabel && imageLabel._commentClickHandler) {
            imageLabel.removeEventListener('click', imageLabel._commentClickHandler);
            delete imageLabel._commentClickHandler;
            console.log('🧹 Rimosso listener click esistente');
        }
    }
    function cleanupCommentImageUpload() {
        console.log('🧹 Cleanup completo upload commenti');
        cleanupCommentImageListeners();
        commentImageUploadInitialized = false;
        removeCommentSelectedImage();
        const uploadSection = document.getElementById('comment-image-upload');
        if (uploadSection) {
            uploadSection.classList.remove('show');
        }
    }
    function setupCommentImageUploadImmediate() {
        const imageInput = document.getElementById('comment-image-input');
        const imageLabel = document.querySelector('#comment-image-upload .image-upload-label');
        if (imageInput && imageLabel) {
            imageInput.addEventListener('change', handleCommentImageSelect);
            imageLabel.addEventListener('click', () => imageInput.click());
        }
    }
    function setupCommentImageUpload() {
        const imageInput = document.getElementById('comment-image-input');
        const imageLabel = document.querySelector('#comment-image-upload .image-upload-label');
        if (imageInput && imageLabel) {
            try {
                imageInput.removeEventListener('change', handleCommentImageSelect);
                imageLabel.removeEventListener('click', () => imageInput.click());
            } catch (e) {}
            imageInput.addEventListener('change', handleCommentImageSelect);
            imageLabel.addEventListener('click', () => imageInput.click());
        }
    }
    function handleCommentImageSelect(event) {
        console.log('🖼️ Selezione immagine commento avviata');
        const file = event.target.files[0];
        const preview = document.getElementById('comment-image-preview');
        const progressContainer = document.getElementById('comment-upload-progress');
        if (!file) {
            console.log('❌ Nessun file selezionato');
            return;
        }
        console.log('📁 File selezionato:', file.name, 'Tipo:', file.type, 'Dimensione:', file.size);
        if (!file.type.startsWith('image/')) {
            alert('Seleziona solo file immagine (JPG, PNG, GIF, etc.)');
            return;
        }
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('L\'immagine è troppo grande. Massimo 5MB consentiti.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML = `

            <img src="${e.target.result}" alt="Anteprima immagine commento">

            <button type="button" class="remove-image" onclick="removeCommentSelectedImage()">

                🗑️

            </button>

        `;
        };
        reader.readAsDataURL(file);
        progressContainer.style.display = 'none';
    }
    function removeCommentSelectedImage() {
        document.getElementById('comment-image-input').value = '';
        document.getElementById('comment-image-preview').innerHTML = '';
        document.getElementById('comment-upload-progress').style.display = 'none';
    }
    function updateCommentUploadProgress(progress) {
        const progressContainer = document.getElementById('comment-upload-progress');
        const progressPercent = Math.round(progress);
        progressContainer.innerHTML = `

        <div style="background: rgba(45, 130, 181, 0.2); border-radius: 10px; padding: 10px; margin-top: 10px;">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">

                <span style="font-size: 12px; color: #3498db; font-weight: 600;">Caricamento immagine...</span>

                <span style="font-size: 12px; color: #3498db; font-weight: 600;">${progressPercent}%</span>

            </div>

            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 5px; height: 6px; overflow: hidden;">

                <div style="background: linear-gradient(90deg, #3498db, #2ecc71); height: 100%; width: ${progressPercent}%; transition: width 0.3s ease; border-radius: 5px;"></div>

            </div>

        </div>

    `;
        progressContainer.style.display = 'block';
        if (progress >= 100) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);
        }
    }
