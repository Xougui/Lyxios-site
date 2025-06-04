document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const discordLoginBtn = document.getElementById('discord-login-btn');

    // URLs des bots et panels
    const publicBots = [
        { name: 'Lyxios', url: 'http://46.247.108.59:6138' },
        { name: 'Manage Bot', url: 'http://194.164.125.5:6198' }
    ];

    const privateBots = [
        ...publicBots, // Inclut les bots publics dans la liste privée
        { name: 'Panel Lyxios', url: 'https://panel.sillydev.co.uk/server/e1d7c54c' },
        { name: 'Panel Manage Bot', url: 'https://panel.sillydev.co.uk/server/c299135d' }
    ];

    // URL de redirection Discord OAuth2
    const discordAuthUrl = "https://discord.com/oauth2/authorize?client_id=1344712966351884431&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A5001%2Fcallback&scope=identify+guilds";
    const flaskBotBaseUrl = "http://127.0.0.1:5001"; // L'URL de votre bot Flask pour l'authentification et la vérification d'owner

    // --- Gestion du thème clair/sombre ---
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if (currentTheme === 'dark') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    } else {
        // Définir le thème par défaut sur clair si aucun n'est stocké
        document.body.classList.add('light');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
    }

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('light')) {
            document.body.classList.replace('light', 'dark');
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            document.body.classList.replace('dark', 'light');
            localStorage.setItem('theme', 'light');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    });

    // --- Connexion Discord ---
    discordLoginBtn.addEventListener('click', () => {
        window.location.href = discordAuthUrl;
    });

    // Fonction pour vérifier le statut d'une URL
    async function checkStatus(url) {
        try {
            // Utiliser un proxy CORS si nécessaire, ou configurer CORS sur le serveur Flask
            // Pour l'exemple, nous supposons que Flask gère CORS.
            const response = await fetch(url, { mode: 'cors' });
            return response.status;
        } catch (error) {
            console.error(`Erreur lors de la vérification de l'URL ${url}:`, error);
            return null; // Indique une erreur de connexion ou autre
        }
    }

    // Fonction pour mettre à jour l'affichage du statut
    function updateStatusDisplay(containerId, bots, isPrivate = false) {
        const container = document.getElementById(containerId);
        if (!container) return; // S'assurer que le conteneur existe

        container.innerHTML = ''; // Nettoyer le contenu existant

        bots.forEach(async bot => {
            const statusCard = document.createElement('div');
            statusCard.className = 'bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-lg flex items-center justify-between border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-transform duration-300 cursor-pointer';
            statusCard.dataset.url = bot.url; // Stocker l'URL pour la page de monitoring
            statusCard.dataset.name = bot.name; // Stocker le nom pour la page de monitoring

            const botName = document.createElement('h3');
            botName.className = 'text-xl font-bold';
            botName.textContent = bot.name;

            const statusDiv = document.createElement('div');
            statusDiv.className = 'flex items-center';

            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'status-indicator w-4 h-4 rounded-full mr-2 bg-gray-400 animate-pulse'; // Initialisé en gris/pulsant

            const statusText = document.createElement('span');
            statusText.className = 'status-text text-lg';
            statusText.textContent = 'Chargement...';

            statusDiv.appendChild(statusIndicator);
            statusDiv.appendChild(statusText);
            statusCard.appendChild(botName);
            statusCard.appendChild(statusDiv);
            container.appendChild(statusCard);

            // Ajouter un écouteur d'événements pour la page de monitoring
            if (isPrivate) { // Seules les cartes privées peuvent mener au monitoring
                statusCard.addEventListener('click', () => {
                    window.location.href = `monitor.html?name=${encodeURIComponent(bot.name)}&url=${encodeURIComponent(bot.url)}`;
                });
            }

            const statusCode = await checkStatus(bot.url);

            if (statusCode === 200) {
                statusIndicator.classList.remove('bg-gray-400', 'animate-pulse');
                statusIndicator.classList.add('online');
                statusText.textContent = 'En ligne (200)';
                statusText.classList.remove('text-gray-600');
                statusText.classList.add('text-green-600', 'dark:text-green-400');
            } else if (statusCode !== null) {
                statusIndicator.classList.remove('bg-gray-400', 'animate-pulse');
                statusIndicator.classList.add('offline');
                statusText.textContent = `Hors ligne (${statusCode})`;
                statusText.classList.remove('text-gray-600');
                statusText.classList.add('text-red-600', 'dark:text-red-400');
            } else {
                statusIndicator.classList.remove('bg-gray-400', 'animate-pulse');
                statusIndicator.classList.add('unknown');
                statusText.textContent = 'Inconnu';
                statusText.classList.remove('text-gray-600');
                statusText.classList.add('text-yellow-600', 'dark:text-yellow-400');
            }
        });
    }

    // --- Vérification de l'owner (pour la page privée) ---
    async function checkOwnerStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            try {
                // Envoyer le code d'autorisation au bot Flask pour échange et vérification
                const response = await fetch(`${flaskBotBaseUrl}/verify_owner?code=${code}`);
                const data = await response.json();

                if (data.is_owner) {
                    // Si l'utilisateur est owner, afficher les statuts privés
                    updateStatusDisplay('status-container-private', privateBots, true);
                } else {
                    // Si pas owner, afficher un message d'erreur ou rediriger
                    const privateStatusSection = document.getElementById('private-status');
                    if (privateStatusSection) {
                        privateStatusSection.innerHTML = '<p class="text-center text-red-500 text-2xl font-bold">Accès refusé. Vous n\'êtes pas un owner du bot.</p>';
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la vérification de l'owner:", error);
                const privateStatusSection = document.getElementById('private-status');
                if (privateStatusSection) {
                    privateStatusSection.innerHTML = '<p class="text-center text-red-500 text-2xl font-bold">Erreur lors de la connexion. Veuillez réessayer.</p>';
                }
            }
        } else if (window.location.pathname.includes('status-private.html')) {
            // Si sur la page privée sans code, inviter à se connecter
            const privateStatusSection = document.getElementById('private-status');
            if (privateStatusSection) {
                privateStatusSection.innerHTML = '<p class="text-center text-xl">Veuillez vous connecter avec Discord pour accéder à cette page.</p>';
            }
        }
    }

    // --- Logique pour la page de monitoring (monitor.html) ---
    function initializeMonitorPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const botName = urlParams.get('name');
        const botUrl = urlParams.get('url');

        const monitorTitle = document.getElementById('monitor-title');
        const currentStatusIndicator = document.getElementById('current-status-indicator');
        const currentStatusText = document.getElementById('current-status-text');
        const lastChecked = document.getElementById('last-checked');
        const serviceUrlElement = document.getElementById('service-url');
        const statusHistoryChart = document.getElementById('status-history-chart');

        if (botName && botUrl) {
            monitorTitle.textContent = `Moniteur de Statut : ${decodeURIComponent(botName)}`;
            serviceUrlElement.innerHTML = `URL: <a href="${decodeURIComponent(botUrl)}" target="_blank" class="text-blue-500 hover:underline">${decodeURIComponent(botUrl)}</a>`;

            // Fonction pour mettre à jour le statut et l'historique
            async function updateMonitorStatus() {
                const statusCode = await checkStatus(decodeURIComponent(botUrl));
                const now = new Date();
                lastChecked.textContent = now.toLocaleString('fr-FR');

                // Mettre à jour le statut actuel
                currentStatusIndicator.classList.remove('online', 'offline', 'unknown', 'bg-gray-400', 'animate-pulse');
                currentStatusText.classList.remove('text-green-600', 'dark:text-green-400', 'text-red-600', 'dark:text-red-400', 'text-yellow-600', 'dark:text-yellow-400');

                if (statusCode === 200) {
                    currentStatusIndicator.classList.add('online');
                    currentStatusText.textContent = 'En ligne (200)';
                    currentStatusText.classList.add('text-green-600', 'dark:text-green-400');
                } else if (statusCode !== null) {
                    currentStatusIndicator.classList.add('offline');
                    currentStatusText.textContent = `Hors ligne (${statusCode})`;
                    currentStatusText.classList.add('text-red-600', 'dark:text-red-400');
                } else {
                    currentStatusIndicator.classList.add('unknown');
                    currentStatusText.textContent = 'Inconnu';
                    currentStatusText.classList.add('text-yellow-600', 'dark:text-yellow-400');
                }

                // Pour l'historique, nous allons simuler des données pour l'exemple
                // Dans une application réelle, vous feriez une requête à votre backend pour l'historique
                const historyData = [];
                for (let i = 0; i < 50; i++) { // 50 points de données pour simuler 24h
                    // Simuler des statuts aléatoires pour l'exemple
                    historyData.push(Math.random() > 0.8 ? 'offline' : 'online');
                }

                statusHistoryChart.innerHTML = ''; // Nettoyer l'ancien graphique
                historyData.forEach(status => {
                    const bar = document.createElement('div');
                    bar.className = `status-bar ${status}`;
                    statusHistoryChart.appendChild(bar);
                });
            }

            // Mettre à jour le statut toutes les 30 secondes
            updateMonitorStatus();
            setInterval(updateMonitorStatus, 30000); // Mettre à jour toutes les 30 secondes
        } else {
            // Gérer le cas où le nom ou l'URL du bot est manquant
            monitorTitle.textContent = "Erreur : Bot non spécifié";
            serviceUrlElement.textContent = "URL: N/A";
            currentStatusText.textContent = "N/A";
            lastChecked.textContent = "N/A";
        }
    }


    // --- Exécution des fonctions en fonction de la page ---
    if (window.location.pathname.includes('status-public.html')) {
        updateStatusDisplay('status-container-public', publicBots);
        // Rafraîchir les statuts toutes les minutes
        setInterval(() => updateStatusDisplay('status-container-public', publicBots), 60000);
    } else if (window.location.pathname.includes('status-private.html')) {
        checkOwnerStatus();
        // Rafraîchir les statuts privés toutes les minutes après la vérification d'owner
        // La fonction checkOwnerStatus appellera updateStatusDisplay si l'utilisateur est owner
        // Vous pouvez ajouter un setInterval ici si vous voulez rafraîchir la page même si l'utilisateur n'est pas owner,
        // mais cela pourrait être redondant si l'accès est refusé.
        // Ou bien, si l'utilisateur est owner, vous pouvez déclencher un setInterval après le premier affichage.
    } else if (window.location.pathname.includes('monitor.html')) {
        initializeMonitorPage();
    }
});