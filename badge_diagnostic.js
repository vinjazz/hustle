// ===============================================
// BADGE SYSTEM DIAGNOSTIC
// ===============================================

/**
 * Script di diagnostica rapida per verificare lo stato del Badge System
 * Esegui questo nella console per verificare tutto rapidamente
 */

function runBadgeSystemDiagnostic() {
    console.log('%c🏷️ === BADGE SYSTEM DIAGNOSTIC ===', 'color: #3498db; font-weight: bold; font-size: 16px;');
    
    const results = {
        scripts: checkScriptsLoaded(),
        prerequisites: checkPrerequisites(),
        initialization: checkInitialization(),
        integration: checkIntegration(),
        dom: checkDOMElements(),
        functionality: checkFunctionality()
    };
    
    // Riassunto finale
    const totalChecks = Object.values(results).reduce((sum, result) => sum + result.total, 0);
    const passedChecks = Object.values(results).reduce((sum, result) => sum + result.passed, 0);
    const percentage = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`\n📊 RIASSUNTO: ${passedChecks}/${totalChecks} controlli superati (${percentage}%)`);
    
    if (percentage >= 90) {
        console.log('%c✅ Sistema Badge funzionante correttamente!', 'color: #27ae60; font-weight: bold;');
    } else if (percentage >= 70) {
        console.log('%c⚠️ Sistema Badge parzialmente funzionante', 'color: #f39c12; font-weight: bold;');
    } else {
        console.log('%c❌ Sistema Badge ha problemi significativi', 'color: #e74c3c; font-weight: bold;');
    }
    
    // Suggerimenti
    provideSuggestions(results);
    
    return results;
}

function checkScriptsLoaded() {
    console.log('\n🔧 === CONTROLLO SCRIPT CARICATI ===');
    
    const checks = {
        'Badge System': !!window.badgeSystem,
        'Badge Integration': !!window.badgeIntegrationLoaded,
        'Section Config': !!window.sectionConfig,
        'Firebase (se usato)': window.useFirebase ? !!window.firebase : true
    };
    
    let passed = 0;
    Object.entries(checks).forEach(([name, result]) => {
        console.log(`${result ? '✅' : '❌'} ${name}: ${result ? 'Caricato' : 'Non trovato'}`);
        if (result) passed++;
    });
    
    return { passed, total: Object.keys(checks).length };
}

function checkPrerequisites() {
    console.log('\n📋 === CONTROLLO PREREQUISITI ===');
    
    const checks = {
        'window.badgeSystem': !!window.badgeSystem,
        'window.sectionConfig': !!window.sectionConfig,
        'window.getCurrentUserClan': typeof window.getCurrentUserClan === 'function',
        'window.updateNavItemBadgeClass': typeof window.updateNavItemBadgeClass === 'function',
        'window.debouncedBadgeUpdate': typeof window.debouncedBadgeUpdate === 'function'
    };
    
    let passed = 0;
    Object.entries(checks).forEach(([name, result]) => {
        console.log(`${result ? '✅' : '❌'} ${name}: ${result ? 'Disponibile' : 'Mancante'}`);
        if (result) passed++;
    });
    
    return { passed, total: Object.keys(checks).length };
}

function checkInitialization() {
    console.log('\n🚀 === CONTROLLO INIZIALIZZAZIONE ===');
    
    const checks = {
        'Badge System inizializzato': window.badgeSystem?.isInitialized || false,
        'Badge System esteso': window.badgeSystem?._extended || false,
        'Badge Integration caricato': !!window.badgeIntegrationLoaded,
        'Utente corrente presente': !!window.currentUser
    };
    
    let passed = 0;
    Object.entries(checks).forEach(([name, result]) => {
        console.log(`${result ? '✅' : '⚠️'} ${name}: ${result ? 'Sì' : 'No'}`);
        if (result) passed++;
    });
    
    return { passed, total: Object.keys(checks).length };
}

function checkIntegration() {
    console.log('\n🔗 === CONTROLLO INTEGRAZIONI ===');
    
    const checks = {
        'sendMessage integrata': window.sendMessage?._badgeIntegrated || false,
        'createThread integrata': window.createThread?._badgeIntegrated || false,
        'addComment integrata': window.addComment?._badgeIntegrated || false,
        'Event listeners attivi': document._badgeEventListenersActive || false
    };
    
    let passed = 0;
    Object.entries(checks).forEach(([name, result]) => {
        console.log(`${result ? '✅' : '⚠️'} ${name}: ${result ? 'Sì' : 'No'}`);
        if (result) passed++;
    });
    
    return { passed, total: Object.keys(checks).length };
}

function checkDOMElements() {
    console.log('\n🎯 === CONTROLLO ELEMENTI DOM ===');
    
    const elements = {
        'Sidebar': '.sidebar',
        'Nav items': '.nav-item',
        'Sezione eventi': '[data-section="eventi"]',
        'Sezione chat generale': '[data-section="chat-generale"]',
        'Badge esistenti': '.section-badge'
    };
    
    let passed = 0;
    Object.entries(elements).forEach(([name, selector]) => {
        const found = document.querySelectorAll(selector);
        const hasElements = found.length > 0;
        console.log(`${hasElements ? '✅' : '❌'} ${name}: ${hasElements ? `${found.length} trovati` : 'Non trovato'}`);
        if (hasElements) passed++;
    });
    
    return { passed, total: Object.keys(elements).length };
}

function checkFunctionality() {
    console.log('\n⚙️ === CONTROLLO FUNZIONALITÀ ===');
    
    let passed = 0;
    let total = 0;
    
    // Test funzioni badge system
    if (window.badgeSystem) {
        total++;
        try {
            const stats = window.badgeSystem.getStats();
            console.log('✅ Badge System: getStats() funziona');
            console.log('  📊 Statistiche:', stats);
            passed++;
        } catch (error) {
            console.log('❌ Badge System: getStats() errore:', error.message);
        }
    }
    
    // Test funzioni debug
    total++;
    if (typeof window.debugBadgeIntegration === 'function') {
        console.log('✅ Funzioni debug: Disponibili');
        passed++;
    } else {
        console.log('❌ Funzioni debug: Non disponibili');
    }
    
    // Test CSS badge
    total++;
    const testBadge = document.querySelector('.section-badge');
    if (testBadge || window.badgeSystem) {
        console.log('✅ Sistema CSS badge: Funzionante');
        passed++;
    } else {
        console.log('❌ Sistema CSS badge: Non funzionante');
    }
    
    return { passed, total };
}

function provideSuggestions(results) {
    console.log('\n💡 === SUGGERIMENTI ===');
    
    // Suggerimenti basati sui risultati
    if (results.scripts.passed < results.scripts.total) {
        console.log('🔧 Controlla l\'ordine di caricamento degli script nel tuo HTML');
    }
    
    if (!window.currentUser) {
        console.log('👤 Il Badge System funzionerà completamente dopo il login utente');
    }
    
    if (results.integration.passed < 2) {
        console.log('🔗 Alcune integrazioni mancano - controlla che script.js sia caricato correttamente');
    }
    
    if (results.dom.passed < 3) {
        console.log('🎯 Alcuni elementi DOM critici mancano - controlla l\'HTML');
    }
    
    if (!window.badgeSystem?.isInitialized && window.currentUser) {
        console.log('🚀 Prova a eseguire: window.badgeSystem.initialize(window.currentUser)');
    }
    
    // Comandi utili
    console.log('\n🛠️ === COMANDI UTILI ===');
    console.log('window.debugBadgeIntegration() - Debug dettagliato');
    console.log('window.showTestBadges() - Mostra badge di test');
    console.log('window.forceBadgeRefresh() - Aggiorna tutti i badge');
    console.log('window.resetVisitTracking() - Reset tracking visite');
}

// Auto-esecuzione in sviluppo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Aspetta un po' per permettere il caricamento
    setTimeout(() => {
        console.log('🔍 Auto-diagnostica Badge System...');
        runBadgeSystemDiagnostic();
    }, 3000);
}

// Esponi la funzione globalmente
window.runBadgeSystemDiagnostic = runBadgeSystemDiagnostic;

console.log('🩺 Badge System Diagnostic caricato - usa runBadgeSystemDiagnostic() per un controllo completo');