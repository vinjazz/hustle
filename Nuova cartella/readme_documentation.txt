# 🏰 Hustle Castle Forum

Un forum completo e modulare per la community di Hustle Castle, costruito con vanilla JavaScript e Firebase.

## 🌟 Caratteristiche Principali

### 💬 **Sistema di Comunicazione**
- **Forum con thread**: Creazione e gestione di discussioni organizzate per sezioni
- **Chat in tempo reale**: Messaggi istantanei con supporto emoji
- **Chat clan private**: Comunicazione esclusiva per membri del clan
- **Sistema di commenti**: Risposte strutturate nei thread

### 🔔 **Sistema di Notifiche Avanzato**
- **Notifiche in tempo reale**: Badge numerici sulle sezioni con nuovi contenuti
- **Pannello notifiche**: Centro notifiche centralizzato accessibile
- **Popup intelligenti**: Notifiche non invasive per eventi importanti
- **Indicatori di stato**: Messaggi non letti e contenuti in attesa

### 👥 **Gestione Utenti e Clan**
- **Sistema ruoli**: User, Clan Moderator, Super Admin
- **Gestione clan**: Creazione, assegnazione e moderazione
- **Profili utente**: Informazioni dettagliate e stato online
- **Autenticazione**: Email/password e Google OAuth

### 🛡️ **Moderazione e Amministrazione**
- **Pannello admin**: Gestione completa utenti e clan
- **Moderazione contenuti**: Approvazione thread per clan
- **Sistema di permessi**: Controllo granulare degli accessi
- **Statistiche**: Dashboard con metriche del forum

### 📱 **Design Responsivo**
- **Mobile-first**: Interfaccia ottimizzata per tutti i dispositivi
- **Tema medievale**: Design immersivo ambientato nel mondo di Hustle Castle
- **Animazioni fluide**: Transizioni eleganti e feedback visivi
- **Accessibilità**: Supporto completo per screen reader e keyboard navigation

## 🏗️ Architettura Modulare

Il progetto è completamente modularizzato per facilità di manutenzione e estensibilità:

```
📦 hustle-castle-forum/
├── 📄 index.html              # HTML principale
├── 🎨 style.css               # Stili CSS globali
├── 📂 modules/                # Moduli JavaScript
│   ├── 📄 constants.js        # Costanti e configurazioni
│   ├── 🔧 utils.js           # Funzioni di utilità
│   ├── 🔔 notifications.js   # Sistema notifiche
│   ├── 🔐 auth.js            # Autenticazione
│   ├── 🎨 ui.js              # Interfaccia utente
│   ├── 💬 chat.js            # Sistema chat
│   ├── 📋 forum.js           # Gestione forum
│   ├── ⚙️ admin.js           # Pannello amministrativo
│   └── 🚀 app.js             # Modulo principale
├── 📄 README.md              # Documentazione
├── 📄 firebase-config.example.js # Configurazione Firebase esempio
└── 📄 package.json           # Dipendenze e script
```

### 🧩 Descrizione Moduli

#### **constants.js**
- Definizioni di ruoli utente e configurazioni sezioni
- Tipi di notifica e configurazioni
- Utenti di esempio per modalità demo

#### **utils.js**
- Funzioni di utilità condivise (formatTime, escapeHtml, ecc.)
- Gestione percorsi dati Firebase/localStorage
- Validazione e controllo permessi

#### **notifications.js**
- Sistema completo di notifiche real-time
- Gestione badge numerici per sezioni
- Popup e pannello notifiche centralizzato

#### **auth.js**
- Autenticazione Firebase e locale
- Gestione sessioni utente
- Login/registrazione con validazione

#### **ui.js**
- Gestione interfaccia utente e responsive design
- Event handlers globali e keyboard shortcuts
- Componenti UI riutilizzabili

#### **chat.js**
- Sistema di messaggistica real-time
- Gestione emoticon e formattazione messaggi
- Indicatori di digitazione e presenza

#### **forum.js**
- Gestione thread e commenti
- Sistema di moderazione contenuti
- Visualizzazione e navigazione forum

#### **admin.js**
- Pannello amministrativo completo
- Gestione utenti, clan e permessi
- Statistiche e esportazione dati

#### **app.js**
- Orchestrazione generale dell'applicazione
- Gestione stato globale e navigazione
- Dashboard principale e routing

## 🚀 Setup e Installazione

### 1. **Clona il Repository**
```bash
git clone <repository-url>
cd hustle-castle-forum
```

### 2. **Configurazione Firebase (Opzionale)**

Per utilizzare Firebase in produzione:

