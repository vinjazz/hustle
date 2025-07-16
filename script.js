window.activityTrackerEnabled = true;

// Override della funzione init
window.addEventListener('load', () => {
    if (window.activityTracker) {
        window.activityTracker.init = function() {
            console.log('🔕 Activity Tracker disabilitato');
        };
    }
});

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
let currentAvatarFile = null;
let isAvatarUploading = false;

// Supabase client
let supabase = null;

// Ruoli utente
const USER_ROLES = {
    SUPERUSER: 'superuser',
    CLAN_MOD: 'clan_mod',
    USER: 'user'
};

let signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged,
signOut, updateProfile, GoogleAuthProvider, signInWithPopup, ref, push, set, get, onValue, off, serverTimestamp,
onDisconnect, child, update, storageRef, uploadBytes, getDownloadURL, deleteObject;

// Inizializza Supabase
async function initializeSupabase() {
    try {
        // Assumendo che Supabase sia già caricato globalmente
        if (window.supabase && window.supabaseUrl && window.supabaseKey) {
            supabase = window.supabase.createClient(window.supabaseUrl, window.supabaseKey);
            console.log('✅ Supabase inizializzato');
        } else {
            console.warn('⚠️ Supabase non disponibile, modalità locale');
        }
    } catch (error) {
        console.error('❌ Errore inizializzazione Supabase:', error);
    }
}

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

// Esporta funzioni globali
window.getCurrentSection = () => currentSection;
window.getDataPath = getDataPath;
window.getCurrentUserClan = getCurrentUserClan;
window.getFirebaseReady = () => firebaseReady;

if (typeof allUsers === 'undefined') {
    window.allUsers = [];
}

// Enhanced user data loading with avatar support
async function loadUserWithAvatar(userId) {
    if (!userId) return null;
    
    let user = allUsers.find(u => u.uid === userId);
    if (user) return user;
    
    try {
        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && get) {
            const userRef = ref(window.firebaseDatabase, `users/${userId}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                user = { uid: userId, ...snapshot.val() };
                const existingIndex = allUsers.findIndex(u => u.uid === userId);
                if (existingIndex >= 0) {
                    allUsers[existingIndex] = user;
                } else {
                    allUsers.push(user);
                }
                return user;
            }
        } else {
            const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            for (const email in users) {
                if (users[email].uid === userId) {
                    user = users[email];
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

// Formato orario breve per chat
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
    }
}

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

    if (sectionKey.startsWith('clan-') && getCurrentUserClan() === 'Nessuno') {
        return false;
    }

    if (section.requiredRole === USER_ROLES.SUPERUSER && getCurrentUserRole() !== USER_ROLES.SUPERUSER) {
        return false;
    }

    return true;
}

// Configurazione sezioni
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

// Inizializza sistema notifiche
function initializeNotifications() {
    let bell = document.getElementById('notificationsBell');
    if (!bell) {
        bell = document.createElement('button');
        bell.id = 'notificationsBell';
        bell.className = 'notifications-bell';
        bell.innerHTML = '🔔<span id="notificationBadge" class="notification-badge hidden">0</span>';
        bell.onclick = toggleNotificationsPanel;
        document.body.appendChild(bell);
    }

    loadNotifications();
    setupMentionListeners();
    
    setTimeout(async () => {
        try {
            if (typeof loadUsersList === 'function') {
                await loadUsersList();
            } else {
                setTimeout(async () => {
                    try {
                        if (typeof loadUsersList === 'function') {
                            await loadUsersList();
                        } else {
                            if (typeof allUsers === 'undefined') {
                                window.allUsers = [];
                            }
                        }
                    } catch (error) {
                        console.error('Errore caricamento utenti (secondo tentativo):', error);
                        window.allUsers = window.allUsers || [];
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Errore caricamento utenti:', error);
            window.allUsers = window.allUsers || [];
        }
    }, 500);

    document.addEventListener('click', handleClickOutside);
}

// Rileva menzioni nel testo
function detectMentions(text) {
    if (!Array.isArray(allUsers)) {
        return [];
    }

    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        const username = match[1];
        const user = allUsers.find(u => u && u.username && u.username.toLowerCase() === username.toLowerCase());
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

    if (notifPanel && notifBell && !notifPanel.contains(event.target) && !notifBell.contains(event.target)) {
        notifPanel.classList.remove('show');
    }

    const mentionAutocomplete = document.getElementById('mentionAutocomplete');
    const isInputFocused = ['message-input', 'comment-text', 'thread-content-input'].includes(event.target.id);

    if (mentionAutocomplete && !mentionAutocomplete.contains(event.target) && !isInputFocused) {
        hideMentionAutocomplete();
    }
}

function highlightMentions(html, currentUserId = null) {
    if (!html || typeof html !== 'string') return '';
    
    if (!Array.isArray(allUsers)) {
        return html;
    }
    
    const mentionRegex = /@([a-zA-Z0-9_]+)(?![^<]*>)/g;

    return html.replace(mentionRegex, (match, username) => {
        const user = allUsers.find(u => u && u.username && u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            const isSelf = user.uid === currentUserId;
            const className = isSelf ? 'mention self' : 'mention';
            return `<span class="${className}" data-user-id="${user.uid}">@${username}</span>`;
        }
        return match;
    });
}

// Setup mention listeners
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

    if (!Array.isArray(allUsers)) {
        window.allUsers = [];
    }

    const filteredUsers = allUsers.filter(user =>
        user && 
        user.username && 
        user.username.toLowerCase().includes(query.toLowerCase()) &&
        user.uid !== currentUser?.uid
    ).slice(0, 8);

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

    positionAutocomplete(inputElement);
    autocomplete.classList.add('show');
    mentionAutocompleteVisible = true;
}

function positionAutocomplete(inputElement) {
    const autocomplete = document.getElementById('mentionAutocomplete');
    const rect = inputElement.getBoundingClientRect();
    
    let top = rect.bottom + 5;
    let left = rect.left;
    
    const viewportHeight = window.innerHeight;
    const autocompleteHeight = 200;
    
    if (top + autocompleteHeight > viewportHeight) {
        top = rect.top - autocompleteHeight - 5;
    }
    
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

// Gestione notifiche
async function createNotification(type, targetUserId, data) {
    if (!currentUser || targetUserId === currentUser.uid)
        return;

    const notification = {
        type: type,
        from_user: currentUser.displayName || getUserDisplayName() || 'Utente',
        from_user_id: currentUser.uid,
        user_id: targetUserId,
        read: false,
        ...data
    };

    try {
        // PRIMA: Prova con Supabase
        if (supabase) {
            const { data: result, error } = await supabase
                .from('notifications')
                .insert([notification])
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ Notifica creata su Supabase');
            
            // Se è per l'utente corrente, mostra toast immediato
            if (targetUserId === currentUser.uid) {
                showMentionToast(result);
            }
            
            return result;
        } else {
            // FALLBACK: localStorage
            saveLocalNotification(targetUserId, notification);
        }

    } catch (error) {
        console.error('Errore creazione notifica:', error);
        // Fallback locale in caso di errore
        saveLocalNotification(targetUserId, notification);
    }
}


function loadNotifications() {
    if (!currentUser) {
        return;
    }

    // PRIMA: Prova con Supabase + Real-time
    if (supabase) {
        loadNotificationsFromSupabase();
    } else {
        // FALLBACK: localStorage
        loadNotificationsFromLocalStorage();
    }
}

// AGGIUNGERE queste nuove funzioni dopo loadNotifications:
// Carica notifiche da Supabase con listener real-time
async function loadNotificationsFromSupabase() {
    try {
        // Imposta contesto utente per RLS
        await supabase.rpc('set_current_user_context', { user_uid: currentUser.uid });
        
        // Carica notifiche iniziali
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.uid)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Errore caricamento notifiche Supabase:', error);
            loadNotificationsFromLocalStorage();
            return;
        }

        notificationsData = data || [];
        updateNotificationsUI();
        
        console.log('✅ Notifiche caricate da Supabase:', notificationsData.length);

        // Setup listener real-time per nuove notifiche
        setupNotificationsRealTimeListener();

    } catch (error) {
        console.error('Errore setup notifiche Supabase:', error);
        loadNotificationsFromLocalStorage();
    }
}

// Setup listener real-time per notifiche
function setupNotificationsRealTimeListener() {
    if (window.notificationsSubscription) {
        window.notificationsSubscription.unsubscribe();
    }

    window.notificationsSubscription = supabase
        .channel(`notifications_${currentUser.uid}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${currentUser.uid}`
            },
            (payload) => {
                console.log('🔔 Nuova notifica ricevuta:', payload.new);
                
                // Aggiungi la nuova notifica
                notificationsData.unshift(payload.new);
                
                // Mantieni solo le ultime 20
                if (notificationsData.length > 20) {
                    notificationsData = notificationsData.slice(0, 20);
                }
                
                updateNotificationsUI();
                showMentionToast(payload.new);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${currentUser.uid}`
            },
            (payload) => {
                console.log('🔄 Notifica aggiornata:', payload.new);
                
                // Aggiorna la notifica esistente
                const index = notificationsData.findIndex(n => n.id === payload.new.id);
                if (index !== -1) {
                    notificationsData[index] = payload.new;
                    updateNotificationsUI();
                }
            }
        )
        .subscribe();

    console.log('✅ Listener real-time notifiche attivato');
}

