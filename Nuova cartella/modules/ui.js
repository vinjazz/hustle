// ui.js - Gestione interfaccia utente

window.UI = {
    // Stato dell'interfaccia
    isInitialized: false,
    isMobileMenuOpen: false,
    activeEmoticonPicker: null,
    
    /**
     * Inizializza l'interfaccia utente
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('🎨 Inizializzazione interfaccia utente...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Inizializza componenti UI
        this.initializeComponents();
        
        // Setup mobile detection
        this.setupMobileHandlers();
        
        this.isInitialized = true;
        console.log('✅ Interfaccia utente inizializzata');
    },

    /**
     * Setup event listeners globali
     */
    setupEventListeners() {
        // Resize handler
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));

        // Click handler globale per chiudere dropdown/popup
        document.addEventListener('click', (event) => {
            this.handleGlobalClick(event);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                if (section) {
                    App.switchSection(section);
                }
            });
        });
    },

    /**
     * Inizializza componenti UI
     */
    initializeComponents() {
        // Inizializza tooltips se necessario
        this.initializeTooltips();
        
        // Imposta stato iniziale
        this.updateConnectionStatus(false);
        this.updateMessageCounter(0);
    },

    /**
     * Setup handlers per mobile
     */
    setupMobileHandlers() {
        // Touch handlers per migliorare l'esperienza mobile
        if ('ontouchstart' in window) {
            document.body.classList.add('touch-device');
        }

        // Gestione orientamento
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 100);
        });
    },

    /**
     * Gestione resize della finestra
     */
    handleResize() {
        // Chiudi menu mobile se si passa a desktop
        if (window.innerWidth > 768 && this.isMobileMenuOpen) {
            this.closeMobileMenu();
        }

        // Aggiorna layout emoticon picker se aperto
        if (this.activeEmoticonPicker) {
            this.updateEmoticonPickerPosition();
        }
    },

    /**
     * Gestione click globale
     */
    handleGlobalClick(event) {
        // Chiudi emoticon picker se si clicca fuori
        if (!event.target.closest('.emoticon-picker') && this.activeEmoticonPicker) {
            this.closeEmoticonPicker();
        }

        // Chiudi pannello notifiche se si clicca fuori
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationsBell = document.getElementById('notificationsBell');
        
        if (notificationsPanel && notificationsBell && 
            !notificationsPanel.contains(event.target) && 
            !notificationsBell.contains(event.target) &&
            notificationsPanel.classList.contains('show')) {
            notificationsPanel.classList.remove('show');
        }
    },

    /**
     * Gestione keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl+Enter per inviare messaggi
        if (event.ctrlKey && event.key === 'Enter') {
            const activeElement = document.activeElement;
            
            if (activeElement.id === 'message-input') {
                event.preventDefault();
                Chat.sendMessage();
            } else if (activeElement.id === 'comment-text') {
                event.preventDefault();
                Forum.addComment();
            }
        }

        // Escape per chiudere modal/popup
        if (event.key === 'Escape') {
            if (document.getElementById('threadCreationModal').style.display === 'flex') {
                Forum.hideThreadCreationModal();
            }
            
            if (this.activeEmoticonPicker) {
                this.closeEmoticonPicker();
            }
            
            if (this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
        }

        // Alt+N per nuovo thread (se in sezione forum)
        if (event.altKey && event.key === 'n') {
            const currentSection = window.SECTION_CONFIG[window.currentSection];
            if (currentSection && currentSection.type === 'forum') {
                event.preventDefault();
                Forum.showThreadCreationModal();
            }
        }
    },

    /**
     * Mostra messaggio di errore
     */
    showError(message) {
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 5000);
        } else {
            // Fallback: usa alert se elemento non esiste
            alert('Errore: ' + message);
        }
    },

    /**
     * Mostra messaggio di successo
     */
    showSuccess(message) {
        const successEl = document.getElementById('loginSuccess');
        if (successEl) {
            successEl.textContent = message;
            successEl.classList.add('show');
            setTimeout(() => successEl.classList.remove('show'), 3000);
        } else {
            // Mostra popup di successo
            this.showToast(message, 'success');
        }
    },

    /**
     * Nascondi messaggio di errore
     */
    hideError() {
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.classList.remove('show');
        }
    },

    /**
     * Mostra/nascondi loading
     */
    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.toggle('show', show);
        }
    },

    /**
     * Mostra toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `notification-popup ${type}`;
        toast.innerHTML = `
            <div class="notification-content">${message}</div>
        `;

        document.body.appendChild(toast);

        // Anima l'entrata
        setTimeout(() => toast.classList.add('show'), 100);

        // Rimuovi automaticamente
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    },

    /**
     * Toggle menu mobile
     */
    toggleMobileMenu() {
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    },

    /**
     * Apri menu mobile
     */
    openMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobileOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
            this.isMobileMenuOpen = true;
        }
    },

    /**
     * Chiudi menu mobile
     */
    closeMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobileOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
            document.body.style.overflow = 'auto';
            this.isMobileMenuOpen = false;
        }
    },

    /**
     * Toggle emoticon picker
     */
    toggleEmoticonPicker(type) {
        const panel = document.getElementById(`${type}-emoticon-panel`);
        if (!panel) return;

        const isVisible = panel.classList.contains('show');
        
        // Chiudi tutti i panel aperti
        this.closeEmoticonPicker();
        
        // Mostra quello corrente se non era visibile
        if (!isVisible) {
            panel.classList.add('show');
            this.activeEmoticonPicker = panel;
            this.updateEmoticonPickerPosition();
        }
    },

    /**
     * Chiudi emoticon picker
     */
    closeEmoticonPicker() {
        document.querySelectorAll('.emoticon-panel').forEach(panel => {
            panel.classList.remove('show');
        });
        this.activeEmoticonPicker = null;
    },

    /**
     * Aggiorna posizione emoticon picker per mobile
     */
    updateEmoticonPickerPosition() {
        if (!this.activeEmoticonPicker) return;
        
        if (Utils.isMobile()) {
            // Centra il picker su mobile
            const picker = this.activeEmoticonPicker;
            const rect = picker.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            
            if (rect.right > viewportWidth) {
                picker.style.left = '50%';
                picker.style.transform = 'translateX(-50%)';
            }
        }
    },

    /**
     * Aggiungi emoticon al campo attivo
     */
    addEmoticon(type, emoticon) {
        const input = type === 'chat' ? 
            document.getElementById('message-input') : 
            document.getElementById('comment-text');
        
        if (!input) return;
        
        const cursorPos = input.selectionStart || 0;
        const textBefore = input.value.substring(0, cursorPos);
        const textAfter = input.value.substring(cursorPos);
        
        input.value = textBefore + emoticon + textAfter;
        input.focus();
        input.setSelectionRange(cursorPos + emoticon.length, cursorPos + emoticon.length);
        
        // Chiudi picker
        this.closeEmoticonPicker();
    },

    /**
     * Aggiorna stato connessione
     */
    updateConnectionStatus(isConnected) {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;
        
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
    },

    /**
     * Aggiorna contatore messaggi
     */
    updateMessageCounter(count) {
        const counterEl = document.getElementById('messageCounter');
        if (counterEl) {
            counterEl.textContent = `💬 ${count} messaggi`;
        }
    },

    /**
     * Aggiorna accesso alle sezioni clan
     */
    updateClanSectionsAccess() {
        const userClan = Utils.getCurrentUserClan();
        const clanItems = document.querySelectorAll('.nav-item.clan-only');
        
        clanItems.forEach(item => {
            if (userClan === 'Nessuno') {
                item.classList.add('disabled');
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.5';
            } else {
                item.classList.remove('disabled');
                item.style.pointerEvents = 'auto';
                item.style.opacity = '1';
            }
        });
    },

    /**
     * Aggiorna accesso alle sezioni admin
     */
    updateAdminSectionsAccess() {
        const adminSection = document.getElementById('adminSection');
        const clanModerationItem = document.getElementById('clanModerationItem');
        
        // Mostra sezioni admin globali solo al superuser
        const canAccessGlobalAdmin = Utils.getCurrentUserRole() === window.USER_ROLES.SUPERUSER;
        
        if (adminSection) {
            adminSection.style.display = canAccessGlobalAdmin ? 'block' : 'none';
        }
        
        // Se si è in una sezione admin e non si ha più accesso, torna agli eventi
        if (!canAccessGlobalAdmin && window.currentSection && window.currentSection.startsWith('admin-')) {
            App.switchSection('eventi');
        }
        
        // Mostra moderazione clan se è moderatore o superuser del clan
        const canModerateClan = Utils.isClanModerator();
        
        if (clanModerationItem) {
            clanModerationItem.style.display = canModerateClan ? 'block' : 'none';
        }
        
        // Se si è nella sezione moderazione e non si ha più accesso, torna alla chat clan
        if (!canModerateClan && window.currentSection === 'clan-moderation') {
            App.switchSection('clan-chat');
        }
    },

    /**
     * Aggiorna navigazione attiva
     */
    updateActiveNavigation(sectionKey) {
        // Rimuovi classe active da tutti gli elementi
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Aggiungi classe active all'elemento corrente
        const activeItem = document.querySelector(`[data-section="${sectionKey}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    },

    /**
     * Mostra/nascondi contenuti basato sul tipo di sezione
     */
    showContent(contentType) {
        const forumContent = document.getElementById('forum-content');
        const chatContent = document.getElementById('chat-content');
        const threadView = document.getElementById('thread-view');
        const newThreadBtn = document.getElementById('new-thread-btn');

        // Nascondi tutto inizialmente
        if (forumContent) forumContent.style.display = 'none';
        if (chatContent) chatContent.style.display = 'none';
        if (threadView) threadView.style.display = 'none';
        if (newThreadBtn) newThreadBtn.style.display = 'none';

        // Mostra contenuto appropriato
        switch (contentType) {
            case 'forum':
            case 'admin':
            case 'clan-admin':
            case 'dashboard':
                if (forumContent) forumContent.style.display = 'block';
                if (contentType === 'forum' && newThreadBtn) newThreadBtn.style.display = 'block';
                break;
            case 'chat':
                if (chatContent) chatContent.style.display = 'flex';
                break;
            case 'thread':
                if (threadView) threadView.style.display = 'flex';
                break;
        }

        // Chiudi menu mobile se aperto
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        }
    },

    /**
     * Aggiorna header della sezione
     */
    updateSectionHeader(title, description) {
        const titleEl = document.getElementById('section-title');
        const descEl = document.getElementById('section-description');
        
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description;
    },

    /**
     * Inizializza tooltips (se necessario in futuro)
     */
    initializeTooltips() {
        // Placeholder per futuri tooltips
        // Può essere implementato con una libreria di tooltip o custom
    },

    /**
     * Scroll smooth a un elemento
     */
    scrollToElement(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    },

    /**
     * Anima l'entrata di un elemento
     */
    animateIn(element, animationType = 'slideIn') {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 10);
    },

    /**
     * Formatta numero per display (es. 1000 -> 1K)
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    /**
     * Crea elemento con classi e attributi
     */
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.id) {
            element.id = options.id;
        }
        
        if (options.innerHTML) {
            element.innerHTML = options.innerHTML;
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.style) {
            Object.entries(options.style).forEach(([key, value]) => {
                element.style[key] = value;
            });
        }
        
        return element;
    },

    /**
     * Aggiunge loading spinner a un elemento
     */
    addLoadingSpinner(element, text = 'Caricamento...') {
        if (!element) return;
        
        const spinner = this.createElement('div', {
            className: 'loading-spinner',
            innerHTML: `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <div style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    ${text}
                </div>
            `
        });
        
        element.innerHTML = '';
        element.appendChild(spinner);
    },

    /**
     * Rimuove loading spinner da un elemento
     */
    removeLoadingSpinner(element) {
        if (!element) return;
        
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    },

    /**
     * Verifica se un elemento è visibile nel viewport
     */
    isElementInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Cleanup dell'interfaccia
     */
    cleanup() {
        // Chiudi tutti i popup/modal aperti
        this.closeMobileMenu();
        this.closeEmoticonPicker();
        
        // Reset stato
        this.activeEmoticonPicker = null;
        this.isMobileMenuOpen = false;
        
        console.log('🎨 UI cleaned up');
    }
};

console.log('🎨 UI module loaded');