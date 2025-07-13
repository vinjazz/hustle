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

if (typeof allUsers === 'undefined') {
    window.allUsers = [];
}
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

    // CORREZIONE: Carica lista utenti in modo sicuro e asincrono
    setTimeout(async () => {
        try {
            if (typeof loadUsersList === 'function') {
                await loadUsersList();
                console.log('👥 Lista utenti caricata per autocomplete');
            } else {
                console.warn('⚠️ loadUsersList non ancora definita, caricamento ritardato');
                // Ritenta dopo 2 secondi
                setTimeout(async () => {
                    try {
                        if (typeof loadUsersList === 'function') {
                            await loadUsersList();
                            console.log('👥 Lista utenti caricata (secondo tentativo)');
                        } else {
                            console.error('❌ loadUsersList non disponibile');
                            // Fallback: inizializza array vuoto
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
            // Fallback: assicurati che allUsers esista
            window.allUsers = window.allUsers || [];
        }
    }, 500); // Delay di 500ms per permettere il caricamento completo

    // Setup click outside per chiudere pannelli
    document.addEventListener('click', handleClickOutside);

    console.log('✅ Sistema notifiche inizializzato');
}

function detectMentions(text) {
    // CORREZIONE: Verifica che allUsers sia definito
    if (!Array.isArray(allUsers)) {
        console.warn('⚠️ allUsers non definito per detectMentions');
        return [];
    }

    // Regex per trovare @username
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        const username = match[1];
        // Verifica che l'utente esista
        const user = allUsers.find(u => u && u.username && u.username.toLowerCase() === username.toLowerCase());
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

function highlightMentions(html, currentUserId = null) {
    if (!html || typeof html !== 'string') return '';
    
    // CORREZIONE: Verifica che allUsers sia definito
    if (!Array.isArray(allUsers)) {
        console.warn('⚠️ allUsers non definito per highlightMentions');
        return html; // Restituisci HTML originale senza highlighting
    }
    
    // Regex per trovare @username, ma non all'interno di tag HTML
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
// ==============================================
// AUTOCOMPLETE MENZIONI
// ==============================================
function setupMentionListeners() {
    console.log('🎯 Setup listeners per menzioni...');
    
    try {
        // Chat input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('input', handleMentionInput);
            messageInput.addEventListener('keydown', handleMentionKeydown);
            console.log('✅ Listener chat input configurati');
        }

        // Comment textarea
        const commentTextarea = document.getElementById('comment-text');
        if (commentTextarea) {
            commentTextarea.addEventListener('input', handleMentionInput);
            commentTextarea.addEventListener('keydown', handleMentionKeydown);
            console.log('✅ Listener comment textarea configurati');
        }

        // Thread content textarea
        const threadTextarea = document.getElementById('thread-content-input');
        if (threadTextarea) {
            threadTextarea.addEventListener('input', handleMentionInput);
            threadTextarea.addEventListener('keydown', handleMentionKeydown);
            console.log('✅ Listener thread textarea configurati');
        }
        
        console.log('✅ Setup mention listeners completato');
    } catch (error) {
        console.error('❌ Errore setup mention listeners:', error);
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

    // CORREZIONE: Verifica che allUsers sia definito
    if (!Array.isArray(allUsers)) {
        console.warn('⚠️ allUsers non definito, inizializzando array vuoto');
        window.allUsers = [];
    }

    // Filtra utenti in base alla query
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

    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue) {
        console.log('✅ Firebase attivo, in ascolto su notifications/' + currentUser.uid);
      
        
        
        
        // ✅ FALLBACK: USA onValue SEMPLICE
        console.log('📊 Usando onValue semplice per notifiche (fallback)');
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

            // Ordina e limita manualmente
            notifications.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            notificationsData = notifications.slice(0, 20); // Limit manuale

            console.log('📥 Notifiche caricate con fallback:', notificationsData.length);
            updateNotificationsUI();
        });
        
    } else {
        console.log('⚠️ Firebase non attivo, fallback su localStorage');
        // Fallback localStorage
        const storageKey = `hc_notifications_${currentUser.uid}`;
        const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
        notificationsData = notifications.slice(0, 20);
        updateNotificationsUI();
    }
}

// 6. CLEANUP MIGLIORATO - Aggiungi a script.js
function forceCleanupAllListeners() {
    console.log('🧹 Pulizia forzata di tutti i listeners Firebase');
    
    // Pulisci listeners messaggi
    Object.keys(messageListeners).forEach(section => {
        const listener = messageListeners[section];
        if (listener && listener.path && listener.callback) {
            try {
                const messagesRef = ref(window.firebaseDatabase, listener.path);
                off(messagesRef, listener.callback);
                console.log(`✅ Listener messaggi ${section} pulito`);
            } catch (error) {
                console.warn(`⚠️ Errore pulizia listener ${section}:`, error);
            }
        }
    });
    messageListeners = {};

    // Pulisci listeners thread
    Object.keys(threadListeners).forEach(section => {
        const listener = threadListeners[section];
        if (listener && listener.path && listener.callback) {
            try {
                const threadsRef = ref(window.firebaseDatabase, listener.path);
                off(threadsRef, listener.callback);
                console.log(`✅ Listener thread ${section} pulito`);
            } catch (error) {
                console.warn(`⚠️ Errore pulizia listener ${section}:`, error);
            }
        }
    });
    threadListeners = {};

    console.log('✅ Cleanup completato - consumo dati ridotto');
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

    // Salva azioni per riferimento
    toast._actions = options.actions || [];

    return toast;
}

function showToast(toastElement) {
    const container = document.getElementById('toastContainer');
    container.appendChild(toastElement);

    // Trigger animation
    setTimeout(() => {
        toastElement.classList.add('show');
    }, 100);

    // Auto dismiss dopo durata specificata
    const duration = 5000; // Default 5 secondi
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

// ==============================================
// CARICAMENTO UTENTI PER AUTOCOMPLETE
// ==============================================

// Carica lista utenti per autocomplete con avatar
let usersCache = null;
let usersCacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minuti

async function buildUsersListFromAccessibleData() {
    const users = new Map(); // Usa Map per evitare duplicati
    const sectionsToCheck = ['chat-generale'];
    
    // Aggiungi sempre l'utente corrente
    if (currentUser && currentUserData) {
        users.set(currentUser.uid, {
            uid: currentUser.uid,
            username: currentUserData.username || currentUser.displayName || currentUser.email,
            clan: currentUserData.clan || 'Nessuno',
            avatarUrl: currentUserData.avatarUrl || null,
            email: currentUser.email
        });
    }
    
    // Aggiungi sezioni clan se l'utente appartiene a un clan
    const userClan = getCurrentUserClan();
    if (userClan !== 'Nessuno') {
        sectionsToCheck.push('clan-chat');
    }
    
    // Estrai utenti dai messaggi recenti
    for (const section of sectionsToCheck) {
        try {
            const messages = await getRecentMessagesForUserList(section);
            
            messages.forEach(msg => {
                if (msg.authorId && msg.author && !users.has(msg.authorId)) {
                    // Crea utente con dati disponibili
                    users.set(msg.authorId, {
                        uid: msg.authorId,
                        username: msg.author,
                        clan: extractClanFromMessage(msg) || 'Nessuno',
                        avatarUrl: null, // Non disponibile da messaggi
                        email: null // Non disponibile da messaggi
                    });
                }
            });
            
        } catch (error) {
            console.warn(`Errore estrazione utenti da ${section}:`, error);
        }
    }
    
    // Estrai utenti dai thread recenti (autori)
    try {
        const threads = await getRecentThreadsForUserList();
        threads.forEach(thread => {
            if (thread.authorId && thread.author && !users.has(thread.authorId)) {
                users.set(thread.authorId, {
                    uid: thread.authorId,
                    username: thread.author,
                    clan: 'Nessuno', // Non disponibile da thread
                    avatarUrl: null,
                    email: null
                });
            }
        });
    } catch (error) {
        console.warn('Errore estrazione utenti da thread:', error);
    }
    
    // Aggiungi alcuni utenti di esempio se la lista è troppo vuota
    if (users.size < 3) {
        addExampleUsers(users);
    }
    
    return Array.from(users.values());
}

window.loadUsersList = async function() {
    try {
        console.log('👥 Caricamento lista utenti...');
        allUsers = await buildUsersListFromAccessibleData();
        console.log(`✅ Lista utenti caricata: ${allUsers.length} utenti`);
        return allUsers;
    } catch (error) {
        console.error('❌ Errore caricamento lista utenti:', error);
        allUsers = [];
        return [];
    }
};

// NUOVA FUNZIONE: Carica tutti gli utenti per admin (accesso diretto)
async function loadAllUsersForAdmin() {
    console.log('👑 Admin: caricamento di tutti gli utenti...');
    
    if (!window.useFirebase || !window.firebaseDatabase || !firebaseReady) {
        console.log('📱 Modalità locale: carico da localStorage');
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        return Object.values(users);
    }

    try {
        // Accesso diretto al nodo users per superuser
        const usersRef = ref(window.firebaseDatabase, 'users');
        const snapshot = await get(usersRef);
        
        if (!snapshot.exists()) {
            console.log('📭 Nessun utente trovato nel database');
            return [];
        }

        const users = [];
        snapshot.forEach((childSnapshot) => {
            users.push({
                id: childSnapshot.key,
                uid: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        console.log(`👑 Admin: caricati ${users.length} utenti completi`);
        return users;

    } catch (error) {
        console.error('❌ Errore accesso admin agli utenti:', error);
        console.log('🔄 Fallback: uso metodo standard');
        
        // Fallback: usa il metodo standard
        return await loadUsersList();
    }
}

// CORREGGI loadUsersGrid per gestire meglio gli errori
async function loadUsersGrid() {
    const usersGrid = document.getElementById('users-grid');

    if (!usersGrid) {
        console.error('❌ Elemento users-grid non trovato');
        return;
    }

    // Mostra caricamento
    usersGrid.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div>🔄 Caricamento utenti...</div>
        </div>
    `;

    try {
        let users = [];

        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            // CORREZIONE: Accesso diverso per superuser vs utenti normali
            if (getCurrentUserRole() === USER_ROLES.SUPERUSER) {
                console.log('👑 Superuser: accesso completo agli utenti');
                users = await loadAllUsersForAdmin();
            } else {
                console.log('👤 Utente normale: usa lista utenti limitata');
                users = await loadUsersList();
                users = users.filter(user => user.email); // Solo utenti con email
            }
            
            // Messaggio informativo per non-superuser
            if (users.length < 5 && getCurrentUserRole() !== USER_ROLES.SUPERUSER) {
                usersGrid.innerHTML = `
                    <div style="text-align: center; padding: 20px; background: rgba(255, 193, 7, 0.1); border-radius: 8px; margin: 10px 0;">
                        <div style="color: #856404; margin-bottom: 10px;">⚠️ Lista utenti limitata</div>
                        <div style="font-size: 14px; color: #856404;">
                            Solo i superuser possono vedere tutti gli utenti.<br>
                            Questa lista mostra utenti attivi recentemente.
                        </div>
                    </div>
                    <div style="margin-top: 20px;"></div>
                `;
            }
        } else {
            // Modalità locale
            console.log('📱 Modalità locale attiva');
            const localUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            users = Object.values(localUsers);
        }

        // Mostra gli utenti se ce ne sono
        if (users.length > 0) {
            // Se c'era già un messaggio, aggiungilo alla fine
            const existingContent = usersGrid.innerHTML;
            if (existingContent.includes('Lista utenti limitata')) {
                // Mantieni il messaggio e aggiungi la lista sotto
            } else {
                usersGrid.innerHTML = ''; // Pulisci solo se non c'è messaggio
            }
            
            displayUsersList(users);
        } else {
            // Nessun utente trovato
            usersGrid.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <div style="margin-bottom: 10px;">👥 Nessun utente trovato</div>
                    <div style="font-size: 14px;">
                        ${getCurrentUserRole() === USER_ROLES.SUPERUSER 
                            ? 'Il database sembra vuoto.'
                            : 'Prova a tornare più tardi quando altri utenti saranno attivi.'
                        }
                    </div>
                </div>
            `;
        }

    } catch (error) {
        console.error('❌ Errore caricamento utenti admin:', error);
        
        usersGrid.innerHTML = `
            <div style="text-align: center; color: red; padding: 20px;">
                <div style="margin-bottom: 10px;">❌ Errore nel caricamento degli utenti</div>
                <div style="font-size: 14px; margin-bottom: 15px;">
                    ${error.message || 'Errore sconosciuto'}
                </div>
                <button onclick="loadUsersGrid()" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Riprova
                </button>
            </div>
        `;
    }
}

// MIGLIORA displayUsersList per gestire il caso di lista limitata
function displayUsersList(users) {
    const usersGrid = document.getElementById('users-grid');
    
    if (!users || users.length === 0) {
        // Non sovrascrivere se c'è già un messaggio di errore
        if (!usersGrid.innerHTML.includes('Lista utenti limitata')) {
            usersGrid.innerHTML = '<div style="text-align: center; padding: 20px;">Nessun utente trovato</div>';
        }
        return;
    }

    // Genera HTML per gli utenti
    const usersHtml = users.map(user => {
        const roleText = user.role === 'superuser' ? 'SUPER' :
            user.role === 'clan_mod' ? 'CLAN MOD' : 'USER';
        const roleClass = user.role === 'superuser' ? 'role-superuser' :
            user.role === 'clan_mod' ? 'role-moderator' : 'role-user';

        return `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-card-name">
                        ${user.username || 'Utente'} 
                        <span class="user-role ${roleClass}">
                            ${roleText}
                        </span>
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ${formatTime(user.createdAt)}
                    </div>
                </div>
                <div class="user-card-info">
                    <div>📧 ${user.email || 'N/A'}</div>
                    <div>🏰 Clan: ${user.clan || 'Nessuno'}</div>
                    <div>🔗 Provider: ${user.provider || 'email'}</div>
                </div>
                <div class="user-card-actions">
                    <button class="admin-btn btn-assign-clan" onclick="assignClan('${user.id || user.uid}', '${user.username}')">
                        Assegna Clan
                    </button>
                    ${getCurrentUserRole() === USER_ROLES.SUPERUSER ? `
                        <button class="admin-btn btn-change-role" onclick="changeUserRole('${user.id || user.uid}', '${user.username}', '${user.role || 'user'}')">
                            Cambia Ruolo
                        </button>
                    ` : ''}
                    ${user.clan && user.clan !== 'Nessuno' ? `
                        <button class="admin-btn btn-remove-clan" onclick="removFromClan('${user.id || user.uid}', '${user.username}')">
                            Rimuovi Clan
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Se c'è già contenuto (messaggio di avviso), appendici la lista
    if (usersGrid.innerHTML.includes('Lista utenti limitata')) {
        usersGrid.innerHTML += usersHtml;
    } else {
        usersGrid.innerHTML = usersHtml;
    }

    console.log(`✅ Mostrati ${users.length} utenti nel pannello admin`);
}

// AGGIUNGI FUNZIONE DI DEBUG PER TESTARE
window.debugAdminUsers = function() {
    console.log('🔍 Debug Admin Users:');
    console.log('- Ruolo corrente:', getCurrentUserRole());
    console.log('- È superuser:', getCurrentUserRole() === USER_ROLES.SUPERUSER);
    console.log('- Firebase ready:', firebaseReady);
    console.log('- UseFirebase:', window.useFirebase);
    console.log('- Current user:', currentUser?.uid, currentUser?.email);
    
    if (typeof loadUsersList === 'function') {
        console.log('✅ loadUsersList è definita');
    } else {
        console.log('❌ loadUsersList NON è definita');
    }
    
    if (typeof loadAllUsersForAdmin === 'function') {
        console.log('✅ loadAllUsersForAdmin è definita');
    } else {
        console.log('❌ loadAllUsersForAdmin NON è definita');
    }
};

// ESEGUI SUBITO IL FIX
console.log('🔧 Fix loadUsersList applicato!');

// Test per verificare che tutto funzioni
if (typeof window.loadUsersList === 'function') {
    console.log('✅ loadUsersList ora è definita correttamente');
} else {
    console.error('❌ loadUsersList ancora non definita!');
}


// NUOVA FUNZIONE: Ottiene messaggi recenti per costruire lista utenti
async function getRecentMessagesForUserList(section) {
    const dataPath = getDataPath(section, 'messages');
    if (!dataPath) return [];
    
    try {
        const messagesRef = ref(window.firebaseDatabase, dataPath);
        const snapshot = await get(messagesRef);
        
        if (!snapshot.exists()) return [];
        
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push(childSnapshot.val());
        });
        
        // Ordina per timestamp e prendi solo gli ultimi 50
        messages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return messages.slice(0, 50);
        
    } catch (error) {
        console.warn(`Errore lettura messaggi ${section}:`, error);
        return [];
    }
}

// NUOVA FUNZIONE: Ottiene thread recenti per estrarre autori
async function getRecentThreadsForUserList() {
    const sections = ['eventi', 'oggetti', 'novita', 'salotto', 'segnalazioni'];
    const allThreads = [];
    
    for (const section of sections) {
        try {
            const dataPath = getDataPath(section, 'threads');
            if (!dataPath) continue;
            
            const threadsRef = ref(window.firebaseDatabase, dataPath);
            const snapshot = await get(threadsRef);
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const thread = childSnapshot.val();
                    if (thread.status !== 'rejected') { // Solo thread approvati/pending
                        allThreads.push(thread);
                    }
                });
            }
        } catch (error) {
            console.warn(`Errore lettura thread ${section}:`, error);
        }
    }
    
    // Ordina per data e prendi i più recenti
    allThreads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return allThreads.slice(0, 20);
}

// NUOVA FUNZIONE: Estrae clan da un messaggio (euristica)
function extractClanFromMessage(message) {
    // Cerca pattern comuni di clan nei messaggi
    // Questo è un fallback - i dati clan non sono disponibili nei messaggi
    return null;
}

// NUOVA FUNZIONE: Aggiunge utenti di esempio se la lista è vuota
function addExampleUsers(usersMap) {
    const exampleUsers = [
        {
            uid: 'example_admin',
            username: 'Admin',
            clan: 'Staff',
            avatarUrl: null,
            email: null
        },
        {
            uid: 'example_mod',
            username: 'Moderatore',
            clan: 'Staff',
            avatarUrl: null,
            email: null
        },
        {
            uid: 'example_player',
            username: 'Giocatore',
            clan: 'Guerrieri',
            avatarUrl: null,
            email: null
        }
    ];
    
    exampleUsers.forEach(user => {
        if (!usersMap.has(user.uid)) {
            usersMap.set(user.uid, user);
        }
    });
    
    console.log('👥 Aggiunti utenti di esempio alla lista');
}
// ==============================================


// Inizializza l'applicazione
function initializeApp() {
    console.log('🔥 Inizializzazione applicazione...');
    setTimeout(safeInitializeFirebaseQueries, 2000);
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
            deleteObject, query, orderByKey, orderByChild, limitToLast, limitToFirst
        } = window.firebaseImports);
        firebaseReady = true;
    }

    // Aggiorna status Firebase nella modal
    const statusEl = document.getElementById('firebase-status');
    const hintEl = document.getElementById('demo-hint');

    if (window.useFirebase && window.firebaseAuth && firebaseReady) {
        console.log('✅ Modalità Firebase attiva');
        statusEl.style.background = 'rgba(0, 255, 0, 0.1)';
        statusEl.style.color = '#008800';

        if (window.appCheckEnabled) {
            statusEl.textContent = '🔥 Sistema inizializzato correttamente';
        } else {
            statusEl.textContent = '🔥 Firebase attivo - App Check disabilitato (funzionalità ridotte)';
        }

        

        // Monitora stato autenticazione
        onAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
                currentUser = user;
                handleUserLogin(user);
            } else {
                currentUser = null;
                handleUserLogout();
            }
        });

        // Monitora connessione
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

        // Nascondi pulsante Google e reCAPTCHA in modalità demo
        document.getElementById('googleLoginBtn').style.display = 'none';
        document.getElementById('recaptcha-container').style.display = 'none';

        // Inizializza dati di esempio per la demo
        initializeLocalData();
        // In modalità locale, mostra sempre il login
        handleUserLogout();
        // Simula connessione locale
        isConnected = true;
        updateConnectionStatus();
    }

    // Setup UI
    setupEventListeners();
    initializeNotifications();
    switchSection('home');
}

