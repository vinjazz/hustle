// Aspetta che Firebase sia caricato
window.addEventListener('load', async() => {
    // Attendi che i moduli Firebase siano pronti
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

    // Inizializza l'app
    initializeApp();
});

// Variabili globali
let currentUser = null;
let currentSection = 'home';
let messageListeners = {};
let threadListeners = {};
let messageCount = 0;
let isConnected = false;
let firebaseReady = false;
let isLoginMode = true; // true = login, false = register
let currentUserData = null; // Dati completi dell'utente corrente
let currentThread = null;
let currentThreadId = null;
let currentThreadSection = null;
// Flag per evitare listener multipli
let commentImageUploadInitialized = false;
let notificationsData = [];
let unreadNotificationsCount = 0;
let allUsers = []; // Cache degli utenti per autocomplete
let mentionAutocompleteVisible = false;
let currentMentionInput = null;
let currentMentionPosition = 0;
let currentAvatarFile = null;
let isAvatarUploading = false;
// Ruoli utente - DEVE essere definito prima di tutto
const USER_ROLES = {
    SUPERUSER: 'superuser',
    CLAN_MOD: 'clan_mod',
    USER: 'user'
};

// Funzioni Firebase (saranno assegnate quando Firebase è pronto)
let signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged,
signOut, updateProfile, GoogleAuthProvider, signInWithPopup, ref, push, set, get, onValue, off, serverTimestamp,
onDisconnect, child, update, storageRef, uploadBytes, getDownloadURL, deleteObject;

// Rendi le funzioni globali per gli onclick
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
window.cleanupCommentImageUpload = cleanupCommentImageUpload;
window.toggleNotificationsPanel = toggleNotificationsPanel;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.handleNotificationClick = handleNotificationClick;
window.selectMentionSuggestion = selectMentionSuggestion;
window.dismissToast = dismissToast;
window.handleToastAction = handleToastAction;
window.showAvatarModal = showAvatarModal;
window.saveAvatarChanges = saveAvatarChanges;
window.cancelAvatarChange = cancelAvatarChange;
window.removeAvatar = removeAvatar;
window.handleAvatarUpload = handleAvatarUpload;
window.handleGoogleLogin = handleGoogleLogin;
window.handleUserLogin = handleUserLogin;
window.completeUserLogin = completeUserLogin;
window.loadUserProfile = loadUserProfile;
window.sendMessage = sendMessage;
window.createThread = createThread;
window.addComment = addComment;
window.getUserDisplayName = getUserDisplayName;
// Esporta currentSection globalmente per activity_tracker
window.getCurrentSection = () => currentSection;
// Esporta getDataPath globalmente per activity_tracker
window.getDataPath = getDataPath;
// Esporta getCurrentUserClan globalmente per activity_tracker
window.getCurrentUserClan = getCurrentUserClan;
// Esporta firebaseReady globalmente per activity_tracker
window.getFirebaseReady = () => firebaseReady;


// ===============================================
// AVATAR SYSTEM - FUNZIONI NUOVE
// ===============================================

