// ===============================================
// DASHBOARD MODULE - Versione Semplificata
// NESSUNA CHIAMATA AL DATABASE - SOLO UI
// ===============================================

class DashboardManager {
    constructor() {
        this.animationTimers = [];
    }

    // Carica dashboard principale (solo UI)
    loadDashboard() {
        const threadList = document.getElementById('thread-list');

        // Se l'utente non è ancora loggato, mostra loading
        if (!currentUser) {
            threadList.innerHTML = this.getLoadingHTML();
            return;
        }

        // Usa sempre il nickname se disponibile
        const userName = (currentUserData && currentUserData.username) ? 
                        currentUserData.username : 
                        (currentUser.displayName || 'Guerriero');
        const userClan = getCurrentUserClan();
        const userRole = getCurrentUserRole();

        threadList.innerHTML = this.getDashboardHTML(userName, userClan, userRole);

        // Carica solo animazioni UI
        this.loadUIAnimations();
    }

    // Carica solo animazioni UI senza database calls
    loadUIAnimations() {
        const animations = [
            { delay: 300, fn: () => this.animateNavigationCards() },
            { delay: 500, fn: () => this.animateActionButtons() },
            { delay: 700, fn: () => this.animateWelcomeSection() }
        ];

        animations.forEach(({ delay, fn }) => {
            const timer = setTimeout(fn, delay);
            this.animationTimers.push(timer);
        });
    }

    // HTML principale della dashboard (semplificato)
    getDashboardHTML(userName, userClan, userRole) {
        return `
            <div class="dashboard-container">
                ${this.getWelcomeSection(userName, userClan, userRole)}
                ${this.getQuickNavigationSection()}
                ${this.getQuickActionsSection(userClan)}
            </div>
        `;
    }

    // Sezione benvenuto
    getWelcomeSection(userName, userClan, userRole) {
        const welcomeMessage = this.getWelcomeMessage();
        const roleDisplay = this.getRoleDisplay(userRole);

        return `
            <div class="dashboard-welcome">
                <div class="welcome-bg-particles"></div>
                <div class="welcome-bg-icon">🏰</div>
                <div class="welcome-content">
                    <h2 class="welcome-title animate-text">
                        ${welcomeMessage}, <span class="username-highlight">${userName}</span>! ${roleDisplay}
                    </h2>
                    <p class="welcome-subtitle">
                        🛡️ Benvenuto nel tuo comando, guerriero! Gestisci il tuo impero e coordina le strategie con la community.
                    </p>
                    ${this.getClanStatusCard(userClan)}
                </div>
            </div>
        `;
    }

    // Navigazione rapida
    getQuickNavigationSection() {
        return `
            <div class="dashboard-section">
                <h3 class="section-title">
                    <span class="section-icon">🧭</span>
                    <span class="section-text">Navigazione Rapida</span>
                    <div class="section-line"></div>
                </h3>
                <div class="quick-nav-grid">
                    ${this.getQuickNavCards()}
                </div>
            </div>
        `;
    }

    // Azioni rapide
    getQuickActionsSection(userClan) {
        return `
            <div class="dashboard-section">
                <h3 class="section-title">
                    <span class="section-icon">⚡</span>
                    <span class="section-text">Azioni Rapide</span>
                    <div class="section-line"></div>
                </h3>
                <div class="quick-actions-grid">
                    ${this.getQuickActionButtons(userClan)}
                </div>
            </div>
        `;
    }

    // Cards navigazione rapida
    getQuickNavCards() {
        const navItems = [
            { icon: '📅', title: 'Eventi', subtitle: 'Scopri eventi in corso', section: 'eventi', gradient: 'red' },
            { icon: '⚔️', title: 'Oggetti', subtitle: 'Guide armi e armature', section: 'oggetti', gradient: 'purple' },
            { icon: '🆕', title: 'Novità', subtitle: 'Ultimi aggiornamenti', section: 'novita', gradient: 'blue' },
            { icon: '🛋️', title: 'Salotto', subtitle: 'Per parlare del più e del meno', section: 'salotto', gradient: 'yellow'},
            { icon: '📢', title: 'Segnalazioni', subtitle: 'Segnala bug o problemi', section: 'segnalazioni', gradient: 'orange'},
            { icon: '💬', title: 'Chat', subtitle: 'Chiacchiera con tutti', section: 'chat-generale', gradient: 'green' }
        ];

        return navItems.map(item => `
            <div class="quick-nav-card nav-card-${item.gradient}" onclick="switchSection('${item.section}')">
                <div class="nav-card-glow"></div>
                <div class="nav-card-icon">${item.icon}</div>
                <div class="nav-card-content">
                    <h4>${item.title}</h4>
                    <p>${item.subtitle}</p>
                </div>
                <div class="nav-card-arrow">→</div>
            </div>
        `).join('');
    }