// Gestione login utente
function handleUserLogin(user) {
    console.log('👤 Utente loggato:', user.email);

    // Nascondi modal login
    document.getElementById('loginModal').style.display = 'none';
	
	 const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.classList.add('user-logged-in');
    }

    // Aggiorna UI
    updateUserInterface();

    // Setup presenza utente
    setupUserPresence();

    // Carica dati utente
    loadUserProfile();
	
	initializeNotifications(); 

    // Carica lista utenti e notifiche dopo il login
    setTimeout(() => {
        setupAvatarUpload();
        if (currentUserData && currentUserData.avatarUrl) {
            updateUserAvatarDisplay(currentUserData.avatarUrl);
        }
    }, 100);

    // Aggiorna dashboard se è la sezione corrente
    if (currentSection === 'home') {
        setTimeout(() => {
            loadDashboard();
        }, 500); // Piccolo delay per permettere il caricamento dei dati utente
    }
};

// Gestione logout utente
function handleUserLogout() {
    console.log('👤 Utente disconnesso');
	// CORREZIONE: Nascondi campanella notifiche
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.classList.remove('user-logged-in');
    }

    // Pulisci listeners
    cleanupListeners();

    // Reset dati utente
    currentUserData = null;

    // Reset UI
    document.getElementById('currentUsername').textContent = 'Ospite';
    document.getElementById('currentClan').textContent = 'Nessuno';
    document.getElementById('sidebarClan').textContent = 'Nessuno';
    document.getElementById('userStatus').className = 'offline-indicator';
    document.getElementById('logoutBtn').style.display = 'none';

    // Rimuovi badge ruolo
    const userNameElement = document.getElementById('currentUsername');
    const existingBadge = userNameElement.querySelector('.user-role');
    if (existingBadge) {
        existingBadge.remove();
    }

    // Aggiorna accesso clan e admin
    updateClanSectionsAccess();
    updateAdminSectionsAccess();

    // Se si è in una sezione clan o admin, torna alla home
    if (currentSection.startsWith('clan-') || currentSection.startsWith('admin-')) {
        switchSection('home');
    }

    // Torna al forum se si è in vista thread
    if (document.getElementById('thread-view').style.display === 'flex') {
        backToForum();
    }

    // Mostra modal login
    document.getElementById('loginModal').style.display = 'flex';
}

