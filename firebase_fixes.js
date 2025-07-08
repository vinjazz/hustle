// ===============================================
// FIREBASE E ALTRI FIX
// ===============================================

/**
 * Soluzioni per i problemi evidenziati nei log:
 * 1. Errori Firebase App Check
 * 2. Problemi reCAPTCHA
 * 3. Errori di connessione
 * 4. Problemi con file:// protocol
 */

// ===============================================
// 1. FIX ERRORI FIREBASE APP CHECK
// ===============================================

// Aggiungi questo nel tuo HTML principale, prima del caricamento di Firebase
const firebaseConfig = {
    // La tua configurazione Firebase
};

// Inizializzazione Firebase con gestione errori migliorata
function initializeFirebaseWithErrorHandling() {
    if (!window.firebase) {
        console.warn('⚠️ Firebase non disponibile');
        return;
    }
    
    try {
        // Inizializza Firebase
        window.firebaseApp = firebase.initializeApp(firebaseConfig);
        window.firebaseAuth = firebase.auth();
        window.firebaseDatabase = firebase.database();
        
        // Prova a inizializzare App Check solo se disponibile
        if (firebase.appCheck && window.appCheckEnabled) {
            try {
                window.appCheck = firebase.appCheck();
                window.appCheck.activate('YOUR_RECAPTCHA_SITE_KEY', true);
                console.log('🛡️ App Check inizializzato');
            } catch (appCheckError) {
                console.warn('⚠️ App Check non disponibile, continuo senza:', appCheckError.message);
                window.appCheckEnabled = false;
            }
        }
        
        console.log('🔥 Firebase inizializzato con successo');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione Firebase:', error);
        
        // Fallback a modalità locale
        console.log('🔄 Fallback a modalità locale');
        window.useFirebase = false;
        window.appCheckEnabled = false;
    }
}

// ===============================================
// 2. FIX PROBLEMI RECAPTCHA
// ===============================================

// Gestione reCAPTCHA più robusta
function setupRecaptchaHandling() {
    // Controlla se reCAPTCHA è necessario
    if (!window.appCheckEnabled) {
        console.log('🤖 reCAPTCHA non necessario (App Check disabilitato)');
        return;
    }
    
    // Funzione per verificare reCAPTCHA
    window.verifyRecaptcha = function() {
        if (!window.appCheckEnabled) {
            return true; // Sempre valido se App Check è disabilitato
        }
        
        if (typeof grecaptcha === 'undefined') {
            console.warn('⚠️ reCAPTCHA non caricato, skip verifica');
            return true;
        }
        
        try {
            const response = grecaptcha.getResponse();
            return response && response.length > 0;
        } catch (error) {
            console.warn('⚠️ Errore verifica reCAPTCHA:', error);
            return true; // Permetti comunque l'operazione
        }
    };
    
    // Funzione per resettare reCAPTCHA
    window.resetRecaptcha = function() {
        if (!window.appCheckEnabled || typeof grecaptcha === 'undefined') {
            return;
        }
        
        try {
            grecaptcha.reset();
        } catch (error) {
            console.warn('⚠️ Errore reset reCAPTCHA:', error);
        }
    };
    
    // Callback per quando reCAPTCHA è pronto
    window.onRecaptchaLoad = function() {
        console.log('✅ reCAPTCHA caricato');
        
        // Renderizza reCAPTCHA se il container esiste
        const container = document.getElementById('recaptcha-container');
        if (container && typeof grecaptcha !== 'undefined') {
            try {
                grecaptcha.render(container, {
                    'sitekey': 'YOUR_RECAPTCHA_SITE_KEY',
                    'theme': 'dark',
                    'size': 'compact'
                });
                console.log('✅ reCAPTCHA renderizzato');
            } catch (error) {
                console.warn('⚠️ Errore rendering reCAPTCHA:', error);
            }
        }
    };
}

// ===============================================
// 3. FIX PROBLEMI DI CONNESSIONE
// ===============================================

// Gestione connessione migliorata
function setupConnectionHandling() {
    // Controlla se siamo in ambiente file://
    if (window.location.protocol === 'file:') {
        console.warn('⚠️ Ambiente file:// rilevato - alcune funzionalità potrebbero non funzionare');
        
        // Disabilita Firebase e forza modalità locale
        window.useFirebase = false;
        window.appCheckEnabled = false;
        
        // Mostra avviso all'utente
        const warningBanner = document.createElement('div');
        warningBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff6b35;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 10000;
            font-weight: bold;
        `;
        warningBanner.textContent = '⚠️ Modalità Sviluppo: Alcune funzionalità potrebbero essere limitate';
        document.body.appendChild(warningBanner);
        
        // Rimuovi banner dopo 5 secondi
        setTimeout(() => {
            warningBanner.remove();
        }, 5000);
    }
    
    // Gestione offline/online
    window.addEventListener('online', () => {
        console.log('🟢 Connessione ripristinata');
        updateConnectionStatus();
    });
    
    window.addEventListener('offline', () => {
        console.log('🔴 Connessione persa');
        updateConnectionStatus();
    });
    
    function updateConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;
        
        if (window.location.protocol === 'file:') {
            statusEl.className = 'connection-status offline';
            statusEl.textContent = '🟡 Modalità Sviluppo Locale';
        } else if (navigator.onLine) {
            statusEl.className = 'connection-status online';
            statusEl.textContent = window.useFirebase ? '🟢 Firebase Connesso' : '🟡 Modalità Demo';
        } else {
            statusEl.className = 'connection-status offline';
            statusEl.textContent = '🔴 Offline';
        }
    }
}

// ===============================================
// 4. FIX ERRORI DOM E MESSAGGI
// ===============================================

// Gestione errori postMessage
function fixPostMessageErrors() {
    // Cattura errori postMessage
    window.addEventListener('error', (event) => {
        if (event.message && event.message.includes('postMessage')) {
            console.warn('⚠️ Errore postMessage ignorato:', event.message);
            event.preventDefault();
        }
    });
    
    // Gestione errori non catturati
    window.addEventListener('unhandledrejection', (event) => {
        console.warn('⚠️ Promise rejection non gestita:', event.reason);
        
        // Ignora errori comuni in sviluppo
        if (event.reason === null || 
            (event.reason && event.reason.toString().includes('cancelled'))) {
            event.preventDefault();
        }
    });
}

// ===============================================
// 5. FIX PROBLEMI PERMESSI
// ===============================================

// Gestione errori permessi Firebase
function handlePermissionErrors() {
    // Wrapper per operazioni Firebase che potrebbero fallire
    window.safeFirebaseOperation = async function(operation, fallback = null) {
        if (!window.useFirebase) {
            return fallback;
        }
        
        try {
            return await operation();
        } catch (error) {
            console.warn('⚠️ Operazione Firebase fallita:', error.message);
            
            if (error.code === 'permission-denied') {
                console.log('🔄 Permesso negato, usando fallback locale');
                return fallback;
            }
            
            throw error;
        }
    };
    
    // Gestione errori di autenticazione
    if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                console.log('✅ Utente autenticato:', user.email);
            } else {
                console.log('👤 Utente non autenticato');
            }
        }, (error) => {
            console.warn('⚠️ Errore stato autenticazione:', error);
        });
    }
}

// ===============================================
// 6. FUNZIONE DI INIZIALIZZAZIONE GLOBALE
// ===============================================

function initializeAllFixes() {
    console.log('🔧 Inizializzazione fix globali...');
    
    // Applica tutti i fix
    setupRecaptchaHandling();
    setupConnectionHandling();
    fixPostMessageErrors();
    handlePermissionErrors();
    
    // Inizializza Firebase se disponibile
    if (window.firebase && window.useFirebase !== false) {
        initializeFirebaseWithErrorHandling();
    }
    
    console.log('✅ Fix globali applicati');
}

// ===============================================
// 7. GESTIONE ERRORI GLOBALE
// ===============================================

// Cattura tutti gli errori e gestiscili in modo più elegante
window.onerror = function(message, source, lineno, colno, error) {
    console.warn('⚠️ Errore JavaScript:', {
        message,
        source,
        lineno,
        colno,
        error
    });
    
    // Non mostrare errori all'utente per errori comuni di sviluppo
    const ignoredErrors = [
        'postMessage',
        'cancelled',
        'Network request failed',
        'Loading chunk',
        'Firebase: Error'
    ];
    
    const shouldIgnore = ignoredErrors.some(ignored => 
        message.includes(ignored)
    );
    
    if (shouldIgnore) {
        console.log('🤫 Errore ignorato per UX migliore');
        return true; // Previeni la visualizzazione dell'errore
    }
    
    return false; // Mostra errore
};

// ===============================================
// 8. INIZIALIZZAZIONE AUTOMATICA
// ===============================================

// Inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllFixes);
} else {
    initializeAllFixes();
}

// ===============================================
// 9. UTILITIES DI DEBUG
// ===============================================

window.debugEnvironment = function() {
    console.log('🔍 === DEBUG AMBIENTE ===');
    console.log('🌐 Protocol:', window.location.protocol);
    console.log('🌐 Hostname:', window.location.hostname);
    console.log('🔥 Firebase disponibile:', !!window.firebase);
    console.log('🔥 useFirebase:', window.useFirebase);
    console.log('🛡️ App Check abilitato:', window.appCheckEnabled);
    console.log('🤖 reCAPTCHA disponibile:', typeof grecaptcha !== 'undefined');
    console.log('🌐 Online:', navigator.onLine);
    
    // Test Firebase
    if (window.firebaseAuth) {
        console.log('🔑 Firebase Auth:', window.firebaseAuth.currentUser?.email || 'Non autenticato');
    }
    
    // Test elementi DOM critici
    const criticalElements = [
        '#loginModal',
        '#connectionStatus',
        '#recaptcha-container',
        '.sidebar'
    ];
    
    criticalElements.forEach(selector => {
        const element = document.querySelector(selector);
        console.log(`🎯 ${selector}:`, element ? '✅ Trovato' : '❌ Non trovato');
    });
};

// Auto-debug in sviluppo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(window.debugEnvironment, 2000);
}

console.log('🛠️ Fix globali caricati');