// Enhanced user data loading with avatar support - DEVE ESSERE DEFINITA PRIMA
async function loadUserWithAvatar(userId) {
    if (!userId) return null;
    
    // Cerca prima nella cache
    let user = allUsers.find(u => u.uid === userId);
    if (user) return user;
    
    // Se non trovato, carica dal database
    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && get) {
            const userRef = ref(window.firebaseDatabase, `users/${userId}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                user = { uid: userId, ...snapshot.val() };
                // Aggiungi alla cache
                const existingIndex = allUsers.findIndex(u => u.uid === userId);
                if (existingIndex >= 0) {
                    allUsers[existingIndex] = user;
                } else {
                    allUsers.push(user);
                }
                return user;
            }
        } else {
            // Modalità locale
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            for (const email in users) {
                if (users[email].uid === userId) {
                    user = users[email];
                    // Aggiungi alla cache
                    const existingIndex = allUsers.findIndex(u => u.uid === userId);
                    if (existingIndex >= 0) {
                        allUsers[existingIndex] = user;
                    } else {
                        allUsers.push(user);
                    }
                    return user;
                }
            }
        }
    } catch (error) {
        console.error('Errore caricamento utente:', error);
    }
    
    return null;
}

// Formato orario breve per chat (stile WhatsApp)
function formatTimeShort(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Formato data per separatori temporali
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return date.toLocaleDateString('it-IT', { weekday: 'long' });
    
    return date.toLocaleDateString('it-IT', { 
        day: 'numeric', 
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Aggiorna avatar utente nella cache
function updateUserAvatarInCache(userId, avatarUrl) {
    const userIndex = allUsers.findIndex(u => u.uid === userId);
    if (userIndex >= 0) {
        allUsers[userIndex].avatarUrl = avatarUrl;
        console.log(`📷 Avatar aggiornato nella cache per ${allUsers[userIndex].username}`);
    }
}

console.log('✅ Patch Username Google applicata con successo!');
// Funzioni per la gestione dei ruoli
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

    // Controllo accesso clan
    if (sectionKey.startsWith('clan-') && getCurrentUserClan() === 'Nessuno') {
        return false;
    }

    // Controllo accesso admin (solo superuser)
    if (section.requiredRole === USER_ROLES.SUPERUSER && getCurrentUserRole() !== USER_ROLES.SUPERUSER) {
        return false;
    }

    return true;
}

// Configurazione sezioni - DEVE essere definito dopo USER_ROLES
const sectionConfig = {
    'home': {
        title: '🏠 Dashboard',
        description: 'Benvenuto nel Forum di Hustle Castle Council! Ecco le ultime novità',
        type: 'dashboard'
    },
 'salotto': {
        title: '🛋️ Salotto',
        description: 'Dove rilassarsi e parlare del più e del meno',
        type: 'forum'
    },
    'segnalazioni': {
        title: '📢 Segnalazioni',
        description: 'Segnala bug o problemi tecnici riscontrati nel forum o nel gioco.',
        type: 'forum'
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

window.sectionConfig = sectionConfig;

function ensureNotificationsBellExists() {
    let bell = document.getElementById('notificationsBell');

    if (!bell) {
        console.log('🚨 Campanella non trovata, creando elemento di emergenza...');

        // Crea l'elemento
        bell = document.createElement('button');
        bell.id = 'notificationsBell';
        bell.className = 'notifications-bell';
        bell.innerHTML = '🔔<span id="notificationBadge" class="notification-badge hidden">0</span>';
        bell.onclick = toggleNotificationsPanel;

        // Aggiungi al body
        document.body.appendChild(bell);

        console.log('✅ Campanella di emergenza creata!');
    }

    return bell;
}

function initializeNotifications() {
    console.log('🔔 Inizializzazione sistema notifiche...');

    // Assicurati che la campanella esista
    ensureNotificationsBellExists();

    // Forza visibilità della campanella
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.style.display = 'flex';
        notificationsBell.style.visibility = 'visible';
        notificationsBell.style.opacity = '1';
        notificationsBell.style.position = 'fixed';
        notificationsBell.style.top = '20px';
        notificationsBell.style.right = '180px';
        notificationsBell.style.zIndex = '9999';
        console.log('🔔 Campanella notifiche forzata visibile');
    } else {
        console.error('❌ Elemento notificationsBell non trovato anche dopo creazione di emergenza!');
    }

    // Carica notifiche esistenti
    loadNotifications();

    // Setup listeners per le menzioni
    setupMentionListeners();

    // Carica lista utenti per autocomplete
    loadUsersList();

    // Setup click outside per chiudere pannelli
    document.addEventListener('click', handleClickOutside);

    console.log('✅ Sistema notifiche inizializzato');
}
function detectMentions(text) {
    // Regex per trovare @username
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        const username = match[1];
        // Verifica che l'utente esista
        const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user && user.uid !== currentUser?.uid) { // Non taggare se stesso
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
    // Chiudi notifications panel
    const notifPanel = document.getElementById('notificationsPanel');
    const notifBell = document.getElementById('notificationsBell');

    if (notifPanel && notifBell && !notifPanel.contains(event.target) && !notifBell.contains(event.target)) {
        notifPanel.classList.remove('show');
    }

    // Chiudi mention autocomplete
    const mentionAutocomplete = document.getElementById('mentionAutocomplete');
    const isInputFocused = ['message-input', 'comment-text', 'thread-content-input'].includes(event.target.id);

    if (mentionAutocomplete && !mentionAutocomplete.contains(event.target) && !isInputFocused) {
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

// ==============================================
// AUTOCOMPLETE MENZIONI
// ==============================================

function setupMentionListeners() {
    // Chat input
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('input', handleMentionInput);
        messageInput.addEventListener('keydown', handleMentionKeydown);
    }

    // Comment textarea
    const commentTextarea = document.getElementById('comment-text');
    if (commentTextarea) {
        commentTextarea.addEventListener('input', handleMentionInput);
        commentTextarea.addEventListener('keydown', handleMentionKeydown);
    }

    // Thread content textarea
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

    // Trova l'ultima @ prima del cursore
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
        // Verifica che non ci sia uno spazio tra @ e cursore
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
            // Mostra autocomplete
            currentMentionInput = input;
            currentMentionPosition = lastAtIndex;
            showMentionAutocomplete(textAfterAt, input);
            return;
        }
    }

    // Nascondi autocomplete
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

    // Filtra utenti in base alla query
    const filteredUsers = allUsers.filter(user =>
            user.username.toLowerCase().includes(query.toLowerCase()) &&
            user.uid !== currentUser?.uid).slice(0, 8);

    if (filteredUsers.length === 0) {
        hideMentionAutocomplete();
        return;
    }

    // Genera HTML suggerimenti con avatar
    autocomplete.innerHTML = filteredUsers.map((user, index) => `
        <div class="mention-suggestion ${index === 0 ? 'selected' : ''}" 
             data-username="${user.username}" 
             data-user-id="${user.uid}"
             onclick="selectMentionSuggestion(this)">
            <div class="mention-suggestion-avatar">
                ${user.avatarUrl ? 
`<img src="${user.avatarUrl}" alt="Avatar ${user.username}">` :
            user.username.charAt(0).toUpperCase()
}
            </div>
            <div class="mention-suggestion-info">
                <div class="mention-suggestion-name">
                    ${user.username}
                    ${createClanBadgeHTML(user.clan)}
                </div>
                <div class="mention-suggestion-clan">${user.clan || 'Nessun clan'}</div>
            </div>
        </div>
    `).join('');

    // Posiziona autocomplete
    positionAutocomplete(inputElement);

    autocomplete.classList.add('show');
    mentionAutocompleteVisible = true;
}
function positionAutocomplete(inputElement) {
    const autocomplete = document.getElementById('mentionAutocomplete');
    const rect = inputElement.getBoundingClientRect();
    
    // Calcola posizione ottimale
    let top = rect.bottom + 5;
    let left = rect.left;
    
    // Verifica se c'è spazio sotto, altrimenti metti sopra
    const viewportHeight = window.innerHeight;
    const autocompleteHeight = 200; // altezza massima stimata
    
    if (top + autocompleteHeight > viewportHeight) {
        top = rect.top - autocompleteHeight - 5;
    }
    
    // Verifica che non esca dai bordi laterali
    const viewportWidth = window.innerWidth;
    const autocompleteWidth = 250;
    
    if (left + autocompleteWidth > viewportWidth) {
        left = viewportWidth - autocompleteWidth - 10;
    }
    
    if (left < 10) {
        left = 10;
    }

    autocomplete.style.position = 'fixed';
    autocomplete.style.left = left + 'px';
    autocomplete.style.top = top + 'px';
    autocomplete.style.width = Math.min(300, rect.width) + 'px';
    autocomplete.style.maxWidth = '300px';
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

        // Posiziona cursore dopo la menzione
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

// ==============================================
// GESTIONE NOTIFICHE - CREAZIONE E INVIO
// ==============================================
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
            // Salva su Firebase - usa timestamp locale per compatibilità
            const notificationData = {
                ...notification,
                timestamp: Date.now() // Usa timestamp locale invece di serverTimestamp per evitare problemi
            };
            const notifRef = ref(window.firebaseDatabase, `notifications/${targetUserId}/${notification.id}`);
            await set(notifRef, notificationData);
            console.log('📨 Notifica salvata su Firebase:', notificationData);
        } else {
            // Salva in localStorage
            saveLocalNotification(targetUserId, notification);
        }

        console.log('📨 Notifica creata:', notification);

        // Mostra toast se è per l'utente corrente (per test)
        if (targetUserId === currentUser.uid) {
            showMentionToast(notification);
        }

    } catch (error) {
        console.error('Errore creazione notifica:', error);
    }
}
function saveLocalNotification(targetUserId, notification) {
    const storageKey = `hc_notifications_${targetUserId}`;
    const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
    notifications.unshift(notification); // Aggiungi in cima

    // Mantieni solo le ultime 50 notifiche
    if (notifications.length > 50) {
        notifications.splice(50);
    }

    localStorage.setItem(storageKey, JSON.stringify(notifications));

    // Se è l'utente corrente, aggiorna la UI
    if (targetUserId === currentUser?.uid) {
        loadNotifications();
    }
}

// ==============================================
// GESTIONE NOTIFICHE - CARICAMENTO E DISPLAY
// ==============================================

function loadNotifications() {
    console.log('🚀 CHIAMATA loadNotifications()');

    if (!currentUser) {
        console.log('⚠️ currentUser è nullo');
        return;
    }

    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        console.log('✅ Firebase attivo, in ascolto su notifications/' + currentUser.uid);
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
            } else {
                console.log('📭 Nessuna notifica trovata su Firebase');
            }

            notifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            notificationsData = notifications;

            console.log('📥 Notifiche caricate:', notificationsData);

            updateNotificationsUI();
        });
    } else {
        console.log('⚠️ Firebase non attivo o non pronto, fallback su localStorage');
    }
}

function updateNotificationsUI() {
    const unreadCount = notificationsData.filter(n => !n.read).length;
    unreadNotificationsCount = unreadCount;

    // Aggiorna badge
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Aggiorna lista se pannello è aperto
    const panel = document.getElementById('notificationsPanel');
    if (panel && panel.classList.contains('show')) {
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
                    ${notification.threadTitle ? `<div class="notification-thread">in "${notification.threadTitle}"</div>` : ''}
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

// ==============================================
// GESTIONE NOTIFICHE - INTERAZIONI UI
// ==============================================

function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    const isVisible = panel.classList.contains('show');

    if (isVisible) {
        panel.classList.remove('show');
    } else {
        panel.classList.add('show');
        displayNotificationsList();

        // Segna come lette quelle visibili dopo un delay
        setTimeout(() => {
            markVisibleNotificationsAsRead();
        }, 1000);
    }
}

async function handleNotificationClick(notificationId) {
    const notification = notificationsData.find(n => n.id === notificationId);
    if (!notification)
        return;

    // Segna come letta
    await markNotificationAsRead(notificationId);

    // Naviga al contenuto
    navigateToNotificationContent(notification);

    // Chiudi pannello
    document.getElementById('notificationsPanel').classList.remove('show');
}

function navigateToNotificationContent(notification) {
    // Chiudi menu mobile se aperto
    closeMobileMenu();

    if (notification.threadId && notification.section) {
        // Vai al thread
        switchSection(notification.section);
        setTimeout(() => {
            openThread(notification.threadId, notification.section);
        }, 500);
    } else if (notification.section) {
        // Vai alla sezione
        switchSection(notification.section);
    }
}

async function markNotificationAsRead(notificationId) {
    const notification = notificationsData.find(n => n.id === notificationId);
    if (!notification || notification.read)
        return;

    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            // Aggiorna su Firebase
            const notifRef = ref(window.firebaseDatabase, `notifications/${currentUser.uid}/${notificationId}/read`);
            await set(notifRef, true);
        } else {
            // Aggiorna localStorage
            const storageKey = `hc_notifications_${currentUser.uid}`;
            const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const index = notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                notifications[index].read = true;
                localStorage.setItem(storageKey, JSON.stringify(notifications));
                loadNotifications(); // Ricarica per aggiornare UI
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

// ==============================================
// TOAST NOTIFICATIONS
// ==============================================

function showMentionToast(notification) {
    // Mostra toast solo se l'utente target è quello corrente (simulazione)
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
        ${options.actions ? `