// Carica notifiche da localStorage (fallback)
function loadNotificationsFromLocalStorage() {
    const storageKey = `hc_notifications_${currentUser.uid}`;
    const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
    notificationsData = notifications.slice(0, 20);
    updateNotificationsUI();
    console.log('✅ Notifiche caricate da localStorage:', notificationsData.length);
}

function updateNotificationsUI() {
    const unreadCount = notificationsData.filter(n => !n.read).length;
    unreadNotificationsCount = unreadCount;

    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

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
                    <div class="notification-user">${notification.from_user}</div>
                    <div class="notification-message">${getNotificationMessage(notification)}</div>
                    ${notification.threadTitle ? `<div class="notification-thread">in "${notification.threadTitle}"</div>` : ''}
                    <div class="notification-time">${formatTime(notification.created_at)}</div>
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
        case 'new_user':
            return '🆕';
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
        case 'new_user':
            return notification.message || 'Nuovo utente registrato';
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
        // PRIMA: Prova con Supabase
        if (supabase) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId)
                .eq('user_id', currentUser.uid);

            if (error) throw error;
            
            console.log('✅ Notifica marcata come letta su Supabase');
        } else {
            // FALLBACK: localStorage
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
    
    if (unreadNotifications.length === 0) return;

    try {
        // PRIMA: Prova con Supabase  
        if (supabase) {
            const unreadIds = unreadNotifications.map(n => n.id);
            
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .in('id', unreadIds)
                .eq('user_id', currentUser.uid);

            if (error) throw error;
            
            console.log('✅ Tutte le notifiche marcate come lette su Supabase');
        } else {
            // FALLBACK: localStorage
            for (const notification of unreadNotifications) {
                await markNotificationAsRead(notification.id);
            }
        }
    } catch (error) {
        console.error('Errore marcatura notifiche:', error);
    }
}

function markVisibleNotificationsAsRead() {
    const unreadNotifications = notificationsData.filter(n => !n.read).slice(0, 10);

    unreadNotifications.forEach(notification => {
        markNotificationAsRead(notification.id);
    });
}