    // Bottoni azioni rapide
    getQuickActionButtons(userClan) {
        const actions = [
            {
                icon: '🎯',
                title: 'Strategie',
                subtitle: 'Guide e tattiche',
                action: "switchSection('eventi')",
                gradient: 'red'
            },
            {
                icon: '💬',
                title: 'Community',
                subtitle: 'Unisciti alla chat',
                action: "switchSection('chat-generale')",
                gradient: 'green'
            },
            {
                icon: '✍️',
                title: 'Crea Thread',
                subtitle: 'Condividi idee',
                action: "showThreadCreationModal()",
                gradient: 'purple'
            }
        ];

        if (userClan !== 'Nessuno') {
            actions.push({
                icon: '🏰',
                title: 'Clan Wars',
                subtitle: 'Strategia clan',
                action: "switchSection('clan-war')",
                gradient: 'blue'
            });
        }

        return actions.map(action => `
            <button class="quick-action-btn action-${action.gradient}" onclick="${action.action}">
                <div class="action-glow"></div>
                <div class="action-icon">${action.icon}</div>
                <div class="action-content">
                    <div class="action-title">${action.title}</div>
                    <div class="action-subtitle">${action.subtitle}</div>
                </div>
            </button>
        `).join('');
    }

    // Animazioni UI
    animateNavigationCards() {
        const navCards = document.querySelectorAll('.quick-nav-card');
        navCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'fadeInScale 0.5s ease forwards';
                card.style.opacity = '1';
            }, index * 100);
        });
    }

    animateActionButtons() {
        const actionBtns = document.querySelectorAll('.quick-action-btn');
        actionBtns.forEach((btn, index) => {
            setTimeout(() => {
                btn.style.animation = 'bounceIn 0.6s ease forwards';
                btn.style.opacity = '1';
            }, index * 120);
        });
    }

    animateWelcomeSection() {
        const welcomeTitle = document.querySelector('.welcome-title');
        const welcomeSubtitle = document.querySelector('.welcome-subtitle');
        
        if (welcomeTitle) {
            welcomeTitle.style.animation = 'slideInRight 1s ease-out';
        }
        if (welcomeSubtitle) {
            welcomeSubtitle.style.animation = 'fadeIn 1.2s ease-out 0.3s both';
        }
    }

    // Utility functions
    getWelcomeMessage() {
        const hour = new Date().getHours();
        if (hour < 12) return '🌅 Buongiorno';
        if (hour < 18) return '☀️ Buon pomeriggio';
        return '🌙 Buonasera';
    }

    getRoleDisplay(role) {
        switch (role) {
            case USER_ROLES.SUPERUSER: return '<span class="role-badge role-super">👑 IMPERATORE</span>';
            case USER_ROLES.CLAN_MOD: return '<span class="role-badge role-mod">🛡️ COMANDANTE</span>';
            default: return '<span class="role-badge role-user">⚔️ GUERRIERO</span>';
        }
    }

    getClanStatusCard(userClan) {
        if (userClan !== 'Nessuno') {
            return `
                <div class="clan-status-card clan-active">
                    <div class="clan-glow"></div>
                    <div class="clan-icon">🏰</div>
                    <div class="clan-info">
                        <div class="clan-name">${userClan}</div>
                        <div class="clan-subtitle">Il tuo impero ti aspetta, comandante!</div>
                    </div>
                    <div class="clan-power-indicator"></div>
                </div>
            `;
        } else {
            return `
                <div class="clan-status-card clan-none">
                    <div class="clan-icon">⚠️</div>
                    <div class="clan-info">
                        <div class="clan-name">Senza Alleanze</div>
                        <div class="clan-subtitle">Unisciti a un clan per conquistare insieme!</div>
                    </div>
                </div>
            `;
        }
    }

    getLoadingHTML() {
        return `
            <div class="dashboard-loading">
                <div class="loading-castle">🏰</div>
                <div class="loading-text">
                    <h2>Preparando il Comando...</h2>
                    <p>Caricamento della tua fortezza digitale</p>
                </div>
            </div>
        `;
    }

    // Cleanup semplificato
    cleanup() {
        // Pulisci i timer di animazione
        this.animationTimers.forEach(timer => clearTimeout(timer));
        this.animationTimers = [];
    }
}