// Carica profilo utente
// The main issue is in the loadUserProfile function and subsequent code
// Here's the corrected section that was causing the syntax error:

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
                
                // USA SEMPRE USERNAME dal database, mai displayName
                const displayUsername = currentUserData.username || 'Utente';
                
                document.getElementById('currentUsername').textContent = displayUsername;
                document.getElementById('currentClan').textContent = currentUserData.clan || 'Nessuno';
                document.getElementById('sidebarClan').textContent = currentUserData.clan || 'Nessuno';

                // Aggiorna badge ruolo
                updateUserRoleBadge();

                // Aggiorna dashboard se è la sezione corrente
                if (currentSection === 'home') {
                    loadDashboard();
                }
                
                console.log('✅ Profilo utente caricato:', displayUsername);
            } else {
                console.warn('⚠️ Dati utente non trovati nel database');
            }
        } catch (error) {
            console.error('Errore caricamento profilo:', error);
        }
    } else {
        // Modalità locale - carica da localStorage
        loadLocalUserProfile();
    }

    setupAvatarUpload();

    // Update avatar display
    if (currentUserData && currentUserData.avatarUrl) {
        updateUserAvatarDisplay(currentUserData.avatarUrl);
    }

    // Aggiorna accesso clan e admin in ogni caso
    updateClanSectionsAccess();
    updateAdminSectionsAccess();
}

// ✅ AGGIUNGI QUESTA FUNZIONE HELPER
function getUserDisplayName() {
    // Priorità: username dal database > displayName > email
    if (currentUserData && currentUserData.username) {
        return currentUserData.username;
    }
    
    if (currentUser && currentUser.displayName) {
        return currentUser.displayName;
    }
    
    if (currentUser && currentUser.email) {
        return currentUser.email.split('@')[0]; // usa parte prima della @
    }
    
    return 'Utente';
}

// Carica profilo locale
function loadLocalUserProfile() {
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
    const userData = users[currentUser.email];

    if (userData) {
        // Controlla se questo utente dovrebbe essere superuser
        const realUsers = Object.values(users).filter(user =>
                !user.uid.startsWith('super_admin_') &&
                !user.uid.startsWith('clan_mod_') &&
                !user.uid.startsWith('user_'));

        // Se è il primo utente reale e non ha ruolo superuser, assegnaglielo
        if (realUsers.length > 0 && realUsers[0].uid === userData.uid) {
            if (!userData.role || userData.role === USER_ROLES.USER) {
                userData.role = USER_ROLES.SUPERUSER;
                users[currentUser.email] = userData;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                console.log('🎉 Utente promosso a SUPERUSER:', currentUser.email);

                // Mostra notifica
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

        // Aggiorna dashboard se è la sezione corrente
        if (currentSection === 'home') {
            loadDashboard();
        }
    }
}

// Carica profilo locale
function loadLocalUserProfile() {
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
    const userData = users[currentUser.email];

    if (userData) {
        // Controlla se questo utente dovrebbe essere superuser
        const realUsers = Object.values(users).filter(user =>
                !user.uid.startsWith('super_admin_') &&
                !user.uid.startsWith('clan_mod_') &&
                !user.uid.startsWith('user_'));

        // Se è il primo utente reale e non ha ruolo superuser, assegnaglielo
        if (realUsers.length > 0 && realUsers[0].uid === userData.uid) {
            if (!userData.role || userData.role === USER_ROLES.USER) {
                userData.role = USER_ROLES.SUPERUSER;
                users[currentUser.email] = userData;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                console.log('🎉 Utente promosso a SUPERUSER:', currentUser.email);

                // Mostra notifica
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

        // Aggiorna dashboard se è la sezione corrente
        if (currentSection === 'home') {
            loadDashboard();
        }
    }
}

// Aggiorna badge ruolo utente
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

// Aggiorna accesso alle sezioni admin
function updateAdminSectionsAccess() {
    const adminSection = document.getElementById('adminSection');
    const clanModerationItem = document.getElementById('clanModerationItem');

    // Mostra sezioni admin globali solo al superuser
    const canAccessGlobalAdmin = getCurrentUserRole() === USER_ROLES.SUPERUSER;

    if (canAccessGlobalAdmin) {
        adminSection.style.display = 'block';
    } else {
        adminSection.style.display = 'none';
        // Se si è in una sezione admin, torna agli eventi
        if (currentSection.startsWith('admin-')) {
            switchSection('eventi');
        }
    }

    // Mostra moderazione clan se è moderatore o superuser del clan
    const canModerateClan = isClanModerator();

    if (canModerateClan) {
        clanModerationItem.style.display = 'block';
    } else {
        clanModerationItem.style.display = 'none';
        // Se si è nella sezione moderazione, torna alla chat clan
        if (currentSection === 'clan-moderation') {
            switchSection('clan-chat');
        }
    }
}

// Setup presenza utente
function setupUserPresence() {
    if (!currentUser || !window.useFirebase || !window.firebaseDatabase || !firebaseReady || !ref || !onDisconnect || !set || !child || !serverTimestamp)
        return;

    try {
        const userStatusRef = ref(window.firebaseDatabase, `presence/${currentUser.uid}`);
        const userRef = ref(window.firebaseDatabase, `users/${currentUser.uid}`);

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
}

// Aggiorna interfaccia utente
function updateUserInterface() {
    if (currentUser) {
        document.getElementById('userStatus').className = 'online-indicator';
        document.getElementById('logoutBtn').style.display = 'inline-block';
    }
    updateClanSectionsAccess();
}

// Aggiorna accesso alle sezioni clan
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

// Aggiorna stato connessione
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

// 🤖 GESTIONE INTERFACCIA LOGIN/REGISTRAZIONE CON reCAPTCHA
function switchToLogin() {
    isLoginMode = true;
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    document.getElementById('registrationFields').classList.remove('show');
    document.getElementById('submitBtn').textContent = 'Accedi';
    document.getElementById('googleBtnText').textContent = 'Continua con Google';

    // Pulisci campi opzionali
    document.getElementById('username').value = '';

    // Reset reCAPTCHA
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

    // Reset reCAPTCHA
    if (window.useFirebase && window.appCheckEnabled && typeof window.resetRecaptcha === 'function') {
        window.resetRecaptcha();
    }

    hideError();
}

// Gestione form submit
function handleSubmit() {
    if (isLoginMode) {
        handleLogin();
    } else {
        handleRegister();
    }
}
// Login con email e password
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Inserisci email e password');
        return;
    }

    // Verifica reCAPTCHA solo se App Check è attivo
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
            // Login Firebase
            await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        } else {
            // Login locale (demo)
            await simulateLogin(email, password);
        }

        showSuccess('Login effettuato con successo!');

        // Reset reCAPTCHA dopo successo (solo se attivo)
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } catch (error) {
        console.error('Errore login:', error);
        showError(getErrorMessage(error));

        // Reset reCAPTCHA in caso di errore (solo se attivo)
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } finally {
        showLoading(false);
    }
}
// Login con Google
// Login con Google
// ===============================================
// PATCH PER GOOGLE LOGIN - DA AGGIUNGERE A script.js
// ===============================================

// Login con Google - VERSIONE CORRETTA
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
        console.log('🔐 Iniziando login Google...');
        const result = await signInWithPopup(window.firebaseAuth, window.googleProvider);
        const user = result.user;

        console.log('👤 Utente Google loggato:', user.email);

        // Verifica se l'utente esiste già nel database
        const userRef = ref(window.firebaseDatabase, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            console.log('🆕 Nuovo utente Google, preparazione dati...');
            
            // NUOVO UTENTE - Determina ruolo
            const userRole = await determineUserRole();
            console.log('👤 Ruolo determinato:', userRole);
            
            // Salva dati temporanei
            await set(userRef, {
                username: '', // Vuoto temporaneamente
                email: user.email,
                clan: 'Nessuno',
                role: userRole,
                createdAt: Date.now(), // Usa timestamp locale per compatibilità
                lastSeen: Date.now(),
                provider: 'google',
                needsUsername: true
            });

            console.log('✅ Dati temporanei salvati');
            
            // Mostra modal per scegliere username con delay per assicurarsi che tutto sia caricato
            setTimeout(() => {
                if (window.usernameManager) {
                    window.usernameManager.showUsernameModal(user);
                } else {
                    console.error('❌ usernameManager non disponibile');
                    // Fallback: procedi senza username personalizzato
                    handleUserLogin(user);
                }
            }, 100);

        } else {
            // UTENTE ESISTENTE
            const userData = snapshot.val();
            console.log('👤 Utente esistente trovato:', userData);
            
            if (userData.needsUsername === true || !userData.username || userData.username.trim() === '') {
                console.log('⚠️ Utente senza username valido, mostrando modal...');
                
                setTimeout(() => {
                    if (window.usernameManager) {
                        window.usernameManager.showUsernameModal(user, userData);
                    } else {
                        console.error('❌ usernameManager non disponibile');
                        handleUserLogin(user);
                    }
                }, 100);
            } else {
                console.log('✅ Utente con username completo, login completato');
                showSuccess('Login con Google effettuato con successo!');
                // Il login continua automaticamente tramite onAuthStateChanged
            }
        }

    } catch (error) {
        console.error('❌ Errore login Google:', error);

        let errorMessage = 'Errore nel login con Google';
        
        // Gestione errori specifici
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
        // Ripristina pulsante
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

// Gestione login utente CORRETTA
function handleUserLogin(user) {
    console.log('👤 Gestione login per:', user.email);

    // Controlla se l'utente ha bisogno di scegliere username
    if (window.usernameManager) {
        window.usernameManager.checkUserNeedsUsername(user).then(needsUsername => {
            if (needsUsername) {
                console.log('⚠️ Utente ha bisogno di username, mostrando modal...');
                setTimeout(() => {
                    window.usernameManager.showUsernameModal(user);
                }, 500);
                return; // Non procedere con il login completo
            }
            
            // Procedi con login normale
            completeUserLogin(user);
        }).catch(error => {
            console.error('Errore controllo username:', error);
            completeUserLogin(user); // Procedi comunque
        });
    } else {
        completeUserLogin(user);
    }
}

// Completa il login utente
function completeUserLogin(user) {
    console.log('✅ Completando login per:', user.email);

    // Nascondi tutti i modal
    const loginModal = document.getElementById('loginModal');
    const usernameModal = document.getElementById('usernameModal');
    
    if (loginModal) loginModal.style.display = 'none';
    if (usernameModal) usernameModal.style.display = 'none';
    
    // Mostra campanella notifiche
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.classList.add('user-logged-in');
    }

    // Aggiorna UI
    updateUserInterface();

    // Setup presenza utente
    setupUserPresence();

    // Carica dati utente
    loadUserProfile();
    
    // Inizializza notifiche
    initializeNotifications(); 

    // Setup avatar e altri componenti
    setTimeout(() => {
        setupAvatarUpload();
        if (currentUserData && currentUserData.avatarUrl) {
            updateUserAvatarDisplay(currentUserData.avatarUrl);
        }
    }, 200);

    // Aggiorna dashboard se è la sezione corrente
    if (currentSection === 'home') {
        setTimeout(() => {
            loadDashboard();
        }, 500);
    }
}