// Toast notifications
function showMentionToast(notification) {
    if (notification.user_id !== currentUser?.uid)
        return;

    const toast = createToast({
        type: 'mention',
        title: 'Nuova menzione',
        message: `${notification.from_user} ti ha menzionato`,
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
            <div class="toast-actions">
                ${options.actions.map((action, index) => `
                    <button class="toast-btn ${action.secondary ? 'toast-btn-secondary' : ''}" 
                            onclick="handleToastAction('${toastId}', ${index})">
                        ${action.text}
                    </button>
                `).join('')}
            </div>
        ` : ''}
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

// Inizializza l'applicazione
async function initializeApp() {
    console.log('🔥 Inizializzazione applicazione...');
    
    // Inizializza Supabase
    await initializeSupabase();
    
    // Assegna funzioni Firebase se disponibili
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

    // Aggiorna status Firebase nella modal
    const statusEl = document.getElementById('firebase-status');
    const hintEl = document.getElementById('demo-hint');

    if (window.useFirebase && window.firebaseAuth && firebaseReady) {
        statusEl.style.background = 'rgba(0, 255, 0, 0.1)';
        statusEl.style.color = '#008800';

        if (window.appCheckEnabled) {
            statusEl.textContent = '🔥 Firebase + 🗄️ Supabase - Sistema inizializzato correttamente';
        } else {
            statusEl.textContent = '🔥 Firebase + 🗄️ Supabase - App Check disabilitato';
        }

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

// Gestione login utente
async function handleUserLogin(user) {
    document.getElementById('loginModal').style.display = 'none';
    
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.classList.add('user-logged-in');
    }

    updateUserInterface();
    setupUserPresence();
    
    // 🆕 AGGIUNTO: Sincronizzare con Supabase
    await syncUserWithSupabase(user);
    
    loadUserProfile();
    initializeNotifications();

    setTimeout(() => {
        setupAvatarUpload();
        if (currentUserData && currentUserData.avatarUrl) {
            updateUserAvatarDisplay(currentUserData.avatarUrl);
        }
        if (window.activityTracker) {
        await window.activityTracker.init();
    }
    }, 100);

    if (currentSection === 'home') {
        setTimeout(() => {
            loadDashboard();
        }, 500);
    }
}

// Gestione logout utente
function handleUserLogout() {
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.classList.remove('user-logged-in');
    }

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

     // Ferma Activity Tracker
    if (window.activityTracker) {
        window.activityTracker.recordLogout();
    }

    // Chiudi subscriptions notifiche
    if (window.notificationsSubscription) {
        window.notificationsSubscription.unsubscribe();
        window.notificationsSubscription = null;
    }

    document.getElementById('loginModal').style.display = 'flex';
}

// Carica profilo utente
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
                
                // 🆕 AGGIUNTO: Sincronizzare con Supabase ogni volta
                await syncUserWithSupabase(currentUser, currentUserData);
                
                const displayUsername = currentUserData.username || 'Utente';
                
                document.getElementById('currentUsername').textContent = displayUsername;
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
        
        // 🆕 AGGIUNTO: Sincronizzare anche in modalità locale
        if (currentUserData) {
            await syncUserWithSupabase(currentUser, currentUserData);
        }
    }

    setupAvatarUpload();

    if (currentUserData && currentUserData.avatarUrl) {
        updateUserAvatarDisplay(currentUserData.avatarUrl);
    }

    updateClanSectionsAccess();
    updateAdminSectionsAccess();
}

async function ensureUserSyncedWithSupabase() {
    if (!currentUser || !supabase) return false;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('uid')
            .eq('uid', currentUser.uid)
            .single();

        if (error || !data) {
            console.log('🔄 Utente non sincronizzato, sincronizzazione in corso...');
            await syncUserWithSupabase(currentUser, currentUserData);
            return true;
        }

        return true;
    } catch (error) {
        console.error('Errore verifica sincronizzazione:', error);
        return false;
    }
}


function getUserDisplayName() {
    if (currentUserData && currentUserData.username) {
        return currentUserData.username;
    }
    
    if (currentUser && currentUser.displayName) {
        return currentUser.displayName;
    }
    
    if (currentUser && currentUser.email) {
        return currentUser.email.split('@')[0];
    }
    
    return 'Utente';
}

function loadLocalUserProfile() {
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
    const userData = users[currentUser.email];

    if (userData) {
        const realUsers = Object.values(users).filter(user =>
                !user.uid.startsWith('super_admin_') &&
                !user.uid.startsWith('clan_mod_') &&
                !user.uid.startsWith('user_'));

        if (realUsers.length > 0 && realUsers[0].uid === userData.uid) {
            if (!userData.role || userData.role === USER_ROLES.USER) {
                userData.role = USER_ROLES.SUPERUSER;
                users[currentUser.email] = userData;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
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
            statusEl.textContent = '🟢 Firebase + Supabase Connesso';
        } else {
            statusEl.className = 'connection-status offline';
            statusEl.textContent = '🔴 Firebase Disconnesso';
        }
    } else {
        statusEl.className = 'connection-status online';
        statusEl.textContent = '🟡 Modalità Demo Locale';
    }
}

// Gestione interfaccia login/registrazione
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
        } else {
            await simulateLogin(email, password);
        }

        showSuccess('Login effettuato con successo!');

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
            const userRole = await determineUserRole();
            
            await set(userRef, {
                username: '',
                email: user.email,
                clan: 'Nessuno',
                role: userRole,
                createdAt: Date.now(),
                lastSeen: Date.now(),
                provider: 'google',
                needsUsername: true
            });

            setTimeout(() => {
                if (window.usernameManager) {
                    window.usernameManager.showUsernameModal(user);
                } else {
                    handleUserLogin(user);
                }
            }, 100);

        } else {
            const userData = snapshot.val();
            
            if (userData.needsUsername === true || !userData.username || userData.username.trim() === '') {
                setTimeout(() => {
                    if (window.usernameManager) {
                        window.usernameManager.showUsernameModal(user, userData);
                    } else {
                        handleUserLogin(user);
                    }
                }, 100);
            } else {
                showSuccess('Login con Google effettuato con successo!');
            }
        }

    } catch (error) {
        console.error('❌ Errore login Google:', error);

        let errorMessage = 'Errore nel login con Google';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'Login annullato dall\'utente';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'Popup bloccato dal browser. Abilita i popup per questo sito.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Errore di connessione. Controlla la tua connessione internet.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Troppi tentativi. Riprova tra qualche minuto.';
                break;
            default:
                if (error.message) {
                    errorMessage = error.message;
                }
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

function handleUserLogin(user) {
    const isGoogleUser = user.providerData && user.providerData.some(provider => 
        provider.providerId === 'google.com'
    );
    
    if (isGoogleUser && window.usernameManager) {
        window.usernameManager.checkUserNeedsUsername(user).then(needsUsername => {
            if (needsUsername) {
                setTimeout(() => {
                    window.usernameManager.showUsernameModal(user);
                }, 500);
                return;
            }
            
            completeUserLogin(user);
        }).catch(error => {
            console.error('Errore controllo username:', error);
            completeUserLogin(user);
        });
    } else {
        completeUserLogin(user);
    }
}

function completeUserLogin(user) {
    document.getElementById('loginModal').style.display = 'none';
    
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.classList.add('user-logged-in');
    }

    updateUserInterface();
    setupUserPresence();
    loadUserProfile();
    initializeNotifications();

    setTimeout(() => {
        setupAvatarUpload();
        if (currentUserData && currentUserData.avatarUrl) {
            updateUserAvatarDisplay(currentUserData.avatarUrl);
        }
    }, 200);

    if (currentSection === 'home') {
        setTimeout(() => {
            loadDashboard();
        }, 500);
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
        const isFirstUser = userRole === USER_ROLES.SUPERUSER;

        if (window.useFirebase && firebaseReady && createUserWithEmailAndPassword) {
            const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: username
            });

            const userData = {
                username: username,
                email: email,
                clan: 'Nessuno',
                role: userRole,
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp(),
                provider: 'email',
                needsUsername: false
            };

            await set(ref(window.firebaseDatabase, `users/${user.uid}`), userData);

            const newUserData = {
                uid: user.uid,
                username: username,
                email: email,
                clan: 'Nessuno',
                role: userRole,
                provider: 'email'
            };
            
            await handleNewUserComplete(newUserData, isFirstUser);

        } else {
            await simulateRegister(email, password, username, 'Nessuno', userRole);
            
            const newUserData = {
                uid: 'local_' + Date.now(),
                username: username,
                email: email,
                clan: 'Nessuno',
                role: userRole,
                provider: 'email'
            };
            
            await handleNewUserComplete(newUserData, isFirstUser);
        }

        const roleMessage = userRole === USER_ROLES.SUPERUSER ?
            '\n🎉 Sei il primo utente! Ti sono stati assegnati i privilegi di SUPERUSER.' : '';

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
                createdAt: Date.now(),
                provider: 'email'
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
    window.location.reload();
}

function initializeLocalData() {
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');

    const realUsers = Object.values(users).filter(user =>
            !user.uid.startsWith('super_admin_') &&
            !user.uid.startsWith('clan_mod_') &&
            !user.uid.startsWith('user_'));

    if (realUsers.length > 0) {
        const firstRealUser = realUsers[0];
        if (!firstRealUser.role || firstRealUser.role === USER_ROLES.USER) {
            firstRealUser.role = USER_ROLES.SUPERUSER;
            for (const email in users) {
                if (users[email].uid === firstRealUser.uid) {
                    users[email].role = USER_ROLES.SUPERUSER;
                    localStorage.setItem('hc_local_users', JSON.stringify(users));
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
    }

    // Inizializza dati thread su localStorage per demo
    const sections = ['salotto', 'eventi', 'oggetti', 'novita', 'associa-clan', 'segnalazioni'];
    sections.forEach(section => {
        const threads = JSON.parse(localStorage.getItem(`hc_threads_${section}`) || '[]');
        if (threads.length === 0) {
            const exampleThreads = getExampleThreads(section);
            localStorage.setItem(`hc_threads_${section}`, JSON.stringify(exampleThreads));
        }
    });

    // Inizializza messaggi chat
    const messages = JSON.parse(localStorage.getItem(`hc_messages_chat-generale`) || '[]');
    if (messages.length === 0) {
        const exampleMessages = getExampleMessages('chat-generale');
        localStorage.setItem(`hc_messages_chat-generale`, JSON.stringify(exampleMessages));
    }
}

function getExampleThreads(section) {
    const examples = {
        'salotto': [{
            id: 'salotto_thread_1',
            title: 'Chiacchiere del giorno',
            content: 'Un posto per parlare di tutto e di niente!',
            author: 'Admin',
            authorId: 'super_admin_001',
            createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
            replies: 5,
            views: 42,
            status: 'approved'
        }],
        'eventi': [{
            id: 'evt_demo_1',
            title: '🎃 Evento Halloween - Strategie e Premi',
            content: 'Discussione sulle migliori strategie per l\'evento Halloween!',
            author: 'EventMaster',
            authorId: 'super_admin_001',
            createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            replies: 15,
            views: 87,
            status: 'approved'
        }],
        'oggetti': [{
            id: 'obj_demo_1',
            title: '⚔️ Nuove armi leggendarie',
            content: 'Discussione sulle nuove armi aggiunte nell\'ultimo aggiornamento',
            author: 'WeaponMaster',
            authorId: 'super_admin_001',
            createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
            replies: 8,
            views: 65,
            status: 'approved'
        }],
        'novita': [{
            id: 'news_demo_1',
            title: '📢 Aggiornamento 1.58.0 - Nuove Features!',
            content: 'Tutte le novità dell\'ultimo aggiornamento del gioco',
            author: 'GameUpdater',
            authorId: 'super_admin_001',
            createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
            replies: 23,
            views: 145,
            status: 'approved'
        }],
        'segnalazioni': [{
            id: 'bug_report_1',
            title: '🐞 Bug - Problema con equipaggiamento',
            content: 'Segnalazione di un bug nell\'equipaggiamento degli oggetti',
            author: 'BugHunter',
            authorId: 'user_001',
            createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
            replies: 2,
            views: 18,
            status: 'approved'
        }]
    };
    return examples[section] || [];
}

function getExampleMessages(section) {
    return [];
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

// Gestione sezioni
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
     if (currentSection && currentSection !== sectionKey && window.markSectionAsVisited) {
        window.markSectionAsVisited(currentSection);
    }

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
    const targetNav = document.querySelector(`[data-section="${sectionKey}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }
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

// SUPABASE FUNCTIONS - THREAD MANAGEMENT
async function loadThreads(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath) return;

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('threads')
                .select('*')
                .eq('section', sectionKey)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            
            displayThreads(data || []);
        } catch (error) {
            console.error('Errore caricamento threads Supabase:', error);
            loadLocalThreads(sectionKey);
        }
    } else {
        loadLocalThreads(sectionKey);
    }
}

function loadLocalThreads(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath) return;
    
    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
    const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
    threads.sort((a, b) => b.createdAt - a.createdAt);
    displayThreads(threads);
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
        const statusClass = thread.status === 'pending' ? 'thread-pending' :
            thread.status === 'rejected' ? 'thread-rejected' : '';
        const statusIndicator = thread.status === 'pending' ? '<span class="pending-indicator">PENDING</span>' :
            thread.status === 'rejected' ? '<span class="pending-indicator" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c;">RIFIUTATO</span>' : '';

        const author = allUsers.find(u => u.uid === thread.author_id) || {
            username: thread.author,
            clan: 'Nessuno'
        };

        return `
            <div class="thread-item ${statusClass}">
                <div class="thread-main">
                    <div class="thread-title" onclick="openThread('${thread.id}', '${currentSection}')">
                        ${thread.title}
                        ${statusIndicator}
                    </div>
                    <div class="thread-author-info">
                        <span class="thread-author-name">da ${thread.author}</span>
                        ${createClanBadgeHTML(author.clan)}
                    </div>
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
                            <span>${formatTime(thread.created_at || thread.createdAt)}</span>
                        </div>
                    </div>
                    ${thread.status === 'pending' && canModerateSection(currentSection) ? `
                        <div class="moderation-actions">
                            <button class="approve-btn" onclick="approveThread('${thread.id}', '${currentSection}')">
                                ✅ Approva
                            </button>
                            <button class="reject-btn" onclick="rejectThread('${thread.id}', '${currentSection}')">
                                ❌ Rifiuta
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="thread-replies">${thread.replies || 0}</div>
                <div class="thread-stats">${thread.views || 0}</div>
                <div class="thread-last-post">
                    <div>${formatTime(thread.created_at || thread.createdAt)}</div>
                    <div>da <strong>${thread.author}</strong></div>
                </div>
            </div>
        `;
    }).join('');
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

    const isSynced = await ensureUserSyncedWithSupabase();
    if (!isSynced) {
        alert('Errore di sincronizzazione utente. Riprova tra qualche secondo.');
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
            author: getUserDisplayName(),
            author_id: currentUser.uid,
            section: currentSection,
            created_at: new Date().toISOString(),
            replies: 0,
            views: 0
        };

        if (imageFile) {
            createBtn.textContent = 'Caricamento immagine...';
            progressContainer.style.display = 'block';

            const imageUrl = await uploadThreadImage(imageFile, (progress) => {
                updateUploadProgress(progress);
            });

            if (imageUrl) {
                threadData.image_url = imageUrl;
                threadData.image_name = imageFile.name;
            }
        }

        const needsApproval = currentSection.startsWith('clan-') && !canModerateSection(currentSection);
        threadData.status = needsApproval ? 'pending' : 'approved';

        createBtn.textContent = 'Salvando thread...';

        if (supabase) {
            const { data, error } = await supabase
                .from('threads')
                .insert([threadData])
                .select()
                .single();

            if (error) throw error;
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
        if (error.code === '42501') {
            alert('❌ Errore di permessi. Assicurati di essere autenticato correttamente.');
            
            // Tentare una nuova sincronizzazione
            await syncUserWithSupabase(currentUser, currentUserData);
        } else {
            alert('Errore nella creazione del thread: ' + (error.message || error));
        }
        
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
        document.getElementById('thread-date').textContent = formatTime(thread.created_at || thread.createdAt);
        document.getElementById('thread-views').textContent = `${thread.views || 0} visualizzazioni`;

        const threadContentEl = document.getElementById('thread-content');
        let contentHtml = processContent(thread.content || 'Nessun contenuto disponibile', true);

        if (thread.image_url || thread.imageUrl) {
            const imageUrl = thread.image_url || thread.imageUrl;
            const imageName = thread.image_name || thread.imageName || 'Immagine del thread';
            contentHtml += `
                <div class="thread-image">
                    <img src="${imageUrl}" 
                         alt="${imageName}" 
                         onclick="openImageModal('${imageUrl}', '${imageName}')"
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

async function getThread(threadId, section) {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('threads')
                .select('*')
                .eq('id', threadId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Errore recupero thread Supabase:', error);
        }
    }

    // Fallback locale
    const dataPath = getDataPath(section, 'threads');
    if (!dataPath) return null;

    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
    const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return threads.find(t => t.id === threadId) || null;
}

