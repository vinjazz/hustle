// ===============================================
// REAL-TIME STATUS INDICATOR - Supabase Connection
// ===============================================

class RealtimeStatusIndicator {
    constructor() {
        this.indicator = null;
        this.currentStatus = 'disconnected';
        this.hideTimeout = null;
        this.isVisible = false;
    }

    // Inizializza l'indicatore
    init() {
        this.createIndicator();
        this.bindEvents();
        console.log('✅ Real-time Status Indicator inizializzato');
    }

    // Crea l'elemento indicatore
    createIndicator() {
        if (this.indicator) return;

        this.indicator = document.createElement('div');
        this.indicator.id = 'realtimeStatus';
        this.indicator.className = 'realtime-status disconnected';
        this.indicator.innerHTML = `
            <span class="status-icon">🔴</span>
            <span class="status-text">Real-time disconnesso</span>
        `;

        document.body.appendChild(this.indicator);
    }

    // Eventi per gestione hover e click
    bindEvents() {
        if (!this.indicator) return;

        // Mostra al hover sui badge o notifiche
        const targets = document.querySelectorAll('.section-badge, .notifications-bell');
        targets.forEach(target => {
            target.addEventListener('mouseenter', () => {
                if (this.currentStatus !== 'connected') {
                    this.show();
                }
            });
        });

        // Click per debug info
        this.indicator.addEventListener('click', () => {
            this.showDebugInfo();
        });

        // Auto-hide dopo hover
        this.indicator.addEventListener('mouseleave', () => {
            this.scheduleHide(3000);
        });
    }

    // Aggiorna lo stato
    updateStatus(status, message = null) {
        if (!this.indicator || this.currentStatus === status) return;

        this.currentStatus = status;
        
        // Rimuovi classi di stato esistenti
        this.indicator.classList.remove('connected', 'disconnected', 'connecting', 'error');
        this.indicator.classList.add(status);

        const statusIcon = this.indicator.querySelector('.status-icon');
        const statusText = this.indicator.querySelector('.status-text');

        switch (status) {
            case 'connected':
                statusIcon.textContent = '🟢';
                statusText.textContent = message || 'Real-time connesso';
                this.scheduleHide(2000);
                break;
                
            case 'connecting':
                statusIcon.textContent = '🟡';
                statusText.textContent = message || 'Connessione real-time...';
                this.show();
                break;
                
            case 'disconnected':
                statusIcon.textContent = '🔴';
                statusText.textContent = message || 'Real-time disconnesso';
                this.scheduleHide(5000);
                break;
                
            case 'error':
                statusIcon.textContent = '❌';
                statusText.textContent = message || 'Errore real-time';
                this.show();
                break;
        }

        console.log(`🔄 Real-time Status: ${status} - ${statusText.textContent}`);
    }

    // Mostra l'indicatore
    show() {
        if (!this.indicator || this.isVisible) return;

        clearTimeout(this.hideTimeout);
        this.indicator.classList.add('show');
        this.isVisible = true;
    }

    // Nasconde l'indicatore
    hide() {
        if (!this.indicator || !this.isVisible) return;

        this.indicator.classList.remove('show');
        this.isVisible = false;
        clearTimeout(this.hideTimeout);
    }

    // Programma nascondimento automatico
    scheduleHide(delay = 3000) {
        if (this.currentStatus === 'error' || this.currentStatus === 'connecting') {
            return; // Non nascondere per errori o stati di connessione
        }

        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, delay);
    }

    // Mostra informazioni di debug
    showDebugInfo() {
        const info = {
            status: this.currentStatus,
            activityTracker: !!window.activityTracker?.isTracking,
            subscriptions: window.activityTracker?.subscriptions?.size || 0,
            notifications: !!window.notificationsSubscription,
            supabase: !!window.supabase,
            user: !!currentUser
        };

        console.group('🔍 Real-time Debug Info');
        console.table(info);
        
        if (window.activityTracker?.debugStatus) {
            window.activityTracker.debugStatus();
        }
        
        console.groupEnd();

        // Mostra toast con info
        if (window.createToast && window.showToast) {
            const toast = window.createToast({
                type: 'info',
                title: '🔍 Real-time Status',
                message: `Status: ${this.currentStatus} | Subscriptions: ${info.subscriptions}`,
                duration: 4000
            });
            window.showToast(toast);
        }
    }

    // Cleanup
    destroy() {
        if (this.indicator) {
            this.indicator.remove();
            this.indicator = null;
        }
        clearTimeout(this.hideTimeout);
        this.isVisible = false;
    }
}

// Istanza globale
window.realtimeStatusIndicator = new RealtimeStatusIndicator();

// Integrazione con Activity Tracker
const originalActivityTrackerInit = window.activityTracker?.init;
if (originalActivityTrackerInit) {
    window.activityTracker.init = async function() {
        window.realtimeStatusIndicator.updateStatus('connecting', 'Inizializzando real-time...');
        
        try {
            await originalActivityTrackerInit.call(this);
            
            if (this.isTracking) {
                window.realtimeStatusIndicator.updateStatus('connected', 'Real-time attivo');
            } else {
                window.realtimeStatusIndicator.updateStatus('error', 'Errore inizializzazione');
            }
        } catch (error) {
            console.error('Errore Activity Tracker:', error);
            window.realtimeStatusIndicator.updateStatus('error', 'Errore real-time');
        }
    };
}

// Integrazione con sistema notifiche
const originalLoadNotifications = window.loadNotificationsFromSupabase;
if (typeof originalLoadNotifications === 'function') {
    window.loadNotificationsFromSupabase = async function() {
        try {
            await originalLoadNotifications.call(this);
            
            // Status indicator già gestito da Activity Tracker
            
        } catch (error) {
            console.error('Errore notifiche Supabase:', error);
            window.realtimeStatusIndicator.updateStatus('error', 'Errore notifiche');
        }
    };
}

// Event listener per inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza con delay per permettere il caricamento
    setTimeout(() => {
        window.realtimeStatusIndicator.init();
    }, 1000);
});

// Gestione errori globali Supabase
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && 
        (event.error.message.includes('supabase') || 
         event.error.message.includes('realtime'))) {
        
        console.error('🚨 Errore Real-time globale:', event.error);
        window.realtimeStatusIndicator.updateStatus('error', 'Errore connessione');
    }
});

// Debug command globale
window.checkRealtimeStatus = function() {
    window.realtimeStatusIndicator.showDebugInfo();
};

console.log('✅ Real-time Status Indicator caricato!');