// DEBUG: Funzione per testare il modal username
window.testUsernameModal = function() {
    if (window.usernameManager) {
        const mockUser = {
            uid: 'test_' + Date.now(),
            email: 'test@example.com',
            displayName: null
        };
        window.usernameManager.showUsernameModal(mockUser);
    } else {
        console.error('usernameManager non disponibile');
    }
};

// Assicurati che le funzioni siano globali
window.handleGoogleLogin = handleGoogleLogin;
window.handleUserLogin = handleUserLogin;
window.completeUserLogin = completeUserLogin;
// 🤖 GESTIONE AUTENTICAZIONE CON reCAPTCHA MIGLIORATA
function handleUserLogin(user) {
    console.log('👤 Utente loggato:', user.email);

    // Controlla se l'utente ha bisogno di scegliere username
    if (window.usernameManager) {
        window.usernameManager.checkUserNeedsUsername(user).then(needsUsername => {
            if (needsUsername) {
                console.log('⚠️ Utente ha bisogno di username, mostrando modal...');
                setTimeout(() => {
                    window.usernameManager.showUsernameModal(user);
                }, 1000);
                return; // Non procedere con il login completo
            }
            
            // Procedi con login normale
            completeUserLogin(user);
        }).catch(error => {
            console.error('Errore controllo username:', error);
            completeUserLogin(user); // Procedi comunque
        });
    } else {
        completeUserLogin(user);
    }
}

// ✅ AGGIUNGI QUESTA NUOVA FUNZIONE
function completeUserLogin(user) {
    console.log('✅ Completando login per:', user.email);

    // Nascondi modal login
    document.getElementById('loginModal').style.display = 'none';
    
    // Mostra campanella notifiche
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.classList.add('user-logged-in');
    }

    // Aggiorna UI
    updateUserInterface();

    // Setup presenza utente
    setupUserPresence();

    // Carica dati utente
    loadUserProfile();
    
    // Inizializza notifiche
    initializeNotifications(); 
    if (window.activityTracker) {
    setTimeout(() => {
        window.activityTracker.init();
    }, 1000);
}

    // Carica lista utenti e notifiche dopo il login
    setTimeout(() => {
        setupAvatarUpload();
        if (currentUserData && currentUserData.avatarUrl) {
            updateUserAvatarDisplay(currentUserData.avatarUrl);
        }
    }, 100);

    // Aggiorna dashboard se è la sezione corrente
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

    // Verifica reCAPTCHA solo se App Check è attivo
    if (window.useFirebase && window.appCheckEnabled && typeof grecaptcha !== 'undefined') {
        if (!window.verifyRecaptcha()) {
            showError('🤖 Completa la verifica reCAPTCHA');
            return;
        }
    }

    showLoading(true);
    hideError();

    try {
        // Determina il ruolo del nuovo utente
        const userRole = await determineUserRole();

        if (window.useFirebase && firebaseReady && createUserWithEmailAndPassword) {
            // Registrazione Firebase
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
            // Registrazione locale (demo)
            await simulateRegister(email, password, username, 'Nessuno', userRole);
        }

        const roleMessage = userRole === USER_ROLES.SUPERUSER ?
            '\n🎉 Sei il primo utente! Ti sono stati assegnati i privilegi di SUPERUSER.' : '';

        showSuccess(`Account creato con successo!${roleMessage}`);

        // Reset reCAPTCHA dopo successo (solo se attivo)
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } catch (error) {
        console.error('Errore registrazione:', error);
        showError(getErrorMessage(error));

        // Reset reCAPTCHA in caso di errore (solo se attivo)
        if (window.useFirebase && window.appCheckEnabled) {
            window.resetRecaptcha();
        }
    } finally {
        showLoading(false);
    }
}

// Determina il ruolo del nuovo utente
async function determineUserRole() {
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

// Simulazione autenticazione locale
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

                // Salva i dati utente correnti
                currentUserData = user;

                // Aggiorna UI con i dati del clan
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
                provider: 'email' // Aggiungi provider
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
    if (window.activityTracker) {
    await window.activityTracker.recordLogout();
    }
    try {
        if (window.useFirebase && window.firebaseAuth && firebaseReady && signOut) {
            await signOut(window.firebaseAuth);
        } else {
            // Logout locale
            currentUser = null;
            handleUserLogout();
        }
    } catch (error) {
        console.error('Errore logout:', error);
    }
    window.location.reload();
}