async function incrementThreadViews(threadId, section) {
    if (supabase) {
        try {
            const { error } = await supabase
                .from('threads')
                .update({ views: (currentThread?.views || 0) + 1 })
                .eq('id', threadId);

            if (error) throw error;
        } catch (error) {
            console.error('Errore incremento views Supabase:', error);
        }
    } else {
        // Fallback locale
        const dataPath = getDataPath(section, 'threads');
        if (!dataPath) return;

        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const threadIndex = threads.findIndex(t => t.id === threadId);

        if (threadIndex !== -1) {
            threads[threadIndex].views = (threads[threadIndex].views || 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify(threads));
        }
    }
}

// SUPABASE FUNCTIONS - COMMENT MANAGEMENT
async function loadThreadComments(threadId, section) {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('thread_id', threadId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;
            
            displayThreadComments(data || []);
        } catch (error) {
            console.error('Errore caricamento commenti Supabase:', error);
            loadLocalComments(threadId, section);
        }
    } else {
        loadLocalComments(threadId, section);
    }
}

function loadLocalComments(threadId, section) {
    const dataPath = getDataPath(section, 'comments');
    if (!dataPath) return;
    
    const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
    const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    comments.sort((a, b) => a.timestamp - b.timestamp);
    displayThreadComments(comments);
}

