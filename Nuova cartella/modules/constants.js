// constants.js - Costanti dell'applicazione

// Ruoli utente
window.USER_ROLES = {
    SUPERUSER: 'superuser',
    CLAN_MOD: 'clan_mod',
    USER: 'user'
};

// Configurazione sezioni
window.SECTION_CONFIG = {
    'home': {
        title: '🏠 Dashboard',
        description: 'Benvenuto nel Forum di Hustle Castle! Ecco le ultime novità',
        type: 'dashboard'
    },
    'eventi': {
        title: '📅 Eventi',
        description: 'Scopri tutti gli eventi in corso e futuri di Hustle Castle',
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
    'admin-users': {
        title: '👥 Gestione Utenti',
        description: 'Pannello amministrativo per gestire utenti e clan',
        type: 'admin',
        requiredRole: window.USER_ROLES.SUPERUSER
    },
    'admin-clans': {
        title: '🏰 Gestione Clan',
        description: 'Creazione e gestione dei clan',
        type: 'admin',
        requiredRole: window.USER_ROLES.SUPERUSER
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

// Tipi di notifica
window.NOTIFICATION_TYPES = {
    NEW_MESSAGE: 'new_message',
    NEW_THREAD: 'new_thread',
    THREAD_APPROVED: 'thread_approved',
    THREAD_REJECTED: 'thread_rejected',
    PENDING_MODERATION: 'pending_moderation',
    CLAN_INVITE: 'clan_invite',
    SYSTEM: 'system'
};

// Configurazione notifiche per sezione
window.NOTIFICATION_SECTIONS = {
    'chat-generale': {
        badge: 'chatGeneraleBadge',
        storageKey: 'lastSeen_chat_generale',
        type: window.NOTIFICATION_TYPES.NEW_MESSAGE
    },
    'clan-chat': {
        badge: 'clanChatBadge',
        storageKey: 'lastSeen_clan_chat',
        type: window.NOTIFICATION_TYPES.NEW_MESSAGE
    },
    'clan-moderation': {
        badge: 'moderationBadge',
        storageKey: 'lastSeen_moderation',
        type: window.NOTIFICATION_TYPES.PENDING_MODERATION
    }
};

// Consigli del giorno
window.DAILY_TIPS = [
    {
        icon: '⚔️',
        title: 'Strategia di Combattimento',
        content: 'Bilancia sempre la tua formazione: un tank robusto, DPS equilibrati e un supporto possono fare la differenza in arena!'
    },
    {
        icon: '🏰',
        title: 'Gestione del Castello',
        content: 'Aggiorna sempre la sala del trono prima di potenziare altre stanze per massimizzare l\'efficienza delle risorse.'
    },
    {
        icon: '💎',
        title: 'Gemme e Equipaggiamento',
        content: 'Non vendere mai le gemme leggendarie! Anche se sembrano deboli ora, potrebbero essere utili per upgrade futuri.'
    },
    {
        icon: '🎯',
        title: 'Eventi Speciali',
        content: 'Partecipa sempre agli eventi temporanei: spesso offrono ricompense uniche che non puoi ottenere altrove!'
    },
    {
        icon: '👥',
        title: 'Vita di Clan',
        content: 'Coordina sempre con il tuo clan prima delle guerre. La comunicazione è la chiave per la vittoria!'
    },
    {
        icon: '📈',
        title: 'Progressione Intelligente',
        content: 'Non avere fretta di salire di Throne Room. Assicurati di avere equipaggiamento e truppe adeguate al tuo livello.'
    },
    {
        icon: '🛡️',
        title: 'Difesa del Castello',
        content: 'Posiziona strategicamente le tue difese: mescola danni fisici e magici per contrastare diversi tipi di attacco.'
    },
    {
        icon: '⏰',
        title: 'Gestione del Tempo',
        content: 'Ottimizza i tempi di training: inizia sempre con le truppe che richiedono più tempo prima di andare offline.'
    },
    {
        icon: '🏆',
        title: 'Arena e PvP',
        content: 'Studia sempre gli avversari prima di attaccare. Una strategia ben pianificata vale più della forza bruta!'
    },
    {
        icon: '💰',
        title: 'Economia del Gioco',
        content: 'Investi le gemme saggiamente: priorità a slot di barracks, mastro e velocizzazione di upgrade critici.'
    }
];

// Utenti di esempio per modalità locale
window.EXAMPLE_USERS = {
    'admin@hustlecastle.com': {
        uid: 'super_admin_001',
        username: 'SuperAdmin',
        password: 'admin123',
        clan: 'Nessuno',
        role: window.USER_ROLES.SUPERUSER,
        createdAt: Date.now()
    },
    'mod@draghi.com': {
        uid: 'clan_mod_001',
        username: 'ModeratoreDraghi',
        password: 'mod123',
        clan: 'Draghi Rossi',
        role: window.USER_ROLES.CLAN_MOD,
        createdAt: Date.now()
    },
    'player@leoni.com': {
        uid: 'user_001',
        username: 'GiocatoreLeoni',
        password: 'player123',
        clan: 'Leoni Neri',
        role: window.USER_ROLES.USER,
        createdAt: Date.now()
    }
};

// Configurazione update intervals
window.UPDATE_INTERVALS = {
    NOTIFICATIONS_CHECK: 30000, // 30 secondi
    LAST_SEEN_UPDATE: 10000,    // 10 secondi
    CONNECTION_STATUS: 5000      // 5 secondi
};

console.log('📋 Constants loaded');