1. Crea un progetto su [Firebase Console](https://console.firebase.google.com)
2. Abilita Authentication (Email/Password e Google)
3. Configura Realtime Database
4. Copia le credenziali in `firebase-config.js`

```javascript
// firebase-config.js
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project.firebasedatabase.app",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 3. **Regole Database Firebase**

Configura le regole del database per sicurezza:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'superuser'"
      }
    },
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "threads": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "presence": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 4. **Modalità Demo Locale**

Senza Firebase, il forum funziona in modalità demo con:
- Utenti di esempio preconfigurati
- Dati salvati in localStorage
- Funzionalità complete simulate

**Utenti Demo:**
- **Super Admin**: admin@hustlecastle.com / admin123
- **Clan Moderator**: mod@draghi.com / mod123  
- **User**: player@leoni.com / player123

### 5. **Deploy**

#### **Hosting Statico**
Il forum può essere hostato su qualsiasi servizio di hosting statico:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting

#### **Deploy su Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📖 Guida Utilizzo

### 🔐 **Sistema di Autenticazione**

#### **Registrazione Nuovo Utente**
1. Clicca su "Registrati" nella schermata di login
2. Inserisci email, password e username
3. Il primo utente registrato diventa automaticamente Super Admin

#### **Ruoli Utente**
- **User**: Accesso base a forum e chat generale
- **Clan Moderator**: + Moderazione contenuti del proprio clan
- **Super Admin**: + Gestione completa utenti, clan e sistema

### 🏰 **Gestione Clan**

#### **Unirsi a un Clan**
1. Contatta un amministratore
2. Verrà assegnato al clan desiderato
3. Accesso immediato alle sezioni clan

#### **Moderazione Clan**
I moderatori possono:
- Approvare/rifiutare thread del clan
- Gestire contenuti della bacheca clan
- Monitorare attività membri

### 💬 **Sistema Chat e Forum**

#### **Creazione Thread**
1. Naviga alla sezione desiderata
2. Clicca "Nuovo Thread" 
3. Compila titolo e contenuto
4. Thread clan richiedono approvazione moderatore

#### **Chat Real-time**
- Messaggi istantanei con emoji
- Indicatori di digitazione
- Cronologia completa conversazioni

### 🔔 **Centro Notifiche**

#### **Tipi di Notifica**
- 🆕 Nuovi messaggi nelle chat
- 📝 Thread in attesa di moderazione  
- ✅ Approvazioni/rifiuti contenuti
- 👥 Inviti clan e aggiornamenti ruolo

#### **Gestione Notifiche**
- Badge numerici su sezioni con novità
- Click su campanella per centro notifiche
- Notifiche automaticamente marcate come lette

## ⚙️ Configurazione Avanzata

### 🎨 **Personalizzazione Tema**

Modifica `style.css` per personalizzare:
- Colori del tema (variabili CSS)
- Animazioni e transizioni
- Layout responsive

### 🔧 **Estensione Funzionalità**

#### **Aggiungere Nuove Sezioni**
1. Aggiorna `SECTION_CONFIG` in `constants.js`
2. Implementa logica in modulo appropriato
3. Aggiorna navigazione in `index.html`

#### **Nuovi Tipi di Notifica**
1. Definisci in `NOTIFICATION_TYPES`
2. Implementa logica in `notifications.js`
3. Aggiorna UI per visualizzazione

### 📊 **Monitoring e Analytics**

#### **Statistiche Integrate**
- Contatori utenti, messaggi, thread
- Metriche attività clan
- Dashboard amministrativa

#### **Esportazione Dati**
- Export CSV utenti e clan
- Backup conversazioni
- Statistiche di utilizzo

## 🐛 Debugging e Troubleshooting

### **Problemi Comuni**

#### **Firebase non si connette**
```javascript
// Controlla configurazione in index.html
console.log('Firebase Config:', firebaseConfig);
console.log('Firebase App:', window.firebaseApp);
```

#### **Notifiche non funzionano**
```javascript
// Debug sistema notifiche
Notifications.reset(); // Resetta notifiche
localStorage.clear(); // Pulisci cache locale
```

#### **Permessi negati**
- Verifica ruolo utente in dashboard
- Controlla regole Firebase Database
- Validate configurazione clan

### **Console Commands**

Comandi utili per debugging:

```javascript
// Riavvia applicazione
App.restart();

// Pulisci tutto e riavvia
localStorage.clear();
location.reload();

// Info utente corrente
console.log('User:', window.currentUser);
console.log('User Data:', window.currentUserData);

// Statistiche forum
console.log('Stats:', Utils.getForumStats());

// Reset notifiche
Notifications.reset();
```

## 🔮 Roadmap Futuri Sviluppi

### **Versione 2.0**
- [ ] Sistema di like/reazioni ai messaggi
- [ ] Upload immagini e file
- [ ] Ricerca avanzata globale
- [ ] Sistema di badge e achievement
- [ ] API REST per integrazioni esterne

### **Versione 2.5**
- [ ] App mobile nativa (React Native)
- [ ] Notifiche push
- [ ] Sistema di ranking utenti
- [ ] Integrazione calendario eventi
- [ ] Modalità offline avanzata

### **Versione 3.0**
- [ ] Video chat integrata
- [ ] Sistema di tournament e competizioni
- [ ] Marketplace interno
- [ ] Bot AI per supporto automatico
- [ ] Multi-lingua completo

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi `LICENSE` per dettagli.

## 🤝 Contributi

Contributi benvenuti! Per contribuire:

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit delle modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

### **Guidelines Contributi**
- Segui la struttura modulare esistente
- Aggiungi test per nuove funzionalità
- Aggiorna documentazione per modifiche
- Mantieni compatibilità backwards

## 💬 Supporto

Per supporto e domande:
- 📧 Email: support@hustlecastleforum.com
- 💬 Discord: [Community Server](https://discord.gg/hustlecastle)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 Wiki: [Documentazione Estesa](https://wiki.hustlecastleforum.com)

---

**Realizzato con ❤️ per la community di Hustle Castle**

*Un forum che unisce guerrieri di tutto il mondo!* 🏰⚔️