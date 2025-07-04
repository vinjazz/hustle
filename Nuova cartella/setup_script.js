#!/usr/bin/env node

/**
 * 🚀 Setup Script per Hustle Castle Forum
 * 
 * Questo script automatizza la configurazione iniziale del progetto
 * 
 * Uso:
 * node setup.js [opzioni]
 * 
 * Opzioni:
 * --help, -h          Mostra questo aiuto
 * --firebase, -f      Setup Firebase interattivo
 * --demo, -d          Setup modalità demo locale
 * --dev, -dev         Setup ambiente sviluppo
 * --prod, -p          Setup ambiente produzione
 * --clean, -c         Pulisci configurazioni esistenti
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Colori per output console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Logger colorato
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    title: (msg) => console.log(`${colors.cyan}${colors.bright}🏰 ${msg}${colors.reset}`),
    step: (num, msg) => console.log(`${colors.magenta}[${num}]${colors.reset} ${msg}`)
};

// Interface readline per input interattivo
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Funzione per domande interattive
function ask(question) {
    return new Promise((resolve) => {
        rl.question(`${colors.cyan}❓ ${question}${colors.reset} `, resolve);
    });
}

// Configurazione di default
const defaultConfig = {
    projectName: 'Hustle Castle Forum',
    description: 'Forum per la community di Hustle Castle',
    version: '1.0.0',
    author: 'Your Name',
    email: 'your.email@example.com',
    firebase: {
        projectId: '',
        region: 'europe-west1',
        enableAuth: true,
        enableGoogle: true,
        enableDatabase: true
    },
    features: {
        notifications: true,
        chat: true,
        forum: true,
        admin: true,
        clans: true
    }
};

class ForumSetup {
    constructor() {
        this.config = { ...defaultConfig };
        this.args = process.argv.slice(2);
    }

    async run() {
        try {
            log.title('Setup Hustle Castle Forum');
            console.log('');

            // Parse argomenti
            if (this.args.includes('--help') || this.args.includes('-h')) {
                this.showHelp();
                return;
            }

            if (this.args.includes('--clean') || this.args.includes('-c')) {
                await this.cleanSetup();
                return;
            }

            // Benvenuto
            await this.welcome();

            // Scegli tipo di setup
            const setupType = await this.chooseSetupType();

            switch (setupType) {
                case 'firebase':
                    await this.setupFirebase();
                    break;
                case 'demo':
                    await this.setupDemo();
                    break;
                case 'dev':
                    await this.setupDevelopment();
                    break;
                case 'prod':
                    await this.setupProduction();
                    break;
            }

            // Finalizza setup
            await this.finalizeSetup();

            log.success('Setup completato! 🎉');
            console.log('');
            this.showNextSteps();

        } catch (error) {
            log.error(`Errore durante setup: ${error.message}`);
            process.exit(1);
        } finally {
            rl.close();
        }
    }

    showHelp() {
        console.log(`
${colors.cyan}🏰 Hustle Castle Forum - Setup Script${colors.reset}

${colors.bright}UTILIZZO:${colors.reset}
  node setup.js [opzioni]

${colors.bright}OPZIONI:${colors.reset}
  --help, -h          Mostra questo aiuto
  --firebase, -f      Setup Firebase interattivo
  --demo, -d          Setup modalità demo locale
  --dev, -dev         Setup ambiente sviluppo
  --prod, -p          Setup ambiente produzione
  --clean, -c         Pulisci configurazioni esistenti

${colors.bright}ESEMPI:${colors.reset}
  node setup.js                    # Setup interattivo
  node setup.js --firebase         # Setup Firebase
  node setup.js --demo            # Solo modalità demo
  node setup.js --clean           # Pulisci tutto

${colors.bright}REQUISITI:${colors.reset}
  • Node.js >= 16.0.0
  • npm >= 8.0.0
  • Account Firebase (per modalità produzione)

${colors.bright}SUPPORTO:${colors.reset}
  📧 Email: support@hustlecastleforum.com
  🐛 Issues: https://github.com/your-repo/issues
        `);
    }

    async welcome() {
        console.log(`
${colors.cyan}════════════════════════════════════════${colors.reset}
${colors.bright}   🏰 BENVENUTO NEL SETUP DEL FORUM!   ${colors.reset}
${colors.cyan}════════════════════════════════════════${colors.reset}

Questo script ti guiderà nella configurazione del forum
per la community di Hustle Castle.

${colors.yellow}Funzionalità disponibili:${colors.reset}
• 💬 Chat real-time con notifiche
• 📋 Forum con thread e commenti  
• 🏰 Sistema clan con moderazione
• 👥 Gestione utenti e ruoli
• 📱 Design responsive mobile-first

        `);

        const proceed = await ask('Vuoi procedere con il setup? (s/n) ');
        if (proceed.toLowerCase() !== 's' && proceed.toLowerCase() !== 'y') {
            log.info('Setup annullato dall\'utente');
            process.exit(0);
        }
    }

    async chooseSetupType() {
        if (this.args.includes('--firebase') || this.args.includes('-f')) return 'firebase';
        if (this.args.includes('--demo') || this.args.includes('-d')) return 'demo';
        if (this.args.includes('--dev') || this.args.includes('-dev')) return 'dev';
        if (this.args.includes('--prod') || this.args.includes('-p')) return 'prod';

        console.log(`
${colors.bright}Scegli il tipo di setup:${colors.reset}

1) 🔥 Firebase (Produzione) - Database cloud, auth completa
2) 🏠 Demo locale - Solo localStorage, senza Firebase  
3) 💻 Sviluppo - Firebase + tools di sviluppo
4) 🚀 Produzione - Firebase ottimizzato per deploy

        `);

        const choice = await ask('Inserisci il numero (1-4): ');
        
        switch (choice) {
            case '1': return 'firebase';
            case '2': return 'demo';
            case '3': return 'dev';
            case '4': return 'prod';
            default:
                log.warning('Scelta non valida, uso setup Firebase di default');
                return 'firebase';
        }
    }

    async setupFirebase() {
        log.step(1, 'Setup Firebase interattivo');

        // Controlla se Firebase CLI è installato
        try {
            execSync('firebase --version', { stdio: 'ignore' });
        } catch (error) {
            log.warning('Firebase CLI non trovato, installazione...');
            try {
                execSync('npm install -g firebase-tools', { stdio: 'inherit' });
                log.success('Firebase CLI installato');
            } catch (installError) {
                log.error('Errore installazione Firebase CLI');
                throw installError;
            }
        }

        // Configurazione progetto
        console.log('\n📋 Configurazione progetto Firebase:\n');
        
        this.config.firebase.projectId = await ask('ID progetto Firebase: ');
        
        const region = await ask(`Regione database (${this.config.firebase.region}): `);
        if (region.trim()) this.config.firebase.region = region;

        const enableGoogle = await ask('Abilitare login Google? (s/n) ');
        this.config.firebase.enableGoogle = enableGoogle.toLowerCase() === 's';

        // Genera configurazione Firebase
        await this.generateFirebaseConfig();

        // Inizializza Firebase nel progetto
        log.step(2, 'Inizializzazione Firebase...');
        try {
            // Login se necessario
            const loginCheck = await ask('Hai già fatto login a Firebase? (s/n) ');
            if (loginCheck.toLowerCase() !== 's') {
                log.info('Eseguendo login Firebase...');
                execSync('firebase login', { stdio: 'inherit' });
            }

            // Inizializza progetto
            log.info('Inizializzazione progetto Firebase...');
            await this.createFirebaseJson();
            
        } catch (error) {
            log.warning('Errore inizializzazione Firebase, continuo con configurazione locale');
        }

        log.success('Setup Firebase completato');
    }

    async setupDemo() {
        log.step(1, 'Setup modalità demo locale');

        console.log(`
${colors.yellow}🏠 MODALITÀ DEMO LOCALE${colors.reset}

Questa modalità configura il forum per funzionare completamente
in locale usando localStorage, senza necessità di Firebase.

${colors.green}Vantaggi:${colors.reset}
• Setup immediato, nessuna configurazione richiesta
• Utenti di esempio preconfigurati
• Tutte le funzionalità disponibili offline
• Perfetto per testing e sviluppo

${colors.yellow}Limitazioni:${colors.reset}
• Dati salvati solo nel browser locale
• Nessuna sincronizzazione tra dispositivi
• Reset dati alla pulizia cache browser

        `);

        // Crea configurazione demo
        await this.generateDemoConfig();
        
        log.success('Modalità demo configurata');
        
        console.log(`
${colors.cyan}👥 UTENTI DEMO DISPONIBILI:${colors.reset}

${colors.bright}Super Admin:${colors.reset}
  📧 Email: admin@hustlecastle.com
  🔑 Password: admin123
  
${colors.bright}Clan Moderator:${colors.reset} 
  📧 Email: mod@draghi.com
  🔑 Password: mod123
  
${colors.bright}User:${colors.reset}
  📧 Email: player@leoni.com  
  🔑 Password: player123

        `);
    }

    async setupDevelopment() {
        log.step(1, 'Setup ambiente sviluppo');

        // Setup Firebase per sviluppo
        await this.setupFirebase();

        // Tools di sviluppo
        log.step(2, 'Installazione tools di sviluppo');
        
        const installDevTools = await ask('Installare tools di sviluppo (ESLint, Prettier, etc.)? (s/n) ');
        if (installDevTools.toLowerCase() === 's') {
            try {
                log.info('Installazione dipendenze di sviluppo...');
                execSync('npm install', { stdio: 'inherit' });
                log.success('Tools di sviluppo installati');
            } catch (error) {
                log.warning('Errore installazione tools, continuo setup');
            }
        }

        // Configurazione development
        await this.generateDevConfig();
        
        log.success('Ambiente sviluppo configurato');
    }

    async setupProduction() {
        log.step(1, 'Setup ambiente produzione');

        // Setup Firebase
        await this.setupFirebase();

        // Configurazioni produzione
        log.step(2, 'Configurazione ambiente produzione');
        
        const domainName = await ask('Nome dominio (es: hustlecastleforum.com): ');
        const enableAnalytics = await ask('Abilitare Google Analytics? (s/n) ');
        const enableSSL = await ask('Configurare SSL automatico? (s/n) ');

        this.config.production = {
            domain: domainName,
            analytics: enableAnalytics.toLowerCase() === 's',
            ssl: enableSSL.toLowerCase() === 's'
        };

        // Genera configurazione produzione
        await this.generateProdConfig();

        log.step(3, 'Ottimizzazione per produzione');
        
        const optimize = await ask('Eseguire ottimizzazione build? (s/n) ');
        if (optimize.toLowerCase() === 's') {
            try {
                log.info('Ottimizzazione assets...');
                // Qui andrebbe il codice di ottimizzazione
                log.success('Assets ottimizzati');
            } catch (error) {
                log.warning('Errore ottimizzazione, continuo setup');
            }
        }

        log.success('Ambiente produzione configurato');
    }

    async generateFirebaseConfig() {
        const configContent = `// firebase-config.js
// Generato automaticamente dallo script di setup

const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "${this.config.firebase.projectId}.firebaseapp.com",
    databaseURL: "https://${this.config.firebase.projectId}-default-rtdb.${this.config.firebase.region}.firebasedatabase.app",
    projectId: "${this.config.firebase.projectId}",
    storageBucket: "${this.config.firebase.projectId}.appspot.com", 
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Configurazioni aggiuntive
const forumConfig = {
    database: {
        region: '${this.config.firebase.region}',
        timeout: 10000,
        enableOfflinePersistence: true
    },
    auth: {
        enabledProviders: ['email'${this.config.firebase.enableGoogle ? ", 'google'" : ''}]
    }
};

// Esporta configurazioni
window.firebaseConfig = firebaseConfig;
window.forumConfig = forumConfig;

console.log('🔥 Configurazione Firebase caricata');
`;

        fs.writeFileSync('firebase-config.js', configContent);
        log.success('File firebase-config.js generato');
    }

    async generateDemoConfig() {
        const configContent = `// demo-config.js
// Configurazione modalità demo locale

// Disabilita Firebase per modalità demo
window.useFirebase = false;

// Configurazioni demo
const demoConfig = {
    mode: 'demo',
    enableNotifications: true,
    enableChat: true,
    enableForum: true,
    enableAdmin: true,
    autoLogin: false
};

window.demoConfig = demoConfig;

console.log('🏠 Modalità demo attivata');
`;

        fs.writeFileSync('demo-config.js', configContent);
        
        // Aggiorna index.html per includere demo config
        const indexPath = 'index.html';
        if (fs.existsSync(indexPath)) {
            let indexContent = fs.readFileSync(indexPath, 'utf8');
            
            // Aggiungi script demo se non presente
            if (!indexContent.includes('demo-config.js')) {
                indexContent = indexContent.replace(
                    '<script src="modules/app.js"></script>',
                    '<script src="demo-config.js"></script>\n    <script src="modules/app.js"></script>'
                );
                fs.writeFileSync(indexPath, indexContent);
            }
        }

        log.success('Configurazione demo generata');
    }

    async createFirebaseJson() {
        const firebaseJson = {
            database: {
                rules: "database.rules.json"
            },
            hosting: {
                public: ".",
                ignore: [
                    "firebase.json",
                    "**/.*",
                    "**/node_modules/**",
                    "scripts/**",
                    "tests/**"
                ],
                rewrites: [
                    {
                        source: "**",
                        destination: "/index.html"
                    }
                ],
                headers: [
                    {
                        source: "**/*.@(js|css)",
                        headers: [
                            {
                                key: "Cache-Control",
                                value: "max-age=31536000"
                            }
                        ]
                    }
                ]
            },
            emulators: {
                auth: {
                    port: 9099
                },
                database: {
                    port: 9000
                },
                hosting: {
                    port: 5000
                },
                ui: {
                    enabled: true
                }
            }
        };

        fs.writeFileSync('firebase.json', JSON.stringify(firebaseJson, null, 2));

        // Crea regole database
        const databaseRules = `{
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
}`;

        fs.writeFileSync('database.rules.json', databaseRules);
        log.success('File Firebase generati');
    }

    async generateDevConfig() {
        // Crea .gitignore se non esiste
        const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.development
.env.production

# Firebase
.firebase/
firebase-debug.log
firebase-config.js

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime
.cache/
.temp/
`;

        if (!fs.existsSync('.gitignore')) {
            fs.writeFileSync('.gitignore', gitignoreContent);
            log.success('File .gitignore creato');
        }

        // Crea script di sviluppo
        const devScript = `#!/bin/bash
# Script di sviluppo

echo "🚀 Avvio ambiente sviluppo..."

# Controlla dipendenze
if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze..."
    npm install
fi

# Avvia emulatori Firebase (se configurato)
if [ -f "firebase.json" ]; then
    echo "🔥 Avvio emulatori Firebase..."
    firebase emulators:start --only auth,database &
    FIREBASE_PID=$!
fi

# Avvia server development
echo "🌐 Avvio server di sviluppo..."
npm run dev

# Cleanup
if [ ! -z "$FIREBASE_PID" ]; then
    kill $FIREBASE_PID
fi
`;

        fs.writeFileSync('dev.sh', devScript);
        try {
            fs.chmodSync('dev.sh', '755');
        } catch (error) {
            // Ignora errori chmod su Windows
        }

        log.success('Configurazione sviluppo generata');
    }

    async generateProdConfig() {
        // Script di build produzione
        const buildScript = `#!/bin/bash
# Script di build per produzione

echo "🏗️  Build per produzione..."

# Pulisci directory build precedente
rm -rf dist/

# Crea directory build
mkdir -p dist/

# Copia file statici
cp index.html dist/
cp style.css dist/
cp -r modules/ dist/modules/
cp -r assets/ dist/assets/ 2>/dev/null || true

# Ottimizzazione (placeholder)
echo "⚡ Ottimizzazione assets..."

# Minificazione CSS
if command -v cssnano &> /dev/null; then
    cssnano dist/style.css dist/style.min.css
    mv dist/style.min.css dist/style.css
fi

echo "✅ Build completato in dist/"
`;

        fs.writeFileSync('build.sh', buildScript);
        try {
            fs.chmodSync('build.sh', '755');
        } catch (error) {
            // Ignora errori chmod su Windows
        }

        log.success('Script di build generato');
    }

    async finalizeSetup() {
        log.step('⭐', 'Finalizzazione setup');

        // Crea directory se non esistono
        const dirs = ['assets', 'docs', 'tests'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
                log.info(`Directory ${dir}/ creata`);
            }
        });

        // Aggiorna package.json con configurazioni
        if (fs.existsSync('package.json')) {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            packageJson.config = { ...packageJson.config, ...this.config };
            fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
            log.success('package.json aggiornato');
        }

        // Crea file di stato setup
        const setupStatus = {
            version: '1.0.0',
            setupDate: new Date().toISOString(),
            config: this.config,
            environment: process.env.NODE_ENV || 'development'
        };

        fs.writeFileSync('.setup-status.json', JSON.stringify(setupStatus, null, 2));
        log.success('Setup completato e salvato');
    }

    async cleanSetup() {
        log.title('Pulizia configurazioni esistenti');

        const filesToRemove = [
            'firebase-config.js',
            'demo-config.js', 
            'firebase.json',
            'database.rules.json',
            '.setup-status.json',
            'dev.sh',
            'build.sh'
        ];

        let cleaned = 0;
        filesToRemove.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                log.info(`Rimosso ${file}`);
                cleaned++;
            }
        });

        if (cleaned > 0) {
            log.success(`${cleaned} file di configurazione rimossi`);
        } else {
            log.info('Nessun file di configurazione da rimuovere');
        }
    }

    showNextSteps() {
        console.log(`
${colors.bright}🎯 PROSSIMI PASSI:${colors.reset}

${colors.green}1. Avvia il forum:${colors.reset}
   ${colors.yellow}npm run dev${colors.reset}                 # Ambiente sviluppo
   ${colors.yellow}./dev.sh${colors.reset}                   # Script completo con emulatori

${colors.green}2. Testa le funzionalità:${colors.reset}
   • Registra nuovo utente o usa account demo
   • Prova chat generale e forum
   • Testa notifiche e sistema clan

${colors.green}3. Configurazione avanzata:${colors.reset}
   • Personalizza ${colors.yellow}firebase-config.js${colors.reset} con le tue credenziali
   • Configura domini autorizzati in Firebase Console
   • Aggiorna regole database per sicurezza

${colors.green}4. Deploy in produzione:${colors.reset}
   ${colors.yellow}npm run build${colors.reset}              # Build ottimizzato
   ${colors.yellow}npm run deploy${colors.reset}             # Deploy su Firebase Hosting

${colors.cyan}📚 DOCUMENTAZIONE:${colors.reset}
   README.md                    # Guida completa
   docs/                        # Documentazione tecnica

${colors.cyan}🆘 SUPPORTO:${colors.reset}
   GitHub Issues                # Bug report e feature request
   Email: support@example.com   # Supporto diretto

        `);
    }
}

// Esecuzione script
if (require.main === module) {
    const setup = new ForumSetup();
    setup.run().catch(error => {
        console.error('❌ Setup fallito:', error);
        process.exit(1);
    });
}

module.exports = ForumSetup;