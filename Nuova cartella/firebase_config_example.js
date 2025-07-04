// firebase-config.example.js
// Copia questo file in firebase-config.js e inserisci le tue credenziali Firebase

/**
 * Configurazione Firebase per Hustle Castle Forum
 * 
 * ISTRUZIONI SETUP:
 * 1. Vai su https://console.firebase.google.com
 * 2. Crea un nuovo progetto o seleziona uno esistente
 * 3. Vai su "Impostazioni progetto" > "Le tue app"
 * 4. Aggiungi un'app web e copia la configurazione qui sotto
 * 5. Rinomina questo file in "firebase-config.js"
 */

const firebaseConfig = {
	apiKey: "AIzaSyBBIZREPP0O7v9HtsJN8GLLQtJLJJ78HHU",
    authDomain: "hustle-castle-forum.firebaseapp.com",
    databaseURL: "https://hustle-castle-forum-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hustle-castle-forum",
    storageBucket: "hustle-castle-forum.firebasestorage.app",
    messagingSenderId: "565750889095",
    appId: "1:565750889095:web:b729664dbdf9f8665d5622",
    measurementId: "G-YEVKWHH4QX"
};

/**
 * Configurazioni aggiuntive per il forum
 */
const forumConfig = {
    // Configurazioni database
    database: {
        // Regione del database (es: 'europe-west1', 'us-central1')
        region: 'europe-west1',
        
        // Timeout per operazioni database (ms)
        timeout: 10000,
        
        // Abilita persistenza offline
        enableOfflinePersistence: true
    },
    
    // Configurazioni autenticazione
    auth: {
        // Provider di autenticazione abilitati
        enabledProviders: ['email', 'google'],
        
        // Dominio per email link (se implementato in futuro)
        emailLinkDomain: 'your-domain.com',
        
        // Configurazioni password
        passwordRequirements: {
            minLength: 6,
            requireNumbers: false,
            requireSymbols: false,
            requireUppercase: false
        }
    },
    
    // Configurazioni notifiche
    notifications: {
        // Intervallo controllo notifiche (ms)
        checkInterval: 30000,
        
        // Durata popup notifiche (ms)
        popupDuration: 5000,
        
        // Numero massimo notifiche salvate
        maxStoredNotifications: 100
    },
    
    // Configurazioni chat
    chat: {
        // Limite caratteri messaggio
        maxMessageLength: 1000,
        
        // Rate limiting: millisecondi tra messaggi
        messageRateLimit: 2000,
        
        // Numero massimo messaggi caricati inizialmente
        initialLoadLimit: 50
    },
    
    // Configurazioni forum
    forum: {
        // Limite caratteri titolo thread
        maxTitleLength: 200,
        
        // Limite caratteri contenuto thread
        maxContentLength: 5000,
        
        // Limite caratteri commento
        maxCommentLength: 2000,
        
        // Thread per pagina (se implementata paginazione)
        threadsPerPage: 20
    },
    
    // Configurazioni admin
    admin: {
        // Abilita esportazione dati
        enableDataExport: true,
        
        // Abilita statistiche avanzate
        enableAdvancedStats: true,
        
        // Intervallo backup automatico (ore)
        autoBackupInterval: 24
    }
};

/**
 * Validazione configurazione
 */
function validateFirebaseConfig() {
    const required = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
    const missing = required.filter(key => !firebaseConfig[key] || firebaseConfig[key].includes('your-project'));
    
    if (missing.length > 0) {
        console.warn('⚠️ Configurazione Firebase incompleta:', missing);
        console.warn('📖 Leggi firebase-config.example.js per istruzioni setup');
        return false;
    }
    
    return true;
}

/**
 * Inizializzazione configurazioni
 */
function initializeConfigurations() {
    // Valida configurazione Firebase
    if (!validateFirebaseConfig()) {
        console.warn('🔥 Firebase configurazione non valida - modalità demo attiva');
        return false;
    }
    
    // Applica configurazioni forum
    if (window.Utils && window.Utils.setConfig) {
        window.Utils.setConfig(forumConfig);
    }
    
    console.log('✅ Configurazioni inizializzate correttamente');
    return true;
}

// Esporta configurazioni
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        firebaseConfig,
        forumConfig,
        validateFirebaseConfig,
        initializeConfigurations
    };
} else {
    // Browser environment
    window.firebaseConfig = firebaseConfig;
    window.forumConfig = forumConfig;
    window.validateFirebaseConfig = validateFirebaseConfig;
    window.initializeConfigurations = initializeConfigurations;
}

/**
 * REGOLE DI SICUREZZA FIREBASE DATABASE CONSIGLIATE:
 * 
 * Vai su Firebase Console > Database > Regole e incolla:
 * 
 * {
 *   "rules": {
 *     "users": {
 *       "$uid": {
 *         ".read": "auth != null",
 *         ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'superuser'"
 *       }
 *     },
 *     "messages": {
 *       "general": {
 *         ".read": "auth != null",
 *         ".write": "auth != null && auth.token.email_verified === true"
 *       },
 *       "clan": {
 *         "$clanName": {
 *           "$section": {
 *             ".read": "auth != null && root.child('users').child(auth.uid).child('clan').val() === $clanName",
 *             ".write": "auth != null && root.child('users').child(auth.uid).child('clan').val() === $clanName"
 *           }
 *         }
 *       }
 *     },
 *     "threads": {
 *       "general": {
 *         ".read": "auth != null",
 *         ".write": "auth != null && auth.token.email_verified === true"
 *       },
 *       "clan": {
 *         "$clanName": {
 *           "$section": {
 *             ".read": "auth != null && root.child('users').child(auth.uid).child('clan').val() === $clanName",
 *             ".write": "auth != null && root.child('users').child(auth.uid).child('clan').val() === $clanName"
 *           }
 *         }
 *       }
 *     },
 *     "comments": {
 *       "$section": {
 *         "$threadId": {
 *           ".read": "auth != null",
 *           ".write": "auth != null && auth.token.email_verified === true"
 *         }
 *       }
 *     },
 *     "presence": {
 *       "$uid": {
 *         ".read": "auth != null",
 *         ".write": "$uid === auth.uid"
 *       }
 *     },
 *     ".read": false,
 *     ".write": false
 *   }
 * }
 * 
 * CONFIGURAZIONE AUTHENTICATION:
 * 
 * 1. Abilita Email/Password:
 *    - Vai su Authentication > Sign-in method
 *    - Abilita "Email/Password"
 *    - Abilita "Email link (passwordless sign-in)" se desiderato
 * 
 * 2. Abilita Google Sign-In:
 *    - Abilita "Google" 
 *    - Configura OAuth consent screen
 *    - Aggiungi domini autorizzati
 * 
 * 3. Configura domini autorizzati:
 *    - Aggiungi il tuo dominio in "Authorized domains"
 *    - Per testing locale: localhost
 * 
 * CONFIGURAZIONE REALTIME DATABASE:
 * 
 * 1. Crea database in modalità test
 * 2. Scegli regione (consigliata: europe-west1 per EU)
 * 3. Applica regole di sicurezza sopra riportate
 * 4. Considera upgrade a piano Blaze per produzione
 * 
 * PERFORMANCE TIPS:
 * 
 * 1. Usa indici per query frequenti
 * 2. Limita profondità dati con regole
 * 3. Implementa paginazione per liste lunghe
 * 4. Considera Cloud Functions per logica server-side
 * 
 * BACKUP E MONITORING:
 * 
 * 1. Configura backup automatici
 * 2. Imposta alerting per quota utilizzo
 * 3. Monitora performance con Analytics
 * 4. Configura Error Reporting
 */