// Inizializza dati di esempio per modalità locale
function initializeLocalData() {
    // Crea utenti di esempio se non esistono
    const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');

    // Controlla se ci sono utenti reali
    const realUsers = Object.values(users).filter(user =>
            !user.uid.startsWith('super_admin_') &&
            !user.uid.startsWith('clan_mod_') &&
            !user.uid.startsWith('user_'));

    // Se c'è già un utente reale ma non ha ruolo superuser, assegnaglielo
    if (realUsers.length > 0) {
        const firstRealUser = realUsers[0];
        if (!firstRealUser.role || firstRealUser.role === USER_ROLES.USER) {
            firstRealUser.role = USER_ROLES.SUPERUSER;
            // Trova l'email corrispondente e aggiorna
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

    // Crea utenti di esempio solo se non ci sono utenti reali
    if (realUsers.length === 0) {
        // Superuser di default
        const defaultSuperUser = {
            uid: 'super_admin_001',
            username: 'SuperAdmin',
            email: 'admin@hustlecastle.com',
            password: 'admin123',
            clan: 'Nessuno',
            role: USER_ROLES.SUPERUSER,
            createdAt: Date.now()
        };

        // Moderatore clan di esempio
        const clanMod = {
            uid: 'clan_mod_001',
            username: 'ModeratoreDraghi',
            email: 'mod@draghi.com',
            password: 'mod123',
            clan: 'Draghi Rossi',
            role: USER_ROLES.CLAN_MOD,
            createdAt: Date.now()
        };

        // Utente normale di esempio
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

    // Aggiungi thread di esempio per sezioni generali se non esistono
    const sections = ['salotto', 'eventi', 'oggetti', 'novita', 'associa-clan', 'segnalazioni'];
    sections.forEach(section => {
        const threads = JSON.parse(localStorage.getItem(`hc_threads_${section}`) || '[]');
        if (threads.length === 0) {
            const exampleThreads = getExampleThreads(section);
            localStorage.setItem(`hc_threads_${section}`, JSON.stringify(exampleThreads));
        }
    });

    // Aggiungi messaggi di esempio per chat generale se non esistono
    const messages = JSON.parse(localStorage.getItem(`hc_messages_chat-generale`) || '[]');
    if (messages.length === 0) {
        const exampleMessages = getExampleMessages('chat-generale');
        localStorage.setItem(`hc_messages_chat-generale`, JSON.stringify(exampleMessages));
    }

    // Inizializza dati di esempio per clan specifici
    const exampleClans = ['Draghi Rossi', 'Leoni Neri', 'Aquile Bianche'];
    exampleClans.forEach(clan => {
        const safeClanName = clan.replace(/[.#$[\]]/g, '_');

        // Thread clan (alcuni pending per testare moderazione)
        const clanSections = ['clan-war', 'clan-premi', 'clan-consigli', 'clan-bacheca'];
        clanSections.forEach(section => {
            const storageKey = `hc_threads_clan_${safeClanName}_${section}`;
            const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (threads.length === 0) {
                const exampleThreads = getExampleClanThreads(section, clan);
                localStorage.setItem(storageKey, JSON.stringify(exampleThreads));
            }
        });

        // Messaggi clan chat
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
'oggetti': [{
                id: 'salotto_thread_1',
                title: 'Salotto',
                content: 'Un posto per chiacchierare del più e del meno, fuori dagli schemi del gioco.',
                author: 'Admin',
                createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
                replies: 5,
                views: 42,
                status: 'approved'
            }
        ],
        'segnalazioni': [{
                id: 'bug_report_1',
                title: '🐞 Bug - Non riesco a equipaggiare l\'armatura del drago',
                content: 'Quando provo a equipaggiare l\'armatura del drago, il gioco si blocca e devo riavviare. Succede solo con quel pezzo.',
                author: 'BugHunter',
                createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
                replies: 2,
                views: 18,
                status: 'approved'
            }
        ],
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

// 🤖 GESTIONE MESSAGGI ERRORE CON reCAPTCHA
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

// Utility UI
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

    // Controlla accesso alla sezione
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

    // Pulisci listeners precedenti
    cleanupListeners();
    cleanupCommentImageUpload();

    currentSection = sectionKey;
    if (window.activityTracker && currentUser) {
    window.markSectionAsVisited(sectionKey);
    }

    // Aggiorna header
    document.getElementById('section-title').textContent = section.title;
    document.getElementById('section-description').textContent = section.description;

    // Mostra contenuto appropriato
    const forumContent = document.getElementById('forum-content');
    const chatContent = document.getElementById('chat-content');
    const threadView = document.getElementById('thread-view');
    const newThreadBtn = document.getElementById('new-thread-btn');

    // Nascondi tutto inizialmente
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

    // Chiudi menu mobile se aperto
    closeMobileMenu();

    // Aggiorna navigazione
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const targetNav = document.querySelector(`[data-section="${sectionKey}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }
}

// Funzioni per gestione mobile
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


// Carica contenuto amministrativo
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

// Carica contenuto moderazione clan
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

// Carica thread in attesa di approvazione
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
                    ${pendingThreads.map(thread => `
                        <div class="thread-item thread-pending" style="margin-bottom: 15px;">
                            <div class="thread-main">
                                <div class="thread-title">
                                    ${thread.title}
                                    <span class="pending-indicator">PENDING</span>
                                </div>
                                <div class="thread-author">
                                    da ${thread.author} • ${formatTime(thread.createdAt)}
                                </div>
                                <div class="moderation-actions">
                                    <button class="approve-btn" onclick="approveThread('${thread.id}', '${thread.section}')">
                                        ✅ Approva
                                    </button>
                                    <button class="reject-btn" onclick="rejectThread('${thread.id}', '${thread.section}')">
                                        ❌ Rifiuta
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
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

// Ottieni thread in attesa per un clan
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
                // Modalità locale
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

    // Ordina per data (più recenti prima)
    return pendingThreads.sort((a, b) => b.createdAt - a.createdAt);
}

// Approva thread
async function approveThread(threadId, section) {
    try {
        await updateThreadStatus(threadId, section, 'approved');
        alert('Thread approvato con successo!');
        loadPendingThreads(); // Ricarica lista
    } catch (error) {
        console.error('Errore approvazione thread:', error);
        alert('Errore nell\'approvazione del thread');
    }
}

// Rifiuta thread
async function rejectThread(threadId, section) {
    const reason = prompt('Motivo del rifiuto (opzionale):');

    try {
        await updateThreadStatus(threadId, section, 'rejected', reason);
        alert('Thread rifiutato');
        loadPendingThreads(); // Ricarica lista
    } catch (error) {
        console.error('Errore rifiuto thread:', error);
        alert('Errore nel rifiuto del thread');
    }
}

// Aggiorna status thread
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
        // leggi i dati esistenti del thread
        const threadRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);
        const snapshot = await get(threadRef);
        if (snapshot.exists()) {
            const existingData = snapshot.val();
            // mantieni tutti i campi, aggiungendo/modificando solo quelli di moderazione
            const updatedThread = {
                ...existingData,
                ...updateData
            };
            await set(threadRef, updatedThread);
        } else {
            console.warn(`Thread con id ${threadId} non trovato in ${dataPath}`);
        }
    } else {
        // modalità locale
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

// Carica gestione utenti
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

    // Carica lista utenti che è una funzione diversa da quella per autocomplete
    loadUsersGrid();
}

// Carica lista utenti per il pannello admin
// Modifica per loadUsersGrid (per il pannello admin)
async function loadUsersGrid() {
    const usersGrid = document.getElementById('users-grid');

    try {
        let users = [];

        if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
            // SOLUZIONE: Usa la lista utenti costruita invece di interrogare Firebase
            await loadUsersList(); // Questo ora usa il metodo sicuro
            users = allUsers.filter(user => user.email); // Solo utenti con email per admin
            
            // Se abbiamo pochi utenti, mostra messaggio informativo
            if (users.length < 3) {
                usersGrid.innerHTML = `
                    <div style="text-align: center; padding: 20px; background: rgba(255, 193, 7, 0.1); border-radius: 8px; margin: 10px 0;">
                        <div style="color: #856404; margin-bottom: 10px;">⚠️ Lista utenti limitata</div>
                        <div style="font-size: 14px; color: #856404;">
                            La lista mostra solo utenti attivi recentemente.<br>
                            Altri utenti potrebbero esistere ma non essere visibili.
                        </div>
                    </div>
                `;
            }
        } else {
            // Carica da localStorage
            const localUsers = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
            users = Object.values(localUsers);
        }

        // Aggiungi utenti alla griglia esistente se ce ne sono
        if (users.length > 0) {
            const existingContent = usersGrid.innerHTML;
            if (existingContent.includes('Lista utenti limitata')) {
                usersGrid.innerHTML = existingContent + '<div style="margin-top: 20px;"></div>';
            }
            
            displayUsersList(users);
        }

    } catch (error) {
        console.error('Errore caricamento utenti admin:', error);
        usersGrid.innerHTML = `
            <div style="text-align: center; color: red; padding: 20px;">
                <div>❌ Errore nel caricamento degli utenti</div>
                <div style="font-size: 14px; margin-top: 10px;">
                    Verifica le regole Firebase o usa la modalità locale per l'amministrazione completa.
                </div>
            </div>
        `;
    }
}

// Visualizza lista utenti
function displayUsersList(users) {
    const usersGrid = document.getElementById('users-grid');

    if (users.length === 0) {
        usersGrid.innerHTML = '<div style="text-align: center; padding: 20px;">Nessun utente trovato</div>';
        return;
    }

    usersGrid.innerHTML = users.map(user => {
        const roleText = user.role === 'superuser' ? 'SUPER' :
            user.role === 'clan_mod' ? 'CLAN MOD' : 'USER';
        const roleClass = user.role === 'superuser' ? 'role-superuser' :
            user.role === 'clan_mod' ? 'role-moderator' : 'role-user';

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
                            ${getCurrentUserRole() === USER_ROLES.SUPERUSER ? `
                                <button class="admin-btn btn-change-role" onclick="changeUserRole('${user.id || user.uid}', '${user.username}', '${user.role || 'user'}')">
                                    Cambia Ruolo
                                </button>
                            ` : ''}
                            ${user.clan && user.clan !== 'Nessuno' ? `
                                <button class="admin-btn btn-remove-clan" onclick="removFromClan('${user.id || user.uid}', '${user.username}')">
                                    Rimuovi Clan
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
    }).join('');
}

// Funzioni amministrative
async function assignClan(userId, username) {
    const availableClans = await getAvailableClans();
    const clanList = availableClans.length > 0 ? availableClans.join('\n') : 'Nessun clan disponibile';

    const clanName = prompt(`Assegna un clan a ${username}:\n\nClan disponibili:\n${clanList}\n\nInserisci il nome del clan:`);
    if (!clanName || clanName.trim() === '')
        return;

    try {
        await updateUserClan(userId, clanName.trim());
        alert(`${username} è stato assegnato al clan "${clanName}"`);
        loadUsersGrid(); // Ricarica lista
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
        loadUsersGrid(); // Ricarica lista
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
            loadUsersGrid(); // Ricarica lista
        } catch (error) {
            console.error('Errore rimozione clan:', error);
            alert('Errore nella rimozione dal clan');
        }
    }
}

// Funzioni di aggiornamento database
async function updateUserClan(userId, clanName) {
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
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
}

async function updateUserRole(userId, newRole) {
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
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
}

// Gestione clan
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
        // Rimuovi tutti gli utenti dal clan
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

// Genera il path corretto per messaggi/thread in base alla sezione e clan
function getDataPath(sectionKey, dataType) {
    if (sectionKey.startsWith('clan-')) {
        const userClan = getCurrentUserClan();
        if (userClan === 'Nessuno') {
            return null;
        }
        // Sostituisci caratteri speciali nel nome del clan per Firebase
        const safeClanName = userClan.replace(/[.#$[\]]/g, '_');
        return `${dataType}/clan/${safeClanName}/${sectionKey}`;
    } else {
        return `${dataType}/${sectionKey}`;
    }
}

// Upload immagine thread
async function uploadThreadImage(file, progressCallback) {
    if (!file)
        return null;

    try {
        if (window.useFirebase && window.firebaseStorage && firebaseReady && storageRef && uploadBytes && getDownloadURL) {
            try {
                // Upload su Firebase Storage
                const timestamp = Date.now();
                const filename = `threads/${currentUser.uid}/${timestamp}_${file.name}`;
                const imageRef = storageRef(window.firebaseStorage, filename);

                // Upload con progress tracking
                const uploadTask = uploadBytes(imageRef, file);

                // Simula progress (Firebase v9 non ha onSnapshot per upload)
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

                // Ottieni URL download
                const downloadURL = await getDownloadURL(snapshot.ref);
                return downloadURL;

            } catch (storageError) {
                console.warn('⚠️ Errore Firebase Storage, uso fallback locale:', storageError.message);

                // Fallback: converte in base64 se Firebase Storage fallisce
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
            // Modalità locale - converte in base64
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

        // Ultimo tentativo: base64 fallback
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

// Update upload progress
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

    // Nascondi il progresso quando completato
    if (progress >= 100) {
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
    }
}

// Carica thread
function loadThreads(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'threads');
    if (!dataPath) return;

    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue && off) {
        
        
       
        
        // ✅ FALLBACK: USA onValue SEMPLICE
        console.log('📊 Usando onValue semplice per thread (fallback):', sectionKey);
        const threadsRef = ref(window.firebaseDatabase, dataPath);

        // Cleanup previous listener
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

            // Ordina e limita manualmente
            threads.sort((a, b) => b.createdAt - a.createdAt);
            const limitedThreads = threads.slice(0, 20); // Primi 20
            
            displayThreads(limitedThreads);
        };

        threadListeners[sectionKey] = { path: dataPath, callback: callback };
        onValue(threadsRef, callback);
        
        console.log('📥 Listening thread con fallback per:', dataPath);
    } else {
        // Modalità locale
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        threads.sort((a, b) => b.createdAt - a.createdAt);
        displayThreads(threads);
    }
}

// Mostra thread
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

    // Filtra thread approvati per utenti normali
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

            // Trova dati autore per clan
            const author = allUsers.find(u => u.uid === thread.authorId) || {
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
                            <span>${formatTime(thread.createdAt)}</span>
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
                    <div>${formatTime(thread.createdAt)}</div>
                    <div>da <strong>${thread.author}</strong></div>
                </div>
            </div>
        `;
        }).join('');
}

// Mostra modal creazione thread
function showThreadCreationModal() {
    if (!currentUser) {
        alert('Devi effettuare l\'accesso per creare thread');
        return;
    }

    // Controlla accesso clan
    if (currentSection.startsWith('clan-') && getCurrentUserClan() === 'Nessuno') {
        alert('Devi appartenere a un clan per creare thread qui!');
        return;
    }

    document.getElementById('threadCreationModal').style.display = 'flex';
    document.getElementById('thread-title-input').focus();

    // Setup image upload listener
    setupImageUpload();
}

// Setup image upload
function setupImageUpload() {
    const imageInput = document.getElementById('thread-image-input');
    const imageLabel = document.querySelector('.image-upload-label');

    // Remove existing listeners
    imageInput.removeEventListener('change', handleImageSelect);
    imageLabel.removeEventListener('click', () => imageInput.click());

    // Add new listeners
    imageInput.addEventListener('change', handleImageSelect);
    imageLabel.addEventListener('click', () => imageInput.click());
}

// Handle image selection
function handleImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('image-preview');
    const progressContainer = document.getElementById('upload-progress');

    if (!file)
        return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Seleziona solo file immagine (JPG, PNG, GIF, etc.)');
        return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('L\'immagine è troppo grande. Massimo 5MB consentiti.');
        return;
    }

    // Show preview
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

    // Hide progress initially
    progressContainer.style.display = 'none';
}

// Remove selected image
function removeSelectedImage() {
    document.getElementById('thread-image-input').value = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('upload-progress').style.display = 'none';
}

// Nascondi modal creazione thread
function hideThreadCreationModal() {
    document.getElementById('threadCreationModal').style.display = 'none';
    document.getElementById('thread-title-input').value = '';
    document.getElementById('thread-content-input').value = '';
    removeSelectedImage(); // Pulisci anche l'immagine selezionata
}

// Crea thread dalla modal
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
            author: getUserDisplayName(),
            authorId: currentUser.uid,
            createdAt: Date.now(), // USA TIMESTAMP LOCALE
            replies: 0,
            views: 0
        };

        // Upload immagine se presente
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

        // Determina se il thread ha bisogno di approvazione
        const needsApproval = currentSection.startsWith('clan-') && !canModerateSection(currentSection);

        if (needsApproval) {
            threadData.status = 'pending';
        } else {
            threadData.status = 'approved';
        }

        const dataPath = getDataPath(currentSection, 'threads');
        if (!dataPath) {
            console.error('❌ Path dati non valido per sezione:', currentSection);
            alert('Errore: sezione non valida');
            return;
        }

        createBtn.textContent = 'Salvando thread...';

        console.log('📤 Creazione thread a:', dataPath);
        console.log('📝 Dati thread:', threadData);

        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push) {
            const threadsRef = ref(window.firebaseDatabase, dataPath);
            await push(threadsRef, threadData);
            console.log('✅ Thread creato con successo');
        } else {
            // Salva in locale
            saveLocalThread(currentSection, threadData);
        }

        hideThreadCreationModal();

        if (needsApproval) {
            alert('Thread creato! È in attesa di approvazione da parte del moderatore del clan.');
        } else {
            alert('Thread creato con successo!');
            if (window.activityTracker) {
                window.handleNewContent(currentSection, 'thread');
            }
        }
    } catch (error) {
        console.error('❌ Errore creazione thread:', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            console.error('🚫 Permesso negato per path:', dataPath);
            alert('❌ Errore di permessi nella creazione del thread');
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

// Apri thread per visualizzazione
async function openThread(threadId, section) {
    if (!currentUser) {
        alert('Devi effettuare l\'accesso per visualizzare i thread');
        return;
    }

    try {
        // Trova il thread
        const thread = await getThread(threadId, section);
        if (!thread) {
            alert('Thread non trovato');
            return;
        }

        // Aggiorna visualizzazioni
        await incrementThreadViews(threadId, section);

        // Salva riferimenti
        currentThread = thread;
        currentThreadId = threadId;
        currentThreadSection = section;

        // Mostra vista thread
        document.getElementById('forum-content').style.display = 'none';
        document.getElementById('chat-content').style.display = 'none';
        document.getElementById('thread-view').style.display = 'flex';
        document.getElementById('new-thread-btn').style.display = 'none';

        // Popola dati thread
        document.getElementById('thread-title').textContent = thread.title;
        document.getElementById('thread-author').textContent = thread.author;
        document.getElementById('thread-date').textContent = formatTime(thread.createdAt);
        document.getElementById('thread-views').textContent = `${thread.views || 0} visualizzazioni`;

        // Contenuto del thread con immagine se presente - CON FORMATTAZIONE HTML
        const threadContentEl = document.getElementById('thread-content');
        let contentHtml = processContent(thread.content || 'Nessun contenuto disponibile', true);

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

        // Carica commenti
        loadThreadComments(threadId, section);

        // Reset flag per permettere nuovo setup nei commenti
        commentImageUploadInitialized = false;

        // Chiudi menu mobile se aperto
        closeMobileMenu();

    } catch (error) {
        console.error('Errore apertura thread:', error);
        alert('Errore nell\'apertura del thread');
    }
}

// Torna al forum
function backToForum() {
    document.getElementById('thread-view').style.display = 'none';
    document.getElementById('forum-content').style.display = 'block';
    document.getElementById('new-thread-btn').style.display = 'block';

    // Pulisci dati thread
    cleanupCommentImageUpload();

    // Pulisci dati thread
    currentThread = null;
    currentThreadId = null;
    currentThreadSection = null;

    // Ricarica contenuto se necessario
    if (currentSection && sectionConfig[currentSection]) {
        const section = sectionConfig[currentSection];
        if (section.type === 'forum') {
            loadThreads(currentSection);
        } else if (section.type === 'dashboard') {
            loadDashboard();
        }
    }
}

// Ottieni thread per ID
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
        // Modalità locale
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return threads.find(t => t.id === threadId) || null;
    }
}

// Incrementa visualizzazioni thread
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
        // Modalità locale
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const threadIndex = threads.findIndex(t => t.id === threadId);

        if (threadIndex !== -1) {
            threads[threadIndex].views = (threads[threadIndex].views || 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify(threads));
        }
    }
}

