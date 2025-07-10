// ===============================================
// MOBILE NAVIGATION SYSTEM
// File: mobile-navigation.js
// ===============================================

(function() {
    'use strict';
    
    // Sistema di navigazione mobile
    const MobileNavigation = {
        
        // Configurazione
        config: {
            swipeThreshold: 100,      // Pixel minimi per swipe
            breadcrumbTimeout: 5000,  // Timeout auto-hide breadcrumb
            vibrationEnabled: true,   // Abilita vibrazione
            gesturesEnabled: true     // Abilita gesti swipe
        },
        
        // Stato interno
        state: {
            breadcrumbElement: null,
            swipeStartX: 0,
            swipeStartY: 0,
            isScrolling: false,
            isMobile: window.innerWidth <= 768
        },
        
        // Inizializza il sistema mobile
        init() {
            console.log('📱 Inizializzazione mobile navigation...');
            
            this.createBreadcrumb();
            this.bindEvents();
            if (this.config.gesturesEnabled) {
                this.initializeGestures();
            }
            this.updateUI();
            
            console.log('✅ Mobile navigation attivo');
        },
        
        // Crea l'elemento breadcrumb
        createBreadcrumb() {
            if (this.state.breadcrumbElement) return;
            
            this.state.breadcrumbElement = document.createElement('div');
            this.state.breadcrumbElement.id = 'mobileBreadcrumb';
            this.state.breadcrumbElement.className = 'mobile-breadcrumb';
            document.body.appendChild(this.state.breadcrumbElement);
            
            console.log('📱 Breadcrumb mobile creato');
        },
        
        // Bind event listeners
        bindEvents() {
            // Aggiorna su resize
            window.addEventListener('resize', this.handleResize.bind(this));
            
            // Ascolta aggiornamenti di navigazione
            window.addEventListener('navigationUpdate', this.handleNavigationUpdate.bind(this));
            
            // Listener per click sui breadcrumb
            if (this.state.breadcrumbElement) {
                this.state.breadcrumbElement.addEventListener('click', this.handleBreadcrumbClick.bind(this));
            }
        },
        
        // Gestisce resize finestra
        handleResize() {
            this.state.isMobile = window.innerWidth <= 768;
            this.updateBreadcrumb();
        },
        
        // Gestisce aggiornamenti di navigazione
        handleNavigationUpdate(event) {
            this.updateBreadcrumb();
        },
        
        // Gestisce click sui breadcrumb
        handleBreadcrumbClick(event) {
            const target = event.target;
            if (target.classList.contains('breadcrumb-item')) {
                const action = target.getAttribute('data-action');
                const value = target.getAttribute('data-value');
                
                if (action === 'section' && value) {
                    window.BrowserNavigation?.navigateToSection(value, true);
                } else if (action === 'back') {
                    window.BrowserNavigation?.backToForum();
                } else if (action === 'home') {
                    window.BrowserNavigation?.goToHome();
                }
            }
        },
        
        // Inizializza gesti touch
        initializeGestures() {
            if (!('ontouchstart' in window)) {
                console.log('📱 Touch non supportato, gesti disabilitati');
                return;
            }
            
            document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
            document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            
            console.log('👆 Gesti swipe inizializzati');
        },
        
        // Gestisce inizio touch
        handleTouchStart(event) {
            const touch = event.touches[0];
            this.state.swipeStartX = touch.clientX;
            this.state.swipeStartY = touch.clientY;
            this.state.isScrolling = false;
        },
        
        // Gestisce movimento touch
        handleTouchMove(event) {
            if (!this.state.swipeStartX || !this.state.swipeStartY) return;
            
            const touch = event.touches[0];
            const diffX = touch.clientX - this.state.swipeStartX;
            const diffY = touch.clientY - this.state.swipeStartY;
            
            // Determina se è scroll verticale
            if (Math.abs(diffY) > Math.abs(diffX)) {
                this.state.isScrolling = true;
            }
        },
        
        // Gestisce fine touch
        handleTouchEnd(event) {
            if (!this.state.swipeStartX || !this.state.swipeStartY || this.state.isScrolling) {
                this.resetSwipeState();
                return;
            }
            
            const touch = event.changedTouches[0];
            const diffX = touch.clientX - this.state.swipeStartX;
            
            // Swipe da sinistra verso destra
            if (diffX > this.config.swipeThreshold && Math.abs(diffX) > 50) {
                event.preventDefault();
                this.handleSwipeBack();
            }
            
            this.resetSwipeState();
        },
        
        // Reset stato swipe
        resetSwipeState() {
            this.state.swipeStartX = 0;
            this.state.swipeStartY = 0;
            this.state.isScrolling = false;
        },
        
        // Gestisce swipe indietro
        handleSwipeBack() {
            // Evita se si sta digitando
            if (this.isInputActive()) return;
            
            // Evita se ci sono modal aperti
            if (this.hasOpenModals()) return;
            
            console.log('👆 Swipe indietro rilevato');
            
            // Vibrazione feedback
            this.vibrate(50);
            
            // Esegui azione
            if (window.currentThreadId) {
                window.BrowserNavigation?.backToForum();
                this.showToast('← Tornato al forum', 1500);
            } else if (window.currentSection !== 'home') {
                window.BrowserNavigation?.goToHome();
                this.showToast('← Tornato alla home', 1500);
            } else {
                this.showToast('Sei già nella home', 1500);
            }
        },
        
        // Controlla se un input è attivo
        isInputActive() {
            return document.activeElement.tagName === 'INPUT' || 
                   document.activeElement.tagName === 'TEXTAREA';
        },
        
        // Controlla se ci sono modal aperti
        hasOpenModals() {
            const modals = document.querySelectorAll('.login-modal, .thread-creation-modal, .avatar-modal, .image-modal, .username-modal');
            return Array.from(modals).some(modal => {
                const style = window.getComputedStyle(modal);
                return style.display !== 'none';
            });
        },
        
        // Aggiorna breadcrumb
        updateBreadcrumb() {
            if (!this.state.breadcrumbElement) return;
            
            // Solo su mobile
            if (!this.state.isMobile) {
                this.hideBreadcrumb();
                return;
            }
            
            const currentSection = window.currentSection || 'home';
            const currentThreadId = window.currentThreadId;
            const currentThread = window.currentThread;
            
            if (currentSection === 'home') {
                this.hideBreadcrumb();
                return;
            }
            
            let breadcrumbHtml = '';
            const sectionConfig = window.sectionConfig || {};
            const currentSectionConfig = sectionConfig[currentSection];
            
            // Home link
            breadcrumbHtml += '<span class="breadcrumb-item" data-action="home">🏠 Home</span>';
            
            if (currentSection !== 'home') {
                breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
                
                if (currentThreadId) {
                    // Siamo in un thread
                    breadcrumbHtml += `<span class="breadcrumb-item" data-action="back">${currentSectionConfig?.title || 'Forum'}</span>`;
                    breadcrumbHtml += '<span class="breadcrumb-separator">›</span>';
                    
                    const threadTitle = currentThread?.title || 'Thread';
                    const shortTitle = threadTitle.length > 30 ? threadTitle.substring(0, 30) + '...' : threadTitle;
                    breadcrumbHtml += `<span class="breadcrumb-current">💬 ${shortTitle}</span>`;
                } else {
                    // Sezione normale
                    breadcrumbHtml += `<span class="breadcrumb-current">${currentSectionConfig?.title || currentSection}</span>`;
                }
            }
            
            this.state.breadcrumbElement.innerHTML = breadcrumbHtml;
            this.showBreadcrumb();
            
            // Auto-hide per sezioni (non per thread)
            if (!currentThreadId) {
                setTimeout(() => {
                    if (!window.currentThreadId) {
                        this.hideBreadcrumb();
                    }
                }, this.config.breadcrumbTimeout);
            }
        },
        
        // Mostra breadcrumb
        showBreadcrumb() {
            if (this.state.breadcrumbElement) {
                this.state.breadcrumbElement.classList.add('show');
            }
        },
        
        // Nasconde breadcrumb
        hideBreadcrumb() {
            if (this.state.breadcrumbElement) {
                this.state.breadcrumbElement.classList.remove('show');
            }
        },
        
        // Aggiorna UI generale
        updateUI() {
            this.updateBreadcrumb();
            
            // Aggiorna classi body per CSS
            document.body.classList.toggle('mobile-nav-active', this.state.isMobile);
        },
        
        // Vibrazione
        vibrate(duration) {
            if (this.config.vibrationEnabled && navigator.vibrate) {
                navigator.vibrate(duration);
            }
        },
        
        // Mostra toast
        showToast(message, duration = 3000) {
            if (window.BrowserNavigation?.showToast) {
                window.BrowserNavigation.showToast(message, duration);
            }
        },
        
        // Configurazione
        configure(options) {
            Object.assign(this.config, options);
            console.log('📱 Mobile navigation configurato:', this.config);
        },
        
        // Debug info
        debug() {
            console.log('📱 Mobile Navigation Debug:');
            console.log('- Is Mobile:', this.state.isMobile);
            console.log('- Screen Width:', window.innerWidth);
            console.log('- Touch Support:', 'ontouchstart' in window);
            console.log('- Vibration Support:', !!navigator.vibrate);
            console.log('- Gestures Enabled:', this.config.gesturesEnabled);
            console.log('- Breadcrumb Element:', !!this.state.breadcrumbElement);
            console.log('- Current Section:', window.currentSection);
            console.log('- Current Thread:', window.currentThreadId);
            console.log('- Config:', this.config);
        },
        
        // Abilita/disabilita gesti
        toggleGestures(enabled = !this.config.gesturesEnabled) {
            this.config.gesturesEnabled = enabled;
            console.log('👆 Gesti swipe:', enabled ? 'abilitati' : 'disabilitati');
        },
        
        // Abilita/disabilita vibrazione
        toggleVibration(enabled = !this.config.vibrationEnabled) {
            this.config.vibrationEnabled = enabled;
            console.log('📳 Vibrazione:', enabled ? 'abilitata' : 'disabilitata');
        }
    };
    
    // Esporta globalmente
    window.MobileNavigation = MobileNavigation;
    
    // Auto-inizializzazione se BrowserNavigation è presente
    const initWhenReady = () => {
        if (window.BrowserNavigation) {
            setTimeout(() => MobileNavigation.init(), 1500);
        } else {
            setTimeout(initWhenReady, 500);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }
    
    // Funzioni di debug globali
    window.debugMobileNav = () => MobileNavigation.debug();
    window.configureMobileNav = (options) => MobileNavigation.configure(options);
    
    console.log('📦 Mobile Navigation module caricato');
    
})();