async function displayThreadComments(comments) {
    const commentsContainer = document.getElementById('thread-comments');

    if (comments.length === 0) {
        commentsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                Nessun commento ancora. Sii il primo a commentare!
            </div>
        `;
        return;
    }

    const uniqueUserIds = [...new Set(comments.map(comment => comment.author_id || comment.authorId).filter(Boolean))];
    try {
        await Promise.all(uniqueUserIds.map(userId => loadUserWithAvatar(userId)));
    } catch (error) {
        console.warn('Errore pre-caricamento avatar commenti:', error);
    }

    commentsContainer.innerHTML = comments.map(comment => {
        const userId = comment.author_id || comment.authorId;
        const user = allUsers.find(u => u.uid === userId) || {
            uid: userId || 'unknown',
            username: comment.author,
            clan: 'Nessuno',
            avatarUrl: null
        };

        let commentContentHtml = '';

        if (comment.content && comment.content.trim()) {
            const processedContent = processContent(comment.content, true);
            const contentWithMentions = highlightMentions(processedContent, currentUser?.uid);
            commentContentHtml += `<div class="comment-text">${contentWithMentions}</div>`;
        }

        const imageUrl = comment.image_url || comment.imageUrl;
        if (imageUrl) {
            const imageName = comment.image_name || comment.imageName || 'Immagine del commento';
            commentContentHtml += `
                <div class="comment-image">
                    <img src="${imageUrl}" 
                         alt="${imageName}" 
                         class="comment-main-image"
                         onclick="openImageModal('${imageUrl}', '${imageName}')"
                         title="Clicca per ingrandire">
                </div>
            `;
        }

        const timestamp = comment.created_at || comment.timestamp;
        return `
            <div class="comment-with-avatar">
                ${createAvatarHTML(user, 'small')}
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author-name">${comment.author}</span>
                        ${createClanBadgeHTML(user.clan)}
                        <span class="comment-time">${formatTime(timestamp)}</span>
                    </div>
                    <div class="comment-body">${commentContentHtml}</div>
                </div>
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

    const mentions = detectMentions(commentText);
    const commentBtn = document.getElementById('submit-comment-btn');
    const progressContainer = document.getElementById('comment-upload-progress');

    commentBtn.disabled = true;
    commentBtn.textContent = 'Invio...';

    try {
        const commentData = {
            author: getUserDisplayName(),
            author_id: currentUser.uid,
            content: commentText || '',
            thread_id: currentThreadId,
            created_at: new Date().toISOString()
        };

        if (imageFile) {
            commentBtn.textContent = 'Caricamento immagine...';
            progressContainer.style.display = 'block';

            const imageUrl = await uploadThreadImage(imageFile, (progress) => {
                updateCommentUploadProgress(progress);
            });

            if (imageUrl) {
                commentData.image_url = imageUrl;
                commentData.image_name = imageFile.name;
            }
        }

        commentBtn.textContent = 'Salvando commento...';

        if (supabase) {
            const { data, error } = await supabase
                .from('comments')
                .insert([commentData])
                .select()
                .single();

            if (error) throw error;
            
            await incrementThreadReplies(currentThreadId, currentThreadSection);
        } else {
            saveLocalComment(currentThreadSection, currentThreadId, commentData);
        }

        for (const mention of mentions) {
            await createNotification('mention', mention.userId, {
                message: commentText,
                section: currentThreadSection,
                threadId: currentThreadId,
                threadTitle: currentThread?.title,
                sectionTitle: sectionConfig[currentThreadSection]?.title || 'Forum'
            });
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

async function incrementThreadReplies(threadId, section) {
    if (supabase) {
        try {
            const { error } = await supabase
                .from('threads')
                .update({ replies: (currentThread?.replies || 0) + 1 })
                .eq('id', threadId);

            if (error) throw error;
        } catch (error) {
            console.error('Errore incremento replies Supabase:', error);
        }
    } else {
        // Fallback locale
        const dataPath = getDataPath(section, 'threads');
        if (!dataPath) return;

        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const threadIndex = threads.findIndex(t => t.id === threadId);

        if (threadIndex !== -1) {
            threads[threadIndex].replies = (threads[threadIndex].replies || 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify(threads));
        }
    }
}

function saveLocalComment(section, threadId, commentData) {
    const dataPath = getDataPath(section, 'comments');
    if (!dataPath) return;

    const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
    const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    commentData.timestamp = Date.now();
    commentData.id = 'comment_' + Date.now();
    commentData.author = getUserDisplayName();
    comments.push(commentData);
    localStorage.setItem(storageKey, JSON.stringify(comments));

    incrementThreadReplies(threadId, section);
    loadThreadComments(threadId, section);
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

// CHAT FUNCTIONS (rimangono su Firebase)
function loadMessages(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'messages');
    if (!dataPath) return;

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
            const limitedMessages = messages.slice(-50);
            
            displayMessages(limitedMessages);
            updateMessageCounter(limitedMessages.length);
        };

        messageListeners[sectionKey] = { path: dataPath, callback: callback };
        onValue(messagesRef, callback);
        
    } else {
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        messages.sort((a, b) => a.timestamp - b.timestamp);
        displayMessages(messages);
        updateMessageCounter(messages.length);
    }
}

async function displayMessages(messages) {
    const chatMessages = document.getElementById('chat-messages');

    if (messages.length === 0) {
        chatMessages.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                Nessun messaggio in questa chat. Inizia la conversazione!
            </div>
        `;
        return;
    }

    let htmlContent = '';
    let lastAuthor = '';
    let lastTimestamp = 0;

    const uniqueUserIds = [...new Set(messages.map(msg => msg.authorId).filter(Boolean))];
    try {
        await Promise.all(uniqueUserIds.map(userId => loadUserWithAvatar(userId)));
    } catch (error) {
        console.warn('Errore pre-caricamento avatar:', error);
    }

    for (let index = 0; index < messages.length; index++) {
        const msg = messages[index];

        if (msg.isSystemMessage) {
            htmlContent += `
                <div class="message-bubble-container system-message">
                    <div class="message-bubble system-bubble">
                        <div class="message-text">${highlightMentions(processContent(msg.message, true), currentUser?.uid)}</div>
                        <div class="message-meta">
                            <span class="message-time-bubble">${formatTimeShort(msg.timestamp)}</span>
                        </div>
                    </div>
                </div>
            `;
            continue;
        }
        
        const user = allUsers.find(u => u.uid === msg.authorId) || {
            uid: msg.authorId || 'unknown',
            username: msg.author,
            clan: 'Nessuno',
            avatarUrl: null
        };

        const isOwnMessage = currentUser && msg.authorId === currentUser.uid;
        const isNewAuthor = msg.author !== lastAuthor;
        const timeDiff = msg.timestamp - lastTimestamp;
        const showTimestamp = timeDiff > 300000;

        if (showTimestamp && index > 0) {
            htmlContent += `
                <div class="message-time-separator">
                    <span>${formatDate(msg.timestamp)}</span>
                </div>
            `;
        }

        const processedMessage = processContent(msg.message, true);
        const messageWithMentions = highlightMentions(processedMessage, currentUser?.uid);

        htmlContent += `
            <div class="message-bubble-container ${isOwnMessage ? 'own-message' : 'other-message'}">
                ${!isOwnMessage && isNewAuthor ? `
                    <div class="message-avatar-small">
                        ${createAvatarHTML(user, 'small')}
                    </div>
                ` : `<div class="message-avatar-spacer"></div>`}
                
                <div class="message-bubble ${isOwnMessage ? 'own-bubble' : 'other-bubble'}">
                    ${!isOwnMessage && isNewAuthor ? `
                        <div class="message-author-header">
                            <span class="message-author-name">${msg.author}</span>
                            ${createClanBadgeHTML(user.clan)}
                        </div>
                    ` : ''}
                    
                    <div class="message-text">${messageWithMentions}</div>
                    
                    <div class="message-meta">
                        <span class="message-time-bubble">${formatTimeShort(msg.timestamp)}</span>
                        ${isOwnMessage ? '<span class="message-status">✓</span>' : ''}
                    </div>
                </div>
            </div>
        `;

        lastAuthor = msg.author;
        lastTimestamp = msg.timestamp;
    }

    chatMessages.innerHTML = htmlContent;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
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

    if (!message) return;

    const mentions = detectMentions(message);

    input.disabled = true;
    sendBtn.disabled = true;

    try {
        const messageData = {
            author: getUserDisplayName(),
            authorId: currentUser.uid,
            message: message,
            timestamp: Date.now()
        };

        const dataPath = getDataPath(currentSection, 'messages');
        if (!dataPath) {
            alert('Errore: sezione non valida');
            return;
        }

        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push) {
            const messagesRef = ref(window.firebaseDatabase, dataPath);
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
        
        if (error.code === 'PERMISSION_DENIED') {
            alert('❌ Errore di permessi nell\'invio del messaggio');
        } else {
            alert('Errore nell\'invio del messaggio: ' + (error.message || error));
        }
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

function saveLocalMessage(section, messageData) {
    const dataPath = getDataPath(section, 'messages');
    if (!dataPath) return;

    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
    const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    messageData.timestamp = Date.now();
    messageData.id = 'msg_' + Date.now();
    messageData.author = getUserDisplayName();
    messages.push(messageData);
    localStorage.setItem(storageKey, JSON.stringify(messages));

    loadMessages(section);
}

function saveLocalThread(section, threadData) {
    const dataPath = getDataPath(section, 'threads');
    if (!dataPath) return;

    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
    const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
    threadData.createdAt = Date.now();
    threadData.id = 'thread_' + Date.now();
    threadData.replies = 0;
    threadData.views = 0;
    threadData.author = getUserDisplayName();

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

// Thread Management Functions
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

function hideThreadCreationModal() {
    document.getElementById('threadCreationModal').style.display = 'none';
    document.getElementById('thread-title-input').value = '';
    document.getElementById('thread-content-input').value = '';
    removeSelectedImage();
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

    if (!file) return;

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

async function uploadThreadImage(file, progressCallback) {
    if (!file) return null;

    try {
        if (window.useFirebase && window.firebaseStorage && firebaseReady && storageRef && uploadBytes && getDownloadURL) {
            try {
                const timestamp = Date.now();
                const filename = `threads/${currentUser.uid}/${timestamp}_${file.name}`;
                const imageRef = storageRef(window.firebaseStorage, filename);

                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 30;
                    if (progress > 90) progress = 90;
                    progressCallback(progress);
                }, 200);

                const snapshot = await uploadBytes(imageRef, file);
                clearInterval(progressInterval);
                progressCallback(100);

                const downloadURL = await getDownloadURL(snapshot.ref);
                return downloadURL;

            } catch (storageError) {
                console.warn('⚠️ Errore Firebase Storage, uso fallback locale:', storageError.message);
                return convertToBase64(file, progressCallback);
            }
        } else {
            return convertToBase64(file, progressCallback);
        }
    } catch (error) {
        console.error('Errore upload immagine:', error);
        return convertToBase64(file, progressCallback);
    }
}

function convertToBase64(file, progressCallback) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            progressCallback(100);
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
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

// Emoticon functions
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
    const input = type === 'chat' ?
        document.getElementById('message-input') :
        document.getElementById('comment-text');

    const cursorPos = input.selectionStart;
    const textBefore = input.value.substring(0, cursorPos);
    const textAfter = input.value.substring(cursorPos);

    input.value = textBefore + emoticon + textAfter;
    input.focus();
    input.setSelectionRange(cursorPos + emoticon.length, cursorPos + emoticon.length);

    document.getElementById(`${type}-emoticon-panel`).classList.remove('show');
}

// Image modal functions
function openImageModal(imageUrl, imageName) {
    if (event && event.target) {
        if (event.target.classList.contains('avatar-image') || 
            event.target.closest('.user-avatar, .message-avatar, .comment-avatar, .user-avatar-default')) {
            return false;
        }
    }

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

// Comment image upload functions
function toggleCommentImageUpload() {
    const uploadSection = document.getElementById('comment-image-upload');
    const isVisible = uploadSection.classList.contains('show');

    if (isVisible) {
        uploadSection.classList.remove('show');
        removeCommentSelectedImage();
    } else {
        uploadSection.classList.add('show');
        if (!commentImageUploadInitialized) {
            setupCommentImageUploadSafe();
        }
    }
}

function setupCommentImageUploadSafe() {
    const imageInput = document.getElementById('comment-image-input');
    const imageLabel = document.querySelector('#comment-image-upload .image-upload-label');

    if (!imageInput || !imageLabel) {
        return;
    }

    cleanupCommentImageListeners();

    const clickHandler = () => {
        imageInput.click();
    };

    const changeHandler = (event) => {
        handleCommentImageSelect(event);
    };

    imageLabel._commentClickHandler = clickHandler;
    imageInput._commentChangeHandler = changeHandler;

    imageLabel.addEventListener('click', clickHandler);
    imageInput.addEventListener('change', changeHandler);

    commentImageUploadInitialized = true;
}

function cleanupCommentImageListeners() {
    const imageInput = document.getElementById('comment-image-input');
    const imageLabel = document.querySelector('#comment-image-upload .image-upload-label');

    if (imageInput && imageInput._commentChangeHandler) {
        imageInput.removeEventListener('change', imageInput._commentChangeHandler);
        delete imageInput._commentChangeHandler;
    }

    if (imageLabel && imageLabel._commentClickHandler) {
        imageLabel.removeEventListener('click', imageLabel._commentClickHandler);
        delete imageLabel._commentClickHandler;
    }
}

function cleanupCommentImageUpload() {
    cleanupCommentImageListeners();
    commentImageUploadInitialized = false;
    removeCommentSelectedImage();

    const uploadSection = document.getElementById('comment-image-upload');
    if (uploadSection) {
        uploadSection.classList.remove('show');
    }
}

function handleCommentImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('comment-image-preview');
    const progressContainer = document.getElementById('comment-upload-progress');

    if (!file) return;

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

// Avatar functions
function setupAvatarUpload() {
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarControls = document.getElementById('avatarControls');

    if (avatarUpload && currentUser) {
        avatarControls.style.display = 'block';
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Seleziona solo file immagine (JPG, PNG, GIF, etc.)');
        return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('L\'immagine è troppo grande. Massimo 2MB consentiti per l\'avatar.');
        return;
    }

    currentAvatarFile = file;
    showAvatarModal(file);
}

function showAvatarModal(file) {
    const modal = document.getElementById('avatarModal');
    const previewLarge = document.getElementById('avatarPreviewLarge');
    const previewSmall = document.getElementById('avatarPreviewSmall');

    const reader = new FileReader();
    reader.onload = function (e) {
        previewLarge.src = e.target.result;
        previewSmall.src = e.target.result;
    };
    reader.readAsDataURL(file);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function saveAvatarChanges() {
    if (!currentAvatarFile || isAvatarUploading) return;

    isAvatarUploading = true;
    const saveBtn = document.querySelector('.btn-save-avatar');
    const progressContainer = document.getElementById('avatar-upload-progress');

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Caricando...';
    progressContainer.style.display = 'block';

    try {
        const avatarUrl = await uploadAvatarImage(currentAvatarFile, (progress) => {
            updateAvatarUploadProgress(progress);
        });

        if (avatarUrl) {
            await updateUserAvatar(avatarUrl);
            updateUserAvatarDisplay(avatarUrl);
            alert('✅ Avatar aggiornato con successo!');
            cancelAvatarChange();
        }

    } catch (error) {
        console.error('Errore upload avatar:', error);
        alert('❌ Errore nel caricamento dell\'avatar: ' + (error.message || error));
    } finally {
        isAvatarUploading = false;
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Salva Avatar';
        progressContainer.style.display = 'none';
    }
}

function cancelAvatarChange() {
    const modal = document.getElementById('avatarModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    document.getElementById('avatar-upload').value = '';
    currentAvatarFile = null;
}

async function removeAvatar() {
    if (!confirm('🗑️ Sei sicuro di voler rimuovere il tuo avatar?')) return;

    try {
        await updateUserAvatar(null);
        updateUserAvatarDisplay(null);
        alert('✅ Avatar rimosso con successo!');
        cancelAvatarChange();
    } catch (error) {
        console.error('Errore rimozione avatar:', error);
        alert('❌ Errore nella rimozione dell\'avatar');
    }
}

async function uploadAvatarImage(file, progressCallback) {
    if (!file) return null;

    try {
        if (window.useFirebase && window.firebaseStorage && firebaseReady && storageRef && uploadBytes && getDownloadURL) {
            try {
                const timestamp = Date.now();
                const filename = `avatars/${currentUser.uid}/${timestamp}_avatar.${file.name.split('.').pop()}`;
                const imageRef = storageRef(window.firebaseStorage, filename);

                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 30;
                    if (progress > 90) progress = 90;
                    progressCallback(progress);
                }, 200);

                const snapshot = await uploadBytes(imageRef, file);
                clearInterval(progressInterval);
                progressCallback(100);

                const downloadURL = await getDownloadURL(snapshot.ref);
                return downloadURL;

            } catch (storageError) {
                console.warn('⚠️ Errore Firebase Storage per avatar, uso fallback locale:', storageError.message);
                return convertToBase64(file, progressCallback);
            }
        } else {
            return convertToBase64(file, progressCallback);
        }
    } catch (error) {
        console.error('Errore upload avatar:', error);
        return convertToBase64(file, progressCallback);
    }
}

function updateAvatarUploadProgress(progress) {
    const progressContainer = document.getElementById('avatar-upload-progress');
    const progressPercent = Math.round(progress);

    progressContainer.innerHTML = `
        <div style="background: rgba(45, 130, 181, 0.2); border-radius: 10px; padding: 10px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span style="font-size: 12px; color: #3498db; font-weight: 600;">Caricamento avatar...</span>
                <span style="font-size: 12px; color: #3498db; font-weight: 600;">${progressPercent}%</span>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 5px; height: 6px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #3498db, #2ecc71); height: 100%; width: ${progressPercent}%; transition: width 0.3s ease; border-radius: 5px;"></div>
            </div>
        </div>
    `;
}

async function updateUserAvatar(avatarUrl) {
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const userRef = ref(window.firebaseDatabase, `users/${currentUser.uid}/avatarUrl`);
        await set(userRef, avatarUrl);
    } else {
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        for (const email in users) {
            if (users[email].uid === currentUser.uid) {
                users[email].avatarUrl = avatarUrl;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                if (currentUserData) {
                    currentUserData.avatarUrl = avatarUrl;
                }
                break;
            }
        }
    }
    
    updateUserAvatarInCache(currentUser.uid, avatarUrl);
}

function updateUserAvatarDisplay(avatarUrl) {
    const avatarContainer = document.getElementById('userAvatar');
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarDefault = document.getElementById('userAvatarDefault');

    if (avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'block';
        avatarImg.style.position = 'absolute';
        avatarImg.style.top = '0';
        avatarImg.style.left = '0';
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.style.zIndex = '2';
        
        avatarDefault.style.display = 'none';
        avatarDefault.style.visibility = 'hidden';
        avatarDefault.style.opacity = '0';
    } else {
        avatarImg.style.display = 'none';
        avatarImg.style.visibility = 'hidden';
        avatarImg.src = '';
        
        avatarDefault.style.display = 'flex';
        avatarDefault.style.visibility = 'visible';
        avatarDefault.style.opacity = '1';
    }

    if (currentUserData) {
        currentUserData.avatarUrl = avatarUrl;
    }
}

// Utility functions
function createAvatarHTML(user, size = 'small') {
    const sizeClass = size === 'large' ? 'user-avatar' :
        size === 'medium' ? 'message-avatar' : 'comment-avatar';

    const hasAvatar = user.avatarUrl && user.avatarUrl.trim() !== '';
    
    if (hasAvatar) {
        return `
            <div class="${sizeClass}">
                <img src="${user.avatarUrl}" 
                     alt="Avatar ${user.username}"
                     class="avatar-image"
                     onclick="event.stopPropagation(); return false;"
                     onerror="this.style.display='none'; this.parentNode.innerHTML='${user.username ? user.username.charAt(0).toUpperCase() : '👤'}';">
            </div>
        `;
    } else {
        const initial = user.username ? user.username.charAt(0).toUpperCase() : '👤';
        return `<div class="${sizeClass}">${initial}</div>`;
    }
}

function createClanBadgeHTML(clan) {
    if (!clan || clan === 'Nessuno') {
        return '<span class="user-clan-badge no-clan">Nessun Clan</span>';
    }
    return `<span class="user-clan-badge">🏰 ${clan}</span>`;
}

function formatTime(timestamp) {
    if (!timestamp) return 'ora';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'ora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)} giorni fa`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function processContent(content, enableAutoFormat = true) {
    if (!content || typeof content !== 'string') return '';
    
    if (content.includes('<') && content.includes('>')) {
        return sanitizeHtml(content);
    }
    
    if (enableAutoFormat) {
        return autoFormatText(content);
    }
    
    return escapeHtml(content);
}

function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    const allowedTags = {
        'b': [], 'strong': [], 'i': [], 'em': [], 'u': [], 'br': [], 'p': [], 'div': [],
        'span': ['class'], 'h1': [], 'h2': [], 'h3': [], 'h4': [], 'h5': [], 'h6': [],
        'ul': [], 'ol': [], 'li': [], 'blockquote': [], 'code': [], 'pre': [],
        'a': ['href', 'title', 'target'], 'img': ['src', 'alt', 'title', 'width', 'height'],
        'table': [], 'tr': [], 'td': [], 'th': [], 'thead': [], 'tbody': []
    };
    
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/on\w+\s*=\s*[^>]*/gi, '');
    html = html.replace(/javascript:/gi, '');
    
    function processTag(match, isClosing, tagName, attributes) {
        tagName = tagName.toLowerCase();
        
        if (!allowedTags[tagName]) {
            return '';
        }
        
        if (isClosing) {
            return `</${tagName}>`;
        }
        
        const allowedAttrs = allowedTags[tagName];
        let processedAttrs = '';
        
        if (attributes && allowedAttrs.length > 0) {
            const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
            let attrMatch;
            
            while ((attrMatch = attrRegex.exec(attributes)) !== null) {
                const attrName = attrMatch[1].toLowerCase();
                const attrValue = attrMatch[2];
                
                if (allowedAttrs.includes(attrName)) {
                    let sanitizedValue = attrValue
                        .replace(/javascript:/gi, '')
                        .replace(/on\w+/gi, '')
                        .replace(/[<>]/g, '');
                    
                    processedAttrs += ` ${attrName}="${sanitizedValue}"`;
                }
            }
        }
        
        if (['br', 'img'].includes(tagName)) {
            return `<${tagName}${processedAttrs} />`;
        }
        
        return `<${tagName}${processedAttrs}>`;
    }
    
    const tagRegex = /<(\/?)([\w-]+)([^>]*)>/g;
    html = html.replace(tagRegex, (match, isClosing, tagName, attributes) => {
        return processTag(match, isClosing, tagName, attributes);
    });
    
    return html;
}

function autoFormatText(text) {
    if (!text || typeof text !== 'string') return '';
    
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/__(.*?)__/g, '<u>$1</u>');
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return text;
}

function updateMessageCounter(count) {
    messageCount = count;
    document.getElementById('messageCounter').textContent = `💬 ${count} messaggi`;
}

function cleanupListeners() {

// SOSTITUIRE TUTTO IL CONTENUTO CON:
    // Cleanup Activity Tracker subscriptions
    if (window.activityTracker && window.activityTracker.stopTracking) {
        window.activityTracker.stopTracking();
    }
    
    // Cleanup notifications subscription
    if (window.notificationsSubscription) {
        try {
            window.notificationsSubscription.unsubscribe();
            window.notificationsSubscription = null;
            console.log('✅ Subscription notifiche chiusa');
        } catch (error) {
            console.warn('⚠️ Errore chiusura subscription notifiche:', error);
        }
    }

    // Cleanup Firebase listeners (legacy)
    if (!window.useFirebase || !window.firebaseDatabase || !window.getFirebaseReady() || !ref || !off) return;

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

// Event listeners
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            if (section) switchSection(section);
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

    document.addEventListener('click', function (event) {
        if (!event.target.closest('.emoticon-picker')) {
            document.querySelectorAll('.emoticon-panel').forEach(panel => {
                panel.classList.remove('show');
            });
        }
    });

    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('avatar-image') || 
            event.target.closest('.user-avatar, .message-avatar, .comment-avatar')) {
            event.stopPropagation();
            event.preventDefault();
            return false;
        }
    }, true);
}

// Admin functions (stub implementations)
async function loadUsersManagement() {
    const threadList = document.getElementById('thread-list');
    threadList.innerHTML = `
        <div class="admin-panel">
            <h3>👥 Gestione Utenti</h3>
            <p>Funzionalità di gestione utenti disponibile solo in modalità locale per questa demo.</p>
        </div>
    `;
}

async function loadClansManagement() {
    const threadList = document.getElementById('thread-list');
    threadList.innerHTML = `
        <div class="admin-panel">
            <h3>🏰 Gestione Clan</h3>
            <p>Funzionalità di gestione clan disponibile solo in modalità locale per questa demo.</p>
        </div>
    `;
}

async function loadPendingThreads() {
    const moderationContent = document.getElementById('moderation-content');
    moderationContent.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
            ✅ Nessun contenuto in attesa di approvazione
        </div>
    `;
}

async function approveThread(threadId, section) {
    if (supabase) {
        try {
            const { error } = await supabase
                .from('threads')
                .update({ 
                    status: 'approved',
                    moderated_at: new Date().toISOString(),
                    moderated_by: currentUser.displayName || 'Moderatore'
                })
                .eq('id', threadId);

            if (error) throw error;
            
            alert('Thread approvato con successo!');
            loadPendingThreads();
        } catch (error) {
            console.error('Errore approvazione thread:', error);
            alert('Errore nell\'approvazione del thread');
        }
    }
}

async function rejectThread(threadId, section) {
    const reason = prompt('Motivo del rifiuto (opzionale):');
    
    if (supabase) {
        try {
            const updateData = {
                status: 'rejected',
                moderated_at: new Date().toISOString(),
                moderated_by: currentUser.displayName || 'Moderatore'
            };

            if (reason) {
                updateData.rejection_reason = reason;
            }

            const { error } = await supabase
                .from('threads')
                .update(updateData)
                .eq('id', threadId);

            if (error) throw error;
            
            alert('Thread rifiutato');
            loadPendingThreads();
        } catch (error) {
            console.error('Errore rifiuto thread:', error);
            alert('Errore nel rifiuto del thread');
        }
    }
}

// Stub functions for admin features
function assignClan(userId, username) {
    alert('Funzione disponibile solo in modalità locale per questa demo');
}

function changeUserRole(userId, username, currentRole) {
    alert('Funzione disponibile solo in modalità locale per questa demo');
}

function removFromClan(userId, username) {
    alert('Funzione disponibile solo in modalità locale per questa demo');
}

function createNewClan() {
    alert('Funzione disponibile solo in modalità locale per questa demo');
}

function deleteClan(clanName) {
    alert('Funzione disponibile solo in modalità locale per questa demo');
}

// Welcome system
async function handleNewUserComplete(newUser, isFirstUser = false) {
    try {
        setTimeout(async () => {
            try {
                await notifyNewUserRegistration(newUser, isFirstUser);
                await sendWelcomeMessage(newUser, isFirstUser);
            } catch (error) {
                console.error('Errore nel processo di benvenuto:', error);
            }
        }, 1000);
    } catch (error) {
        console.error('Errore gestione benvenuto:', error);
    }
}

async function notifyNewUserRegistration(newUser, isFirstUser = false) {
    // Implementazione notifiche per nuovi utenti
}

async function sendWelcomeMessage(newUser, isFirstUser = false) {
    try {
        const welcomeMessages = [
            `🎉 Benvenuto @${newUser.username}! Siamo felici di averti nella community di Hustle Castle Council!`,
            `👋 Un caloroso benvenuto a @${newUser.username}! Preparati per epiche battaglie e strategie!`,
            `🏰 @${newUser.username} si è unito al consiglio! Benvenuto nella famiglia!`,
            `⚔️ Un nuovo guerriero si è unito a noi: @${newUser.username}! Benvenuto!`,
            `🛡️ @${newUser.username} ha attraversato le porte del castello! Benvenuto nella community!`
        ];
        
        let welcomeText;
        if (isFirstUser) {
            welcomeText = `🎊 @${newUser.username} è il PRIMO utente registrato e ha ottenuto i privilegi di SUPERUSER! Un benvenuto speciale al nostro fondatore! 👑`;
        } else {
            welcomeText = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        }
        
        if (newUser.clan && newUser.clan !== 'Nessuno') {
            welcomeText += `\n🏰 Clan: ${newUser.clan}`;
        }
        
        const systemMessage = {
            author: '🤖 Sistema',
            authorId: 'system_bot',
            message: welcomeText,
            timestamp: Date.now(),
            isSystemMessage: true
        };
        
        const dataPath = getDataPath('chat-generale', 'messages');
        if (!dataPath) return;
        
        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push) {
            const messagesRef = ref(window.firebaseDatabase, dataPath);
            await push(messagesRef, systemMessage);
        } else {
            const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
            const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
            systemMessage.id = 'welcome_' + Date.now();
            messages.push(systemMessage);
            localStorage.setItem(storageKey, JSON.stringify(messages));
        }
        
    } catch (error) {
        console.error('Errore invio messaggio di benvenuto:', error);
    }
}

// Dashboard fallback
function loadDashboard() {
    const threadList = document.getElementById('thread-list');
    if (!threadList) return;

    threadList.innerHTML = `
        <div class="dashboard-container">
            <div class="welcome-section">
                <h2>🏰 Benvenuto in Hustle Castle Council</h2>
                <p>Il tuo centro di comando per strategie, clan e conquiste!</p>
            </div>
            
            <div class="dashboard-stats">
                <div class="stat-card">
                    <h3>👤 Profilo</h3>
                    <p>Utente: <strong>${getCurrentUsername()}</strong></p>
                    <p>Clan: <strong>${getCurrentUserClan()}</strong></p>
                    <p>Ruolo: <strong>${getRoleDisplayName()}</strong></p>
                </div>
                
                <div class="stat-card">
                    <h3>🔥 Stato</h3>
                    <p>Connessione: <strong>${isConnected ? '🟢 Online' : '🔴 Offline'}</strong></p>
                    <p>Modalità: <strong>${window.useFirebase ? '🔥 Firebase + 🗄️ Supabase' : '🏠 Locale'}</strong></p>
                </div>
                
                <div class="stat-card">
                    <h3>🚀 Azioni Rapide</h3>
                    <button onclick="switchSection('eventi')" class="quick-btn">📅 Eventi</button>
                    <button onclick="switchSection('chat-generale')" class="quick-btn">💬 Chat</button>
                    <button onclick="switchSection('oggetti')" class="quick-btn">⚔️ Oggetti</button>
                </div>
            </div>
        </div>
    `;
}

function getCurrentUsername() {
    const usernameEl = document.getElementById('currentUsername');
    return usernameEl ? usernameEl.textContent : 'Ospite';
}

function getRoleDisplayName() {
    const role = getCurrentUserRole();
    switch (role) {
        case USER_ROLES.SUPERUSER: return 'Super Admin';
        case USER_ROLES.CLAN_MOD: return 'Clan Moderator';
        default: return 'Utente';
    }
}

// Esporta globalmente
window.loadDashboard = loadDashboard;


async function syncUserWithSupabase(firebaseUser, userData = null) {
    if (!supabase || !firebaseUser) return;

    try {
        console.log('🔄 Sincronizzazione utente con Supabase...');

        // 1. Controllare se l'utente esiste già in Supabase
        const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('uid', firebaseUser.uid)
            .single();

        if (selectError && selectError.code !== 'PGRST116') {
            console.error('Errore controllo utente esistente:', selectError);
            return;
        }

        // 2. Preparare i dati utente
        const userSupabaseData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: userData?.username || firebaseUser.displayName || 'Utente',
            clan: userData?.clan || 'Nessuno',
            role: userData?.role || 'user',
            avatar_url: userData?.avatarUrl || null,
            updated_at: new Date().toISOString()
        };

        // 3. Inserire o aggiornare l'utente
        if (existingUser) {
            // Aggiornare utente esistente
            const { error: updateError } = await supabase
                .from('users')
                .update(userSupabaseData)
                .eq('uid', firebaseUser.uid);

            if (updateError) {
                console.error('Errore aggiornamento utente Supabase:', updateError);
            } else {
                console.log('✅ Utente aggiornato in Supabase');
            }
        } else {
            // Inserire nuovo utente
            userSupabaseData.created_at = new Date().toISOString();
            
            const { error: insertError } = await supabase
                .from('users')
                .insert([userSupabaseData]);

            if (insertError) {
                console.error('Errore inserimento utente Supabase:', insertError);
            } else {
                console.log('✅ Nuovo utente creato in Supabase');
            }
        }

        // 4. Autenticare anche in Supabase (sessione fittizia)
        // Questo è un workaround per far funzionare le RLS
        await createSupabaseSession(firebaseUser);

    } catch (error) {
        console.error('Errore sincronizzazione Supabase:', error);
    }
}

/**
 * Crea una sessione fittizia in Supabase per le RLS
 * NOTA: Questo è un workaround temporaneo
 */
async function createSupabaseSession(firebaseUser) {
    try {
        // Opzione A: Se hai configurato Supabase Auth
        // const { error } = await supabase.auth.signInAnonymously();
        
        // Opzione B: Usare una custom function per settare il context
        // await supabase.rpc('set_current_user_context', { user_uid: firebaseUser.uid });
        
        console.log('⚠️ Sessione Supabase: usando Firebase Auth come principale');
    } catch (error) {
        console.error('Errore creazione sessione Supabase:', error);
    }
}