// Carica commenti thread
function loadThreadComments(threadId, section) {
    const dataPath = getDataPath(section, 'comments');
    if (!dataPath) return;

    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue) {
        
        
        
        
        // ✅ FALLBACK: USA onValue SEMPLICE
        console.log('📊 Usando onValue semplice per commenti (fallback):', threadId);
        const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${threadId}`);

        onValue(commentsRef, (snapshot) => {
            const comments = [];
            snapshot.forEach((childSnapshot) => {
                comments.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            // Ordina e limita manualmente
            comments.sort((a, b) => a.timestamp - b.timestamp);
            const limitedComments = comments.slice(-30); // Ultimi 30
            
            displayThreadComments(limitedComments);
        });
        
        console.log('📥 Listening commenti con fallback per:', `${dataPath}/${threadId}`);
    } else {
        // Modalità locale
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
        const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
        comments.sort((a, b) => a.timestamp - b.timestamp);
        displayThreadComments(comments);
    }
}
function safeInitializeFirebaseQueries() {
    console.log('🔧 Inizializzazione sicura query Firebase...');
    
    // Verifica periodicamente se le query functions sono disponibili
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        
    }, 1000); // Controlla ogni secondo
}
// Mostra commenti thread con avatar potenziati
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

    // Pre-carica tutti gli utenti necessari con gestione errori
    const uniqueUserIds = [...new Set(comments.map(comment => comment.authorId).filter(Boolean))];
    try {
        await Promise.all(uniqueUserIds.map(userId => loadUserWithAvatar(userId)));
    } catch (error) {
        console.warn('Errore pre-caricamento avatar commenti:', error);
    }

    commentsContainer.innerHTML = comments.map(comment => {
        // Trova dati utente per avatar e clan
        const user = allUsers.find(u => u.uid === comment.authorId) || {
            uid: comment.authorId || 'unknown',
            username: comment.author,
            clan: 'Nessuno',
            avatarUrl: null
        };

        let commentContentHtml = '';

        // Aggiungi testo del commento se presente - CON FORMATTAZIONE HTML
        if (comment.content && comment.content.trim()) {
            const processedContent = processContent(comment.content, true);
            const contentWithMentions = highlightMentions(processedContent, currentUser?.uid);
            commentContentHtml += `<div class="comment-text">${contentWithMentions}</div>`;
        }

        // Aggiungi immagine se presente
        if (comment.imageUrl) {
            commentContentHtml += `
                <div class="comment-image">
                    <img src="${comment.imageUrl}" 
                         alt="${comment.imageName || 'Immagine del commento'}" 
                         class="comment-main-image"
                         onclick="openImageModal('${comment.imageUrl}', '${comment.imageName || 'Immagine del commento'}')"
                         title="Clicca per ingrandire">
                </div>
            `;
        }

        return `
            <div class="comment-with-avatar">
                ${createAvatarHTML(user, 'small')}
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author-name">${comment.author}</span>
                        ${createClanBadgeHTML(user.clan)}
                        <span class="comment-time">${formatTime(comment.timestamp)}</span>
                    </div>
                    <div class="comment-body">${commentContentHtml}</div>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    commentsContainer.scrollTop = commentsContainer.scrollHeight;
}


// Aggiungi commento
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

    // Rileva menzioni
    const mentions = detectMentions(commentText);

    const commentBtn = document.getElementById('submit-comment-btn');
    const progressContainer = document.getElementById('comment-upload-progress');

    commentBtn.disabled = true;
    commentBtn.textContent = 'Invio...';

    try {
        const commentData = {
            author: getUserDisplayName(),
            authorId: currentUser.uid,
            content: commentText || '',
            threadId: currentThreadId,
            timestamp: Date.now() // USA TIMESTAMP LOCALE
        };

        // Upload immagine se presente
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
        if (!dataPath) {
            console.error('❌ Path commenti non valido');
            alert('Errore: sezione non valida per commenti');
            return;
        }

        commentBtn.textContent = 'Salvando commento...';

        console.log('📤 Invio commento a:', `${dataPath}/${currentThreadId}`);
        console.log('📝 Dati commento:', commentData);

        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push) {
            const commentsRef = ref(window.firebaseDatabase, `${dataPath}/${currentThreadId}`);
            await push(commentsRef, commentData);

            // Aggiorna contatore risposte
            await incrementThreadReplies(currentThreadId, currentThreadSection);
            console.log('✅ Commento inviato con successo');
        } else {
            // Salva in locale
            saveLocalComment(currentThreadSection, currentThreadId, commentData);
        }

        // Crea notifiche per le menzioni
        for (const mention of mentions) {
            await createNotification('mention', mention.userId, {
                message: commentText,
                section: currentThreadSection,
                threadId: currentThreadId,
                threadTitle: currentThread?.title,
                sectionTitle: sectionConfig[currentThreadSection]?.title || 'Forum'
            });
        }

        // Pulisci input
        document.getElementById('comment-text').value = '';
        removeCommentSelectedImage();

        // Nascondi sezione upload se visibile
        const uploadSection = document.getElementById('comment-image-upload');
        uploadSection.classList.remove('show');

    } catch (error) {
        console.error('❌ Errore invio commento:', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            console.error('🚫 Permesso negato per commenti');
            alert('❌ Errore di permessi nell\'invio del commento');
        } else {
            alert('Errore nell\'invio del commento: ' + (error.message || error));
        }
    } finally {
        commentBtn.disabled = false;
        commentBtn.textContent = 'Commenta';
        progressContainer.style.display = 'none';
    }
}

// Salva commento locale
function saveLocalComment(section, threadId, commentData) {
    const dataPath = getDataPath(section, 'comments');
    if (!dataPath) return;

    const storageKey = `hc_${dataPath.replace(/\//g, '_')}_${threadId}`;
    const comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    commentData.timestamp = Date.now();
    commentData.id = 'comment_' + Date.now();
    commentData.author = getUserDisplayName(); // Assicurati che usi username
    comments.push(commentData);
    localStorage.setItem(storageKey, JSON.stringify(comments));

    incrementThreadReplies(threadId, section);
    loadThreadComments(threadId, section);
}
// Incrementa risposte thread
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
        // Modalità locale
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const threadIndex = threads.findIndex(t => t.id === threadId);

        if (threadIndex !== -1) {
            threads[threadIndex].replies = (threads[threadIndex].replies || 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify(threads));
        }
    }
}

// Gestione emoticon
function toggleEmoticonPicker(type) {
    const panel = document.getElementById(`${type}-emoticon-panel`);
    const isVisible = panel.classList.contains('show');

    // Chiudi tutti i panel
    document.querySelectorAll('.emoticon-panel').forEach(p => {
        p.classList.remove('show');
    });

    // Mostra quello corrente se non era visibile
    if (!isVisible) {
        panel.classList.add('show');
    }
}

// Aggiungi emoticon
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

    // Chiudi picker
    document.getElementById(`${type}-emoticon-panel`).classList.remove('show');
}

// Apri modal immagine a schermo intero
function openImageModal(imageUrl, imageName) {
    // Non aprire il modal se l'elemento cliccato è un avatar
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

    // Previeni scroll del body
    document.body.style.overflow = 'hidden';
}

// Chiudi modal immagine
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';

    // Ripristina scroll del body
    document.body.style.overflow = 'auto';
}

// Chiudi emoticon picker quando si clicca fuori
document.addEventListener('click', function (event) {
    if (!event.target.closest('.emoticon-picker')) {
        document.querySelectorAll('.emoticon-panel').forEach(panel => {
            panel.classList.remove('show');
        });
    }
});

// Carica messaggi
function loadMessages(sectionKey) {
    const dataPath = getDataPath(sectionKey, 'messages');
    if (!dataPath) return;

    if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && onValue && off) {
        
        
        
        // ✅ FALLBACK: USA onValue SEMPLICE
        console.log('📊 Usando onValue semplice per messaggi (fallback):', sectionKey);
        const messagesRef = ref(window.firebaseDatabase, dataPath);

        // Cleanup previous listener
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

            // Ordina e limita manualmente
            messages.sort((a, b) => a.timestamp - b.timestamp);
            const limitedMessages = messages.slice(-50); // Ultimi 50
            
            displayMessages(limitedMessages);
            updateMessageCounter(limitedMessages.length);
        };

        messageListeners[sectionKey] = { path: dataPath, callback: callback };
        onValue(messagesRef, callback);
        
        console.log('📥 Listening messaggi con fallback per:', dataPath);
    } else {
        // Modalità locale
        const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
        const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        messages.sort((a, b) => a.timestamp - b.timestamp);
        displayMessages(messages);
        updateMessageCounter(messages.length);
    }
}
// Mostra messaggi stile WhatsApp con avatar potenziati
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

    // Pre-carica tutti gli utenti necessari con gestione errori
    const uniqueUserIds = [...new Set(messages.map(msg => msg.authorId).filter(Boolean))];
    try {
        await Promise.all(uniqueUserIds.map(userId => loadUserWithAvatar(userId)));
    } catch (error) {
        console.warn('Errore pre-caricamento avatar:', error);
    }

    for (let index = 0; index < messages.length; index++) {
        const msg = messages[index];
        
        // Trova dati utente per avatar e clan
        const user = allUsers.find(u => u.uid === msg.authorId) || {
            uid: msg.authorId || 'unknown',
            username: msg.author,
            clan: 'Nessuno',
            avatarUrl: null
        };

        const isOwnMessage = currentUser && msg.authorId === currentUser.uid;
        const isNewAuthor = msg.author !== lastAuthor;
        const timeDiff = msg.timestamp - lastTimestamp;
        const showTimestamp = timeDiff > 300000; // 5 minuti

        // Separatore temporale se molto tempo è passato
        if (showTimestamp && index > 0) {
            htmlContent += `
                <div class="message-time-separator">
                    <span>${formatDate(msg.timestamp)}</span>
                </div>
            `;
        }

        // Processa il messaggio con formattazione HTML
        const processedMessage = processContent(msg.message, true);
        const messageWithMentions = highlightMentions(processedMessage, currentUser?.uid);

        // Container del messaggio
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

function formatTimeShort(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

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
function saveLocalMessage(section, messageData) {
    const dataPath = getDataPath(section, 'messages');
    if (!dataPath) return;

    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
    const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    messageData.timestamp = Date.now();
    messageData.id = 'msg_' + Date.now();
    messageData.author = getUserDisplayName(); // Assicurati che usi username
    messages.push(messageData);
    localStorage.setItem(storageKey, JSON.stringify(messages));

    // Ricarica messaggi
    loadMessages(section);
}

// ✅ AGGIORNA saveLocalThread per usare getUserDisplayName
function saveLocalThread(section, threadData) {
    const dataPath = getDataPath(section, 'threads');
    if (!dataPath) return;

    const storageKey = `hc_${dataPath.replace(/\//g, '_')}`;
    const threads = JSON.parse(localStorage.getItem(storageKey) || '[]');
    threadData.createdAt = Date.now();
    threadData.id = 'thread_' + Date.now();
    threadData.replies = 0;
    threadData.views = 0;
    threadData.author = getUserDisplayName(); // Assicurati che usi username

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

// Invia messaggio (Firebase o locale)
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

    // Rileva menzioni
    const mentions = detectMentions(message);

    input.disabled = true;
    sendBtn.disabled = true;

    try {
        const messageData = {
            author: getUserDisplayName(),
            authorId: currentUser.uid,
            message: message,
            timestamp: Date.now() // USA TIMESTAMP LOCALE invece di serverTimestamp per evitare errori
        };

        const dataPath = getDataPath(currentSection, 'messages');
        if (!dataPath) {
            console.error('❌ Path dati non valido per sezione:', currentSection);
            alert('Errore: sezione non valida');
            return;
        }

        console.log('📤 Invio messaggio a:', dataPath);
        console.log('📝 Dati messaggio:', messageData);

        if (window.useFirebase && window.firebaseDatabase && firebaseReady && ref && push) {
            const messagesRef = ref(window.firebaseDatabase, dataPath);
            await push(messagesRef, messageData);
            console.log('✅ Messaggio inviato con successo');
        } else {
            saveLocalMessage(currentSection, messageData);
        }

        // Crea notifiche per le menzioni
        for (const mention of mentions) {
            await createNotification('mention', mention.userId, {
                message: message,
                section: currentSection,
                sectionTitle: sectionConfig[currentSection]?.title || 'Chat'
            });
        }

        input.value = '';
        if (window.activityTracker) {
            window.handleNewContent(currentSection, 'message');
        }

    } catch (error) {
        console.error('❌ Errore invio messaggio:', error);
        
        // Gestione errori specifici
        if (error.code === 'PERMISSION_DENIED') {
            console.error('🚫 Permesso negato per path:', dataPath);
            console.error('👤 Utente corrente:', currentUser.uid);
            console.error('🏰 Clan corrente:', getCurrentUserClan());
            
            alert('❌ Errore di permessi. Verifica:\n' +
                  '1. Di essere loggato correttamente\n' +
                  '2. Di appartenere al clan per chat clan\n' +
                  '3. Che le regole Firebase siano aggiornate');
        } else {
            alert('Errore nell\'invio del messaggio: ' + (error.message || error));
        }
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}
// Utility
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
        // Pulisci listeners messaggi
        Object.keys(messageListeners).forEach(section => {
            const listener = messageListeners[section];
            if (listener && listener.path && listener.callback) {
                const messagesRef = ref(window.firebaseDatabase, listener.path);
                off(messagesRef, listener.callback);
            }
        });
        messageListeners = {};

        // Pulisci listeners thread
        Object.keys(threadListeners).forEach(section => {
            const listener = threadListeners[section];
            if (listener && listener.path && listener.callback) {
                const threadsRef = ref(window.firebaseDatabase, listener.path);
                off(threadsRef, listener.callback);
            }
        });
        threadListeners = {};

        // Pulisci upload commenti
        cleanupCommentImageUpload();
    } catch (error) {
        console.error('Errore pulizia listeners:', error);
    }
}

// Event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            if (section)
                switchSection(section);
        });
    });

    // Chat input
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Comment input
    document.getElementById('comment-text').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            addComment();
        }
    });

    // Form inputs - Enter per submit
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

    // Thread creation form - Enter per submit
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

    // Escape per chiudere modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('threadCreationModal').style.display === 'flex') {
                hideThreadCreationModal();
            } else if (document.getElementById('imageModal').style.display === 'flex') {
                closeImageModal();
            }
        }
    });

    // Chiudi modal cliccando fuori
    document.getElementById('threadCreationModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('threadCreationModal')) {
            hideThreadCreationModal();
        }
    });

    // Previeni chiusura modal immagine cliccando sull'immagine
    document.getElementById('modalImage').addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Toggle comment image upload section
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
        // Setup solo se non è già stato fatto
        if (!commentImageUploadInitialized) {
            setupCommentImageUploadSafe();
        }
        console.log('📷 Sezione upload mostrata');
    }
}

// Setup comment image upload SICURO (previene doppi listener)
function setupCommentImageUploadSafe() {
    const imageInput = document.getElementById('comment-image-input');
    const imageLabel = document.querySelector('#comment-image-upload .image-upload-label');

    if (!imageInput || !imageLabel) {
        console.log('❌ Elementi upload commento non trovati');
        return;
    }

    // Rimuovi TUTTI i listener esistenti prima di aggiungerne di nuovi
    cleanupCommentImageListeners();

    console.log('🔧 Setup listener upload commento (SAFE)');

    // Aggiungi listener per il click sulla label
    const clickHandler = () => {
        console.log('🖱️ Click su label upload');
        imageInput.click();
    };

    // Aggiungi listener per la selezione file
    const changeHandler = (event) => {
        console.log('📁 File selezionato tramite input');
        handleCommentImageSelect(event);
    };

    // Salva riferimenti per cleanup futuro
    imageLabel._commentClickHandler = clickHandler;
    imageInput._commentChangeHandler = changeHandler;

    // Aggiungi listener
    imageLabel.addEventListener('click', clickHandler);
    imageInput.addEventListener('change', changeHandler);

    commentImageUploadInitialized = true;
    console.log('✅ Listener upload commento configurati');
}

// Pulisci tutti i listener per evitare duplicati
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

// Pulisci tutto quando si chiude il thread o si cambia sezione
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

// Handle comment image selection
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Seleziona solo file immagine (JPG, PNG, GIF, etc.)');
        return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('L\'immagine è troppo grande. Massimo 5MB consentiti.');
        return;
    }

    // Show preview
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

    // Hide progress initially
    progressContainer.style.display = 'none';
}

// Remove selected comment image
function removeCommentSelectedImage() {
    document.getElementById('comment-image-input').value = '';
    document.getElementById('comment-image-preview').innerHTML = '';
    document.getElementById('comment-upload-progress').style.display = 'none';
}

// Update comment upload progress
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

    // Nascondi il progresso quando completato
    if (progress >= 100) {
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
    }
}

function setupAvatarUpload() {
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarControls = document.getElementById('avatarControls');

    if (avatarUpload && currentUser) {
        avatarControls.style.display = 'block';
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
}

// Handle avatar upload
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file)
        return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Seleziona solo file immagine (JPG, PNG, GIF, etc.)');
        return;
    }

    // Validate file size (max 2MB for avatar)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        alert('L\'immagine è troppo grande. Massimo 2MB consentiti per l\'avatar.');
        return;
    }

    currentAvatarFile = file;
    showAvatarModal(file);
}

// Show avatar modal with preview
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

// Save avatar changes
async function saveAvatarChanges() {
    if (!currentAvatarFile || isAvatarUploading)
        return;

    isAvatarUploading = true;
    const saveBtn = document.querySelector('.btn-save-avatar');
    const progressContainer = document.getElementById('avatar-upload-progress');

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Caricando...';
    progressContainer.style.display = 'block';

    try {
        // Upload avatar
        const avatarUrl = await uploadAvatarImage(currentAvatarFile, (progress) => {
            updateAvatarUploadProgress(progress);
        });

        if (avatarUrl) {
            // Save to user profile
            await updateUserAvatar(avatarUrl);

            // Update UI
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

// Cancel avatar change
function cancelAvatarChange() {
    const modal = document.getElementById('avatarModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Reset file input
    document.getElementById('avatar-upload').value = '';
    currentAvatarFile = null;
}

// Remove avatar
async function removeAvatar() {
    if (!confirm('🗑️ Sei sicuro di voler rimuovere il tuo avatar?'))
        return;

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

// Upload avatar image
async function uploadAvatarImage(file, progressCallback) {
    if (!file)
        return null;

    try {
        if (window.useFirebase && window.firebaseStorage && firebaseReady && storageRef && uploadBytes && getDownloadURL) {
            try {
                // Upload su Firebase Storage
                const timestamp = Date.now();
                const filename = `avatars/${currentUser.uid}/${timestamp}_avatar.${file.name.split('.').pop()}`;
                const imageRef = storageRef(window.firebaseStorage, filename);

                // Simula progress
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 30;
                    if (progress > 90)
                        progress = 90;
                    progressCallback(progress);
                }, 200);

                const snapshot = await uploadBytes(imageRef, file);
                clearInterval(progressInterval);
                progressCallback(100);

                const downloadURL = await getDownloadURL(snapshot.ref);
                console.log('📷 Avatar caricato su Firebase Storage');
                return downloadURL;

            } catch (storageError) {
                console.warn('⚠️ Errore Firebase Storage per avatar, uso fallback locale:', storageError.message);
                return convertToBase64(file, progressCallback);
            }
        } else {
            // Modalità locale - converte in base64
            return convertToBase64(file, progressCallback);
        }
    } catch (error) {
        console.error('Errore upload avatar:', error);
        return convertToBase64(file, progressCallback);
    }
}

// Convert image to base64
function convertToBase64(file, progressCallback) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            progressCallback(100);
            console.log('📷 Avatar convertito in base64');
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

// Update avatar upload progress
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

// Update user avatar in database
// Hook per aggiornare cache quando l'avatar cambia
async function updateUserAvatar(avatarUrl) {
    if (window.useFirebase && window.firebaseDatabase && firebaseReady) {
        const userRef = ref(window.firebaseDatabase, `users/${currentUser.uid}/avatarUrl`);
        await set(userRef, avatarUrl);
    } else {
        // Modalità locale
        const users = JSON.parse(localStorage.getItem('hc_local_users') || '{}');
        for (const email in users) {
            if (users[email].uid === currentUser.uid) {
                users[email].avatarUrl = avatarUrl;
                localStorage.setItem('hc_local_users', JSON.stringify(users));
                // Aggiorna anche i dati correnti
                if (currentUserData) {
                    currentUserData.avatarUrl = avatarUrl;
                }
                break;
            }
        }
    }
    
    // Aggiorna cache
    updateUserAvatarInCache(currentUser.uid, avatarUrl);
    
    // Ricarica la lista utenti per aggiornare la cache
    await loadUsersList();
}
// Update user avatar display in UI
function updateUserAvatarDisplay(avatarUrl) {
    const avatarContainer = document.getElementById('userAvatar');
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarDefault = document.getElementById('userAvatarDefault');

    if (avatarUrl) {
        // Mostra immagine avatar
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
        
        // Nascondi completamente il default
        avatarDefault.style.display = 'none';
        avatarDefault.style.visibility = 'hidden';
        avatarDefault.style.opacity = '0';
    } else {
        // Nascondi immagine avatar
        avatarImg.style.display = 'none';
        avatarImg.style.visibility = 'hidden';
        avatarImg.src = '';
        
        // Mostra default
        avatarDefault.style.display = 'flex';
        avatarDefault.style.visibility = 'visible';
        avatarDefault.style.opacity = '1';
    }

    // Aggiorna anche nei dati utente correnti
    if (currentUserData) {
        currentUserData.avatarUrl = avatarUrl;
    }
}

// ===============================================
// UTILITY FUNCTIONS PER AVATAR E CLAN
// ===============================================

// Create avatar HTML
// Create avatar HTML with enhanced support
function createAvatarHTML(user, size = 'small') {
    const sizeClass = size === 'large' ? 'user-avatar' :
        size === 'medium' ? 'message-avatar' : 'comment-avatar';

    // Verifica se l'utente ha un avatar
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

// 2. AGGIORNA LA FUNZIONE openImageModal per controllare se è un avatar
function openImageModal(imageUrl, imageName) {
    // Non aprire il modal se l'elemento cliccato è un avatar
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

    // Previeni scroll del body
    document.body.style.overflow = 'hidden';
}

// 3. AGGIUNGI EVENT LISTENER PER PREVENIRE CLICK SUGLI AVATAR
document.addEventListener('DOMContentLoaded', function() {
    // Previeni il click sugli avatar
    document.addEventListener('click', function(event) {
        // Se è un avatar, previeni l'apertura del modal
        if (event.target.classList.contains('avatar-image') || 
            event.target.closest('.user-avatar, .message-avatar, .comment-avatar')) {
            event.stopPropagation();
            event.preventDefault();
            return false;
        }
    }, true); // Usa capture per intercettare prima
});

// Create clan badge HTML
function createClanBadgeHTML(clan) {
    if (!clan || clan === 'Nessuno') {
        return '<span class="user-clan-badge no-clan">Nessun Clan</span>';
    }
    return `<span class="user-clan-badge">🏰 ${clan}</span>`;
}

// Get user display name with clan
function getUserDisplayNameWithClan(user) {
    const clan = user.clan && user.clan !== 'Nessuno' ? ` [${user.clan}]` : '';
    return `${user.username}${clan}`;
}

// ✅ AGGIUNGI QUESTE FUNZIONI ALLA FINE DEL FILE

// Funzione di test per verificare il sistema notifiche
window.testNotifications = function () {
    if (!currentUser) {
        console.log('❌ Devi essere loggato per testare le notifiche');
        return;
    }

    console.log('🧪 Test notifiche iniziato...');

    // Crea una notifica di test
    const testNotification = {
        id: 'test_notif_' + Date.now(),
        type: 'mention',
        fromUser: 'TestUser',
        fromUserId: 'test_user_123',
        targetUserId: currentUser.uid,
        timestamp: Date.now(),
        read: false,
        message: 'Questa è una notifica di test!',
        section: 'chat-generale',
        sectionTitle: 'Chat Generale'
    };

    // Salva la notifica
    saveLocalNotification(currentUser.uid, testNotification);

    // Mostra toast
    showMentionToast(testNotification);

    console.log('✅ Notifica di test creata! Controlla il badge e il pannello notifiche.');
};

// Funzione per pulire le notifiche di test
window.clearTestNotifications = function () {
    if (!currentUser) {
        console.log('❌ Devi essere loggato');
        return;
    }

    const storageKey = `hc_notifications_${currentUser.uid}`;
    const notifications = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const filtered = notifications.filter(n => !n.id.startsWith('test_notif_'));

    localStorage.setItem(storageKey, JSON.stringify(filtered));
    loadNotifications();

    console.log('🧹 Notifiche di test rimosse.');
};

// Funzione per mostrare info debug notifiche
window.debugNotifications = function () {
    console.log('🔍 Debug Notifiche:');
    console.log('- Utente corrente:', currentUser?.uid, currentUser?.displayName);
    console.log('- Notifiche in memoria:', notificationsData.length);
    console.log('- Notifiche non lette:', unreadNotificationsCount);
    console.log('- Utenti per autocomplete:', allUsers.length);

    if (currentUser) {
        const storageKey = `hc_notifications_${currentUser.uid}`;
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        console.log('- Notifiche in localStorage:', stored.length);
        console.log('- Dettagli notifiche:', stored);
    }

    const badge = document.getElementById('notificationBadge');
    console.log('- Badge elemento:', badge);
    console.log('- Badge visibile:', badge ? !badge.classList.contains('hidden') : false);
    console.log('- Badge testo:', badge ? badge.textContent : 'N/A');
};
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    // Lista dei tag HTML permessi (sicuri)
    const allowedTags = {
        'b': [],
        'strong': [],
        'i': [],
        'em': [],
        'u': [],
        'br': [],
        'p': [],
        'div': [],
        'span': ['class'],
        'h1': [], 'h2': [], 'h3': [], 'h4': [], 'h5': [], 'h6': [],
        'ul': [], 'ol': [], 'li': [],
        'blockquote': [],
        'code': [],
        'pre': [],
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'table': [], 'tr': [], 'td': [], 'th': [], 'thead': [], 'tbody': []
    };
    
    // Rimuovi script e altri tag pericolosi
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    html = html.replace(/on\w+\s*=\s*[^>]*/gi, ''); // Rimuovi attributi onclick, onload, etc.
    html = html.replace(/javascript:/gi, ''); // Rimuovi javascript: negli href
    
    // Funzione per processare i tag
    function processTag(match, isClosing, tagName, attributes) {
        tagName = tagName.toLowerCase();
        
        // Se il tag non è permesso, rimuovilo
        if (!allowedTags[tagName]) {
            return '';
        }
        
        // Se è un tag di chiusura, restituiscilo così com'è
        if (isClosing) {
            return `</${tagName}>`;
        }
        
        // Processa gli attributi per i tag di apertura
        const allowedAttrs = allowedTags[tagName];
        let processedAttrs = '';
        
        if (attributes && allowedAttrs.length > 0) {
            // Estrae gli attributi
            const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
            let attrMatch;
            
            while ((attrMatch = attrRegex.exec(attributes)) !== null) {
                const attrName = attrMatch[1].toLowerCase();
                const attrValue = attrMatch[2];
                
                // Se l'attributo è permesso per questo tag
                if (allowedAttrs.includes(attrName)) {
                    // Sanitizza il valore dell'attributo
                    let sanitizedValue = attrValue
                        .replace(/javascript:/gi, '')
                        .replace(/on\w+/gi, '')
                        .replace(/[<>]/g, '');
                    
                    processedAttrs += ` ${attrName}="${sanitizedValue}"`;
                }
            }
        }
        
        // Tag auto-chiudenti
        if (['br', 'img'].includes(tagName)) {
            return `<${tagName}${processedAttrs} />`;
        }
        
        return `<${tagName}${processedAttrs}>`;
    }
    
    // Regex per trovare tutti i tag HTML
    const tagRegex = /<(\/?)([\w-]+)([^>]*)>/g;
    
    // Sostituisci tutti i tag con versioni sanitizzate
    html = html.replace(tagRegex, (match, isClosing, tagName, attributes) => {
        return processTag(match, isClosing, tagName, attributes);
    });
    
    return html;
}

// Funzione per convertire testo semplice in HTML con formattazione automatica
function autoFormatText(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Converti a capo in <br>
    text = text.replace(/\n/g, '<br>');
    
    // Converti markdown semplice
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // **grassetto**
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>'); // *corsivo*
    text = text.replace(/__(.*?)__/g, '<u>$1</u>'); // __sottolineato__
    text = text.replace(/`(.*?)`/g, '<code>$1</code>'); // `codice`
    
    // Converti URL in link (versione semplice)
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return text;
}

// Funzione combinata per processare il contenuto
function processContent(content, enableAutoFormat = true) {
    if (!content || typeof content !== 'string') return '';
    
    // Se sembra contenere HTML, sanitizzalo
    if (content.includes('<') && content.includes('>')) {
        return sanitizeHtml(content);
    }
    
    // Altrimenti, se l'auto-formattazione è abilitata, processalo
    if (enableAutoFormat) {
        return autoFormatText(content);
    }
    
    // Fallback: escape HTML per sicurezza
    return escapeHtml(content);
}

let dataTransferLog = {
    reads: 0,
    writes: 0,
    lastReset: Date.now()
};

function logFirebaseOperation(type, path, dataSize = 0) {
    dataTransferLog[type === 'read' ? 'reads' : 'writes']++;
    
    // Log ogni 10 operazioni
    if ((dataTransferLog.reads + dataTransferLog.writes) % 10 === 0) {
        console.log('📊 Firebase Usage:', {
            reads: dataTransferLog.reads,
            writes: dataTransferLog.writes,
            session: `${Math.round((Date.now() - dataTransferLog.lastReset) / 1000)}s`
        });
    }
}


window.emergencyCleanup = function() {
    console.log('🚨 CLEANUP DI EMERGENZA ATTIVATO');
    
    // Ferma tutti i refresh
    if (window.dashboardManager && window.dashboardManager.refreshInterval) {
        clearInterval(window.dashboardManager.refreshInterval);
        console.log('⏹️ Dashboard refresh fermato');
    }
    
    // Pulisci tutti i listeners
    forceCleanupAllListeners();
    
    // Svuota cache
    usersCache = null;
    allUsers = [];
    
    console.log('✅ Cleanup di emergenza completato');
};

window.checkDataUsage = function() {
    console.log('📊 REPORT CONSUMO DATI:');
    console.log('- Operazioni lettura:', dataTransferLog.reads);
    console.log('- Operazioni scrittura:', dataTransferLog.writes);
    console.log('- Tempo sessione:', Math.round((Date.now() - dataTransferLog.lastReset) / 1000), 'secondi');
    console.log('- Listeners attivi messaggi:', Object.keys(messageListeners).length);
    console.log('- Listeners attivi thread:', Object.keys(threadListeners).length);
    console.log('- Cache utenti attiva:', !!usersCache);
};

console.log('🚀 Ottimizzazioni Firebase caricate - consumo dati ridotto drasticamente!');