// ===============================================
// DASHBOARD THREAD CREATION - SEZIONE SELECTION
// ===============================================

// Override della funzione showThreadCreationModal
const originalShowThreadCreationModal = window.showThreadCreationModal;

window.showThreadCreationModal = function(targetSection = null) {
    console.log('🎯 Apertura modal creazione thread');
    console.log('- Sezione corrente:', currentSection);
    console.log('- Sezione target:', targetSection);
    
    // Se siamo nella dashboard, chiedi dove creare il thread
    if (currentSection === 'home' && !targetSection) {
        showSectionSelectionModal();
        return;
    }
    
    // Se abbiamo una sezione target, vai lì prima di aprire il modal
    if (targetSection && targetSection !== currentSection) {
        console.log(`🔄 Reindirizzamento a sezione: ${targetSection}`);
        switchSection(targetSection);
        
        // Aspetta che la sezione sia caricata, poi apri il modal
        setTimeout(() => {
            originalShowThreadCreationModal.call(this);
        }, 500);
        return;
    }
    
    // Esegui la funzione originale
    originalShowThreadCreationModal.call(this);
};

// Modal per selezione sezione
function showSectionSelectionModal() {
    // Rimuovi modal esistente se presente
    const existingModal = document.getElementById('sectionSelectionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Ottieni sezioni disponibili per l'utente
    const availableSections = getAvailableSectionsForUser();
    
    const modal = document.createElement('div');
    modal.id = 'sectionSelectionModal';
    modal.className = 'section-selection-modal';
    modal.innerHTML = `
        <div class="section-selection-content">
            <h3>🎯 Dove vuoi creare il thread?</h3>
            <p>Seleziona la sezione più appropriata per il tuo thread:</p>
            
            <div class="section-selection-grid">
                ${availableSections.map(section => `
                    <button class="section-selection-btn" onclick="createThreadInSection('${section.key}')">
                        <div class="section-icon-container">
                            <div class="section-icon">${section.icon}</div>
                        </div>
                        <div class="section-info">
                            <div class="section-name">${section.name}</div>
                            <div class="section-desc">${section.description}</div>
                        </div>
                        <div class="section-arrow">→</div>
                    </button>
                `).join('')}
            </div>
            
            <button class="btn-cancel-selection" onclick="closeSectionSelectionModal()">
                ❌ Annulla
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Previeni scroll del body
    document.body.style.overflow = 'hidden';
}

// Funzione per ottenere sezioni disponibili
function getAvailableSectionsForUser() {
    const sections = [
        {
            key: 'eventi',
            name: 'Eventi',
            icon: '📅',
            description: 'Discussioni su eventi del gioco'
        },
        {
            key: 'oggetti',
            name: 'Oggetti',
            icon: '⚔️',
            description: 'Guide su armi e armature'
        },
        {
            key: 'novita',
            name: 'Novità',
            icon: '🆕',
            description: 'Ultime notizie e aggiornamenti'
        },
        {
            key: 'salotto',
            name: 'Salotto',
            icon: '🛋️',
            description: 'Dove rilassarsi e parlare del più e del meno'
        },
        {
            key: 'segnalazioni',
            name: 'Segnalazioni',
            icon: '📢',
            description: 'Segnala bug o problemi tecnici'
        },
        {
            key: 'associa-clan',
            name: 'Associa Clan',
            icon: '🏠',
            description: 'Richieste di associazione ai clan'
        }
    ];
    
    // Aggiungi sezioni clan se l'utente appartiene a un clan
    const userClan = getCurrentUserClan();
    if (userClan !== 'Nessuno') {
        sections.push(
            {
                key: 'clan-war',
                name: 'Guerra Clan',
                icon: '⚔️',
                description: 'Strategie e coordinamento guerre'
            },
            {
                key: 'clan-premi',
                name: 'Premi Clan',
                icon: '🏆',
                description: 'Ricompense e achievement'
            },
            {
                key: 'clan-consigli',
                name: 'Consigli Clan',
                icon: '💡',
                description: 'Suggerimenti per i membri'
            },
            {
                key: 'clan-bacheca',
                name: 'Bacheca Clan',
                icon: '🏰',
                description: 'Messaggi importanti del clan'
            }
        );
    }
    
    // Filtra sezioni in base ai permessi
    return sections.filter(section => canAccessSection(section.key));
}

// Funzione per creare thread in sezione specifica
window.createThreadInSection = function(sectionKey) {
    console.log(`📝 Creazione thread in sezione: ${sectionKey}`);
    
    // Chiudi modal di selezione
    closeSectionSelectionModal();
    
    // Vai alla sezione e apri il modal di creazione
    switchSection(sectionKey);
    
    // Aspetta che la sezione sia caricata, poi apri il modal
    setTimeout(() => {
        showThreadCreationModal(sectionKey);
    }, 600);
};

// Funzione per chiudere modal di selezione
window.closeSectionSelectionModal = function() {
    const modal = document.getElementById('sectionSelectionModal');
    if (modal) {
        modal.remove();
    }
    
    // Ripristina scroll del body
    document.body.style.overflow = 'auto';
};

// Override della funzione createThread per controlli
const originalCreateThread = window.createThread;

window.createThread = async function() {
    console.log('📝 Creazione thread avviata');
    console.log('- Sezione corrente:', currentSection);
    
    // Verifica che non siamo nella dashboard
    if (currentSection === 'home') {
        console.error('❌ Tentativo di creare thread dalla dashboard!');
        alert('Errore: seleziona prima una sezione per creare il thread.');
        hideThreadCreationModal();
        showSectionSelectionModal();
        return;
    }
    
    // Verifica accesso alla sezione
    if (!canAccessSection(currentSection)) {
        console.error('❌ Accesso negato alla sezione:', currentSection);
        alert('Non hai i permessi per creare thread in questa sezione.');
        hideThreadCreationModal();
        return;
    }
    
    // Esegui la creazione normale
    return originalCreateThread.call(this);
};

// ===============================================
// GESTIONE EVENTI
// ===============================================

// Gestione escape key per chiudere modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('sectionSelectionModal');
        if (modal) {
            closeSectionSelectionModal();
        }
    }
});

// Prevenzione click fuori dal modal
document.addEventListener('click', function(e) {
    const modal = document.getElementById('sectionSelectionModal');
    if (modal && e.target === modal) {
        closeSectionSelectionModal();
    }
});

// Cleanup quando si cambia sezione
const originalSwitchSection = window.switchSection;
window.switchSection = function(sectionKey) {
    // Chiudi modal di selezione se aperto
    closeSectionSelectionModal();
    
    // Pulisci dashboard manager se stiamo uscendo dalla home
    if (currentSection === 'home' && window.dashboardManager) {
        window.dashboardManager.cleanup();
    }
    
    // Esegui switch normale
    return originalSwitchSection.call(this, sectionKey);
};

// ===============================================
// INIZIALIZZAZIONE
// ===============================================

// Istanza globale del dashboard manager
window.dashboardManager = new DashboardManager();

// Sovrascrive la funzione loadDashboard globale
window.loadDashboard = function() {
    console.log('📊 Caricamento dashboard semplificato (senza database calls)...');
    
    // Esegui caricamento dashboard
    window.dashboardManager.loadDashboard();
    
    console.log('✅ Dashboard caricato con successo');
};

// ===============================================
// FUNZIONI DI DEBUG
// ===============================================

// Debug per azioni rapide
window.debugQuickActions = function() {
    console.log('🔍 Debug Azioni Rapide:');
    console.log('- Sezione corrente:', currentSection);
    console.log('- Sezioni disponibili:', getAvailableSectionsForUser().map(s => s.key));
    console.log('- Modal selezione presente:', !!document.getElementById('sectionSelectionModal'));
    
    // Testa la funzione di creazione
    console.log('🧪 Test apertura modal selezione...');
    showSectionSelectionModal();
};

console.log('🚀 Dashboard semplificato caricato - NESSUNA chiamata al database!');