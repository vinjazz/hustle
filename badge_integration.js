// ===============================================
// BADGE INTEGRATION - INTEGRAZIONI PER SCRIPT.JS
// ===============================================

/**
 * Questo file contiene le modifiche da applicare al script.js esistente
 * per integrare il sistema badge con il framework esistente.
 * 
 * ISTRUZIONI DI INSTALLAZIONE:
 * 1. Aggiungi badge_system.js come script
 * 2. Aggiungi badge_manager.css come stylesheet
 * 3. Applica le modifiche qui sotto al tuo script.js esistente
 */

// ===============================================
// 1. MODIFICHE ALLA FUNZIONE handleUserLogin
// ===============================================

// TROVA QUESTA FUNZIONE NEL TUO script.js E AGGIUNGI IL CODICE EVIDENZIATO:

/*
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
    
    // ✅ AGGIUNGI QUESTE RIGHE:
    // Trigger evento per badge system
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userLoggedIn', {
            detail: { user: user }
        }));
    }, 2000); // Delay per permettere il caricamento completo
}
*/

// ===============================================
// 2. MODIFICHE ALLA FUNZIONE handleUserLogout
// ===============================================

// TROVA QUESTA FUNZIONE E AGGIUNGI IL CODICE EVIDENZIATO:

/*
function handleUserLogout() {
    console.log('👤 Utente disconnesso');
    
    // CODICE ESISTENTE...
    
    // ✅ AGGIUNGI QUESTA RIGA ALLA FINE:
    // Trigger evento per badge system
    document.dispatchEvent(new CustomEvent('userLoggedOut'));
}
*/

// ===============================================
// 3. MODIFICHE ALLA FUNZIONE switchSection
// ===============================================

// TROVA QUESTA FUNZIONE E AGGIUNGI IL CODICE EVIDENZIATO:

/*
function switchSection(sectionKey) {
    const section = sectionConfig[sectionKey];
    if (!section) return;

    // Controlla accesso alla sezione
    if (!canAccessSection(sectionKey)) {
        // CODICE ESISTENTE PER CONTROLLO ACCESSI...
        return;
    }

    // CODICE ESISTENTE...
    
    currentSection = sectionKey;
    
    // ✅ AGGIUNGI QUESTE RIGHE DOPO currentSection = sectionKey:
    // Trigger evento per badge system
    document.dispatchEvent(new CustomEvent('sectionChanged', {
        detail: { sectionKey: sectionKey }
    }));

    // RESTO DEL CODICE ESISTENTE...
}
*/

// ===============================================
// 4. HELPER FUNCTIONS AGGIUNTIVE
// ===============================================

// AGGIUNGI QUESTE FUNZIONI HELPER AL TUO script.js:

// Helper per gestire l'aggiunta di classi badge ai nav items
function updateNavItemBadgeClass(sectionKey, hasBadge) {
    const navItem = document.querySelector(`[data-section="${sectionKey}"]`);
    if (navItem) {
        if (hasBadge) {
            navItem.classList.add('has-badge');
        } else {
            navItem.classList.remove('has-badge');
        }
    }
}

// Estendi la funzione esistente di badge system per includere classi CSS
if (window.badgeSystem) {
    const originalAddBadge = window.badgeSystem.addBadge;
    const originalRemoveBadge = window.badgeSystem.removeBadge;
    
    window.badgeSystem.addBadge = function(sectionKey, count) {
        originalAddBadge.call(this, sectionKey, count);
        updateNavItemBadgeClass(sectionKey, true);
        
        // Aggiungi classe appropriata basata sul conteggio
        const badge = document.querySelector(`.section-badge[data-section="${sectionKey}"]`);
        if (badge && count >= 10) {
            badge.classList.add('badge-double-digit');
        }
        if (badge && count >= 99) {
            badge.classList.add('badge-high-count');
        }
    };
    
    window.badgeSystem.removeBadge = function(sectionKey) {
        originalRemoveBadge.call(this, sectionKey);
        updateNavItemBadgeClass(sectionKey, false);
    };
}

// ===============================================
// 5. INTEGRAZIONE CON SISTEMA MESSAGGI ESISTENTE
// ===============================================

// TROVA LA FUNZIONE saveLocalMessage E AGGIUNGI QUESTO ALLA FINE:

/*
function saveLocalMessage(section, messageData) {
    // CODICE ESISTENTE...
    
    // ✅ AGGIUNGI QUESTE RIGHE ALLA FINE:
    // Notifica al badge system che c'è un nuovo messaggio
    setTimeout(() => {
        if (window.badgeSystem && window.badgeSystem.isInitialized) {
            window.badgeSystem.refreshSectionBadge(section);
        }
    }, 500);
}
*/

// ===============================================
// 6. INTEGRAZIONE CON SISTEMA THREAD ESISTENTE
// ===============================================

// TROVA LA FUNZIONE saveLocalThread E AGGIUNGI QUESTO ALLA FINE:

/*
function saveLocalThread(section, threadData) {
    // CODICE ESISTENTE...
    
    // ✅ AGGIUNGI QUESTE RIGHE ALLA FINE:
    // Notifica al badge system che c'è un nuovo thread
    setTimeout(() => {
        if (window.badgeSystem && window.badgeSystem.isInitialized) {
            window.badgeSystem.refreshSectionBadge(section);
        }
    }, 500);
}
*/

// ===============================================
// 7. FUNZIONI DI UTILITÀ GLOBALI
// ===============================================

// AGGIUNGI QUESTE FUNZIONI GLOBALI AL TUO script.js:

// Funzione per mostrare badge di test (utile per debug)
window.showTestBadges = function() {
    if (!window.badgeSystem) {
        console.log('❌ Badge system non disponibile');
        return;
    }
    
    const testBadges = {
        'eventi': 3,
        'chat-generale': 15,
        'novita': 1,
        'clan-chat': 8,
        'clan-war': 2
    };
    
    Object.entries(testBadges).forEach(([section, count]) => {
        const badge = document.createElement('span');
        badge.className = 'section-badge badge-test';
        badge.textContent = count;
        badge.setAttribute('data-section', section);
        
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (navItem) {
            // Rimuovi badge esistenti
            navItem.querySelectorAll('.section-badge').forEach(b => b.remove());
            navItem.appendChild(badge);
            navItem.classList.add('has-badge');
        }
    });
    
    console.log('🧪 Badge di test mostrati');
    
    // Rimuovi dopo 10 secondi
    setTimeout(() => {
        document.querySelectorAll('.badge-test').forEach(badge => {
            badge.parentNode.classList.remove('has-badge');
            badge.remove();
        });
        console.log('🧹 Badge di test rimossi');
    }, 10000);
};

// Funzione per forzare l'aggiornamento di tutti i badge
window.forceBadgeRefresh = function() {
    if (window.badgeSystem && window.badgeSystem.isInitialized) {
        window.badgeSystem.refreshAllBadges();
        console.log('🔄 Badge aggiornati forzatamente');
    } else {
        console.log('❌ Badge system non inizializzato');
    }
};

// Funzione per resettare il tracking delle visite
window.resetVisitTracking = function() {
    if (!confirm('⚠️ Vuoi resettare il tracking delle visite? Tutti i badge riappariranno.')) {
        return;
    }
    
    if (window.badgeSystem && window.badgeSystem.isInitialized) {
        window.badgeSystem.lastVisitData = { lastLogin: Date.now() };
        window.badgeSystem.saveLastVisitData();
        window.badgeSystem.refreshAllBadges();
        console.log('🔄 Tracking visite resettato');
    }
};

// ===============================================
// 8. MIGLIORAMENTI PERFORMANCE
// ===============================================

// Debounce per aggiornamenti badge frequenti
let badgeUpdateTimeout;
function debouncedBadgeUpdate(sectionKey) {
    clearTimeout(badgeUpdateTimeout);
    badgeUpdateTimeout = setTimeout(() => {
        if (window.badgeSystem && window.badgeSystem.isInitialized) {
            window.badgeSystem.refreshSectionBadge(sectionKey);
        }
    }, 1000);
}

// ===============================================
// 9. OBSERVER PER MODIFICHE DOM
// ===============================================

// Observer per rilevare quando vengono aggiunti nuovi elementi nav
const navObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && 
                node.classList && node.classList.contains('nav-item')) {
                
                // Nuovo nav item aggiunto, potrebbe essere necessario un badge
                const sectionKey = node.getAttribute('data-section');
                if (sectionKey && window.badgeSystem && window.badgeSystem.isInitialized) {
                    setTimeout(() => {
                        window.badgeSystem.refreshSectionBadge(sectionKey);
                    }, 100);
                }
            }
        });
    });
});

// Inizia l'osservazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        navObserver.observe(sidebar, {
            childList: true,
            subtree: true
        });
    }
});

// ===============================================
// 10. INTEGRAZIONE CON NOTIFICHE ESISTENTI
// ===============================================

// Se esiste il sistema notifiche, integralo con i badge
if (window.notificationsData) {
    // Aggiungi badge speciali per notifiche non lette
    function updateNotificationBadges() {
        if (!window.badgeSystem || !window.badgeSystem.isInitialized) return;
        
        // Conta notifiche per sezione
        const sectionNotifications = {};
        
        window.notificationsData.forEach(notification => {
            if (!notification.read && notification.section) {
                sectionNotifications[notification.section] = 
                    (sectionNotifications[notification.section] || 0) + 1;
            }
        });
        
        // Aggiungi badge per notifiche
        Object.entries(sectionNotifications).forEach(([section, count]) => {
            if (count > 0) {
                // Aggiungi badge speciale per notifiche
                const existingBadge = window.badgeSystem.getBadgeCount(section);
                const totalCount = existingBadge + count;
                
                // Rimuovi badge esistente e aggiungi quello combinato
                window.badgeSystem.removeBadge(section);
                window.badgeSystem.addBadge(section, totalCount);
                
                // Aggiungi classe speciale per notifiche
                const badge = document.querySelector(`.section-badge[data-section="${section}"]`);
                if (badge) {
                    badge.classList.add('badge-urgent');
                }
            }
        });
    }
    
    // Aggiorna badge notifiche quando cambiano
    document.addEventListener('notificationsUpdated', updateNotificationBadges);
}

// ===============================================
// 11. LOG E DEBUG
// ===============================================

console.log('🏷️ Badge Integration loaded');

// Funzione di debug completa
window.debugBadgeIntegration = function() {
    console.log('🏷️ === DEBUG BADGE INTEGRATION ===');
    console.log('🔧 Badge System disponibile:', !!window.badgeSystem);
    console.log('🔧 Badge System inizializzato:', window.badgeSystem?.isInitialized);
    console.log('🏷️ Badge nel DOM:', document.querySelectorAll('.section-badge').length);
    console.log('📊 Nav items con badge:', document.querySelectorAll('.nav-item.has-badge').length);
    
    if (window.badgeSystem) {
        const stats = window.badgeSystem.getStats();
        console.log('📈 Statistiche badge:', stats);
    }
    
    // Test elementi DOM necessari
    const requiredElements = ['[data-section="eventi"]', '[data-section="chat-generale"]', '.sidebar'];
    requiredElements.forEach(selector => {
        const element = document.querySelector(selector);
        console.log(`🎯 ${selector}:`, element ? '✅ Trovato' : '❌ Non trovato');
    });
};

// Auto-debug se in modalità development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugBadgeIntegration();
}