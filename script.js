// Utiliser les objets Firebase initialisés dans index.html
const { auth, firestore } = window;

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBECxvN-5GSF1HNeA0nzm9v_izqoOxFhPY",
    authDomain: "crypto-analyse-26b5f.firebaseapp.com",
    projectId: "crypto-analyse-26b5f",
    storageBucket: "crypto-analyse-26b5f.firebasestorage.app",
    messagingSenderId: "260248103240",
    appId: "1:260248103240:web:6d095cff9bb3690f13eb7d",
    databaseURL: "https://crypto-analyse-26b5f-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Vérifier l'état de l'authentification
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Utilisateur connecté
        document.getElementById('app').style.display = 'block';
        initCryptoApp();
    } else {
        // Utilisateur non connecté, redirection vers la page de connexion
        window.location.href = 'login.html';
    }
});

// Gérer la déconnexion
document.getElementById('logoutBtn').addEventListener('click', () => {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Erreur lors de la déconnexion:', error);
        });
});

// Variables globales
let tableBody;
let searchInput;
let apiStatusElement;
let cryptoCounter;
let cryptoData = [];

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    tableBody = document.getElementById('cryptoTableBody');
    searchInput = document.getElementById('searchInput');
    apiStatusElement = document.querySelector('.api-status');
    cryptoCounter = document.getElementById('cryptoCounter');
    initCryptoApp();
});

// Fonction pour formater les nombres
const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
};

// Fonction pour formater les prix complets
const formatFullPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 8,
        maximumFractionDigits: 8
    }).format(price);
};

// Fonction pour formater les volumes
const formatVolume = (num) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'USD'
    }).format(num);
};

// Fonction pour calculer la moyenne mobile simple (SMA)
const calculateSMA = (prices, periods) => {
    if (prices.length < periods) return null;
    const sum = prices.slice(-periods).reduce((a, b) => a + b, 0);
    return sum / periods;
};

// Fonction pour calculer l'écart-type
const calculateStandardDeviation = (prices, sma, periods) => {
    if (prices.length < periods) return null;
    const squaredDifferences = prices.slice(-periods).map(price => Math.pow(price - sma, 2));
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / periods;
    return Math.sqrt(variance);
};

// Fonction pour calculer les Bandes de Bollinger
const calculateBollinger = (prices, periods = 20, standardDeviations = 2) => {
    const sma = calculateSMA(prices, periods);
    if (sma === null) return null;

    const standardDeviation = calculateStandardDeviation(prices, sma, periods);
    if (standardDeviation === null) return null;

    return {
        middle: sma,
        upper: sma + (standardDeviation * standardDeviations),
        lower: sma - (standardDeviation * standardDeviations),
        bandwidth: ((sma + (standardDeviation * standardDeviations)) - (sma - (standardDeviation * standardDeviations))) / sma
    };
};

// Fonction pour calculer le RSI
const calculateRSI = (prices, periods = 14) => {
    if (prices.length < periods) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < periods; i++) {
        const difference = prices[i] - prices[i - 1];
        if (difference >= 0) {
            gains += difference;
        } else {
            losses -= difference;
        }
    }

    let avgGain = gains / periods;
    let avgLoss = losses / periods;

    for (let i = periods; i < prices.length; i++) {
        const difference = prices[i] - prices[i - 1];
        
        if (difference >= 0) {
            avgGain = (avgGain * (periods - 1) + difference) / periods;
            avgLoss = (avgLoss * (periods - 1)) / periods;
        } else {
            avgGain = (avgGain * (periods - 1)) / periods;
            avgLoss = (avgLoss * (periods - 1) - difference) / periods;
        }
    }

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

// Fonction pour calculer les niveaux de Fibonacci
const calculateFibonacciLevels = (high, low) => {
    const diff = high - low;
    return {
        level0: high,                           // 100%
        level236: high - (diff * 0.236),       // 23.6%
        level382: high - (diff * 0.382),       // 38.2%
        level500: high - (diff * 0.5),         // 50%
        level618: high - (diff * 0.618),       // 61.8%
        level786: high - (diff * 0.786),       // 78.6%
        level1: low                            // 0%
    };
};

// Fonction pour analyser la position par rapport aux niveaux de Fibonacci
const analyzeFibonacciPosition = (currentPrice, ath, atl) => {
    const fibLevels = calculateFibonacciLevels(ath, atl);
    let position = '';
    let score = 0;
    
    if (currentPrice >= fibLevels.level0) {
        position = 'Au-dessus du plus haut';
        score = -80;
    } else if (currentPrice >= fibLevels.level236) {
        position = 'Entre 100% et 23.6%';
        score = -60;
    } else if (currentPrice >= fibLevels.level382) {
        position = 'Entre 23.6% et 38.2%';
        score = -40;
    } else if (currentPrice >= fibLevels.level500) {
        position = 'Entre 38.2% et 50%';
        score = -20;
    } else if (currentPrice >= fibLevels.level618) {
        position = 'Entre 50% et 61.8%';
        score = 20;
    } else if (currentPrice >= fibLevels.level786) {
        position = 'Entre 61.8% et 78.6%';
        score = 40;
    } else if (currentPrice >= fibLevels.level1) {
        position = 'Entre 78.6% et 100%';
        score = 60;
    } else {
        position = 'En dessous du plus bas';
        score = 80;
    }
    
    return { position, score };
};

// Fonction pour obtenir le signal de trading
const getTradeSignal = (crypto) => {
    const currentPrice = crypto.current_price;
    const ath = crypto.ath;
    const atl = crypto.atl;
    const priceChange = crypto.price_change_percentage_24h;
    
    // Analyse Fibonacci
    const fibAnalysis = analyzeFibonacciPosition(currentPrice, ath, atl);
    let totalScore = fibAnalysis.score;
    
    // Analyse de la tendance sur 24h
    if (priceChange <= -5) {
        totalScore += 30;
    } else if (priceChange <= -2) {
        totalScore += 15;
    } else if (priceChange >= 5) {
        totalScore -= 30;
    } else if (priceChange >= 2) {
        totalScore -= 15;
    }
    
    // Déterminer le signal final
    let signal, className, reason;
    if (totalScore >= 50) {
        signal = '🟢 ACHAT';
        className = 'buy-signal';
        reason = `Signal d'achat fort - ${fibAnalysis.position}, Variation 24h: ${priceChange.toFixed(2)}%`;
    } else if (totalScore >= 20) {
        signal = '🟡 SURVEILLANCE ACHAT';
        className = 'watch-buy-signal';
        reason = `Opportunité d'achat potentielle - ${fibAnalysis.position}, Variation 24h: ${priceChange.toFixed(2)}%`;
    } else if (totalScore <= -50) {
        signal = '🔴 VENTE';
        className = 'sell-signal';
        reason = `Signal de vente fort - ${fibAnalysis.position}, Variation 24h: ${priceChange.toFixed(2)}%`;
    } else if (totalScore <= -20) {
        signal = '🟡 SURVEILLANCE VENTE';
        className = 'watch-sell-signal';
        reason = `Risque de baisse - ${fibAnalysis.position}, Variation 24h: ${priceChange.toFixed(2)}%`;
    } else {
        signal = '⚪ NEUTRE';
        className = 'neutral-signal';
        reason = `Pas de signal clair - ${fibAnalysis.position}, Variation 24h: ${priceChange.toFixed(2)}%`;
    }
    
    return { signal, class: className, reason };
};

// Fonction pour afficher les données
async function displayData(data) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    data.forEach(crypto => {
        const row = createCryptoRow(crypto);
        tableBody.appendChild(row);
    });
    
    // Mettre à jour le compteur
    updateCryptoCounter(data.length);

    // Mettre à jour l'état des boutons favoris
    await updateFavoriteButtons();
}

// Fonction pour créer une ligne de crypto
function createCryptoRow(crypto) {
    const row = document.createElement('tr');
    const priceChangeClass = crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
    
    // Récupérer le prix d'achat depuis Firebase
    const user = firebase.auth().currentUser;
    if (user) {
        const db = firebase.firestore();
        db.collection('users').doc(user.uid)
          .collection('favorites')
          .doc(crypto.id)
          .get()
          .then((doc) => {
              if (doc.exists && doc.data().buyPrice) {
                  const buyPrice = doc.data().buyPrice;
                  const priceCell = row.querySelector('td:nth-child(4)');
                  if (priceCell) {
                      priceCell.setAttribute('data-purchase-price', buyPrice);
                      priceCell.setAttribute('data-current-price', crypto.current_price);
                  }
              }
          });
    }
    
    row.innerHTML = `
        <td><img src="${crypto.image}" alt="${crypto.name}" class="crypto-logo"></td>
        <td>${crypto.name}</td>
        <td>${crypto.symbol.toUpperCase()}</td>
        <td data-purchase-price="0" data-current-price="${crypto.current_price}">${formatFullPrice(crypto.current_price)}</td>
        <td class="${priceChangeClass}">${crypto.price_change_percentage_24h.toFixed(2)}%</td>
        <td>${formatVolume(crypto.total_volume)}</td>
        <td>${formatFullPrice(crypto.ath)}</td>
        <td>${crypto.ath_change_percentage.toFixed(2)}%</td>
        <td title="${getTradeSignal(crypto).reason}">
            ${getTradeSignal(crypto).signal}
        </td>
        <td class="action-cell">
            <button class="wallet-btn" data-crypto-id="${crypto.id}">
                <i class="fas fa-wallet"></i>
            </button>
            <button class="watch-btn" data-crypto-id="${crypto.id}">
                <i class="fas fa-eye"></i>
            </button>
        </td>
    `;
    
    // Ajouter l'écouteur d'événements pour le bouton wallet
    const walletBtn = row.querySelector('.wallet-btn');
    if (walletBtn) {
        walletBtn.addEventListener('click', () => handleWalletClick(crypto));
    }
    
    // Ajouter l'écouteur d'événements pour le bouton watch
    const watchBtn = row.querySelector('.watch-btn');
    if (watchBtn) {
        watchBtn.addEventListener('click', () => handleWatchClick(crypto));
    }
    
    return row;
}

// Fonction pour gérer le clic sur le bouton wallet
async function handleWalletClick(crypto) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Utilisateur non connecté');
            return;
        }

        const db = firebase.firestore();
        const userRef = db.collection('users').doc(user.uid);
        const favoritesRef = userRef.collection('favorites').doc(crypto.id);
        
        // Vérifie si la crypto est déjà en favoris
        const doc = await favoritesRef.get();
        
        if (doc.exists) {
            // Si elle existe déjà, on la retire des favoris
            await favoritesRef.delete();
            const btn = document.querySelector(`button[data-crypto-id="${crypto.id}"]`);
            if (btn) {
                btn.classList.remove('active');
            }
            showNotification('Crypto retirée des favoris', 'success');
        } else {
            // Si elle n'existe pas, on l'ajoute aux favoris
            const favoriteData = {
                id: crypto.id,
                name: crypto.name,
                symbol: crypto.symbol,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await favoritesRef.set(favoriteData);
            const btn = document.querySelector(`button[data-crypto-id="${crypto.id}"]`);
            if (btn) {
                btn.classList.add('active');
            }
            showNotification('Crypto ajoutée aux favoris', 'success');
        }
    } catch (error) {
        console.error('Erreur lors de la gestion des favoris:', error);
        showNotification('Erreur lors de la gestion des favoris', 'error');
    }
}

// Fonction pour gérer le clic sur le bouton watch
function handleWatchClick(crypto) {
    const modal = document.getElementById('cryptoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const priceDifference = document.getElementById('priceDifference');
    const buyPriceInput = document.getElementById('buyPrice');
    const sellPriceInput = document.getElementById('sellPrice');
    const savePricesBtn = document.getElementById('savePrices');
    
    if (modal && modalTitle && modalPrice) {
        modalTitle.textContent = crypto.name;
        modalPrice.textContent = `Prix actuel : ${formatFullPrice(crypto.current_price)}`;
        
        // Charger les prix existants s'ils existent
        loadPrices(crypto.id).then(prices => {
            buyPriceInput.value = prices.buyPrice || '';
            sellPriceInput.value = prices.sellPrice || '';
            
            // Calculer et afficher la différence de prix
            if (prices.buyPrice) {
                const difference = calculatePriceDifference(prices.buyPrice, crypto.current_price);
                const differenceClass = difference >= 0 ? 'positive' : 'negative';
                priceDifference.textContent = `Différence prix achat vs prix actuel : ${difference.toFixed(2)}%`;
                priceDifference.className = `price-difference ${differenceClass}`;
            } else {
                priceDifference.textContent = '';
            }
        });
        
        // Mettre à jour la différence quand le prix d'achat change
        buyPriceInput.addEventListener('input', () => {
            const buyPrice = parseFloat(buyPriceInput.value);
            if (buyPrice) {
                const difference = calculatePriceDifference(buyPrice, crypto.current_price);
                const differenceClass = difference >= 0 ? 'positive' : 'negative';
                priceDifference.textContent = `Différence prix achat vs prix actuel : ${difference.toFixed(2)}%`;
                priceDifference.className = `price-difference ${differenceClass}`;
            } else {
                priceDifference.textContent = '';
            }
        });
        
        // Gestionnaire pour le bouton de sauvegarde
        savePricesBtn.onclick = () => savePrices(crypto.id, buyPriceInput.value, sellPriceInput.value);
        
        modal.style.display = 'block';
    }
}

// Fonction pour calculer la différence de prix en pourcentage
function calculatePriceDifference(buyPrice, currentPrice) {
    return ((currentPrice - buyPrice) / buyPrice) * 100;
}

// Fonction pour charger les prix
async function loadPrices(cryptoId) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return { buyPrice: null, sellPrice: null };

        const db = firebase.firestore();
        const docRef = db.collection('users').doc(user.uid).collection('favorites').doc(cryptoId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            return {
                buyPrice: data.buyPrice || null,
                sellPrice: data.sellPrice || null
            };
        }
        return { buyPrice: null, sellPrice: null };
    } catch (error) {
        console.error('Erreur lors du chargement des prix:', error);
        return { buyPrice: null, sellPrice: null };
    }
}

// Fonction pour sauvegarder les prix
async function savePrices(cryptoId, buyPrice, sellPrice) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Veuillez vous connecter pour enregistrer les prix');
            return;
        }

        const db = firebase.firestore();
        const docRef = db.collection('users').doc(user.uid).collection('favorites').doc(cryptoId);
        
        await docRef.set({
            buyPrice: parseFloat(buyPrice) || null,
            sellPrice: parseFloat(sellPrice) || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        alert('Prix enregistrés avec succès !');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des prix:', error);
        alert('Erreur lors de l\'enregistrement des prix');
    }
}

// Fermer la modale quand on clique sur le X
document.querySelector('.close-modal')?.addEventListener('click', () => {
    document.getElementById('cryptoModal').style.display = 'none';
});

// Fermer la modale quand on clique en dehors
window.addEventListener('click', (event) => {
    const modal = document.getElementById('cryptoModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Fonction pour charger les favoris de l'utilisateur
async function loadUserFavorites() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return [];
        
        const db = firebase.firestore();
        const favoritesRef = db.collection('users').doc(user.uid).collection('favorites');
        const snapshot = await favoritesRef.get();
        
        if (!snapshot.empty) {
            return snapshot.docs.map(doc => doc.id);
        }
        return [];
    } catch (error) {
        console.error('Erreur lors du chargement des favoris:', error);
        return [];
    }
}

// Fonction pour mettre à jour l'état des boutons favoris
async function updateFavoriteButtons() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const db = firebase.firestore();
        const favoritesRef = db.collection('users').doc(user.uid).collection('favorites');
        const snapshot = await favoritesRef.get();
        const favorites = snapshot.docs.map(doc => doc.id);

        document.querySelectorAll('.wallet-btn').forEach(btn => {
            const cryptoId = btn.getAttribute('data-crypto-id');
            if (favorites.includes(cryptoId)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des boutons favoris:', error);
    }
}

// Fonction pour afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Fonction pour mettre à jour le statut de l'API
function updateApiStatus(isOnline) {
    const apiStatus = document.querySelector('.api-status');
    const statusText = apiStatus.querySelector('.status-text');
    
    if (apiStatus && statusText) {
        apiStatus.classList.remove('online', 'offline');
        
        if (isOnline) {
            apiStatus.classList.add('online');
            statusText.textContent = 'API en ligne';
        } else {
            apiStatus.classList.add('offline');
            statusText.textContent = 'API hors ligne';
        }
    }
}

// Fonction pour vérifier le statut de l'API
async function checkApiStatus() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/ping');
        updateApiStatus(response.ok);
    } catch (error) {
        console.error('Erreur lors de la vérification du statut de l\'API:', error);
        updateApiStatus(false);
    }
}

// Fonction pour mettre à jour le compteur de cryptos
function updateCryptoCounter(count) {
    const counter = document.getElementById('cryptoCounter');
    if (counter) {
        counter.textContent = `Nombre de cryptomonnaies affichées : ${count}`;
    }
}

// Fonction pour récupérer les données des cryptos
async function fetchCryptoData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false');
        if (!response.ok) {
            throw new Error('Erreur réseau');
        }
        const data = await response.json();
        cryptoData = data;
        displayData(data);
        updateApiStatus(true);
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        updateApiStatus(false);
    }
}

// Fonction d'initialisation de l'application
function initCryptoApp() {
    // Vérifier le statut de l'API
    checkApiStatus();
    
    // Charger les données initiales
    fetchCryptoData();
    
    // Mettre en place les écouteurs d'événements
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filteredData = cryptoData.filter(crypto => 
                crypto.name.toLowerCase().includes(query) ||
                crypto.symbol.toLowerCase().includes(query)
            );
            displayData(filteredData);
        });
    }
    
    const signalFilter = document.getElementById('signalFilter');
    if (signalFilter) {
        signalFilter.addEventListener('change', () => {
            const selectedSignal = signalFilter.value;
            let filteredData = cryptoData;
            
            if (selectedSignal !== '') {
                filteredData = cryptoData.filter(crypto => {
                    const signal = getTradeSignal(crypto);
                    return signal.signal.includes(selectedSignal);
                });
            }
            
            displayData(filteredData);
        });
    }
    
    const favoriteFilter = document.getElementById('favoriteFilter');
    if (favoriteFilter) {
        favoriteFilter.addEventListener('change', () => {
            filterTable();
        });
    }
    
    // Rafraîchir les données toutes les minutes
    setInterval(() => {
        checkApiStatus();
        fetchCryptoData();
    }, 60000);
}

// Fonction pour mettre à jour les données et vérifier les alertes
async function updateData() {
    try {
        // Récupérer les données de l'API
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=100&page=1&sparkline=true');
        cryptoData = await response.json();

        // Mettre à jour le tableau
        displayData(cryptoData);
    } catch (error) {
        console.error('Erreur lors de la mise à jour des données:', error);
    }
}

// Mettre à jour les données toutes les minutes
setInterval(updateData, 60000);

// Premier chargement des données
updateData();

// Fonction pour filtrer le tableau
function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const signalFilter = document.getElementById('signalFilter').value;
    const showFavoritesOnly = document.getElementById('favoriteFilter').checked;
    const rows = document.getElementById('cryptoTableBody').getElementsByTagName('tr');

    let visibleCount = 0;

    for (let row of rows) {
        const nameCell = row.getElementsByTagName('td')[1];
        const signalCell = row.getElementsByTagName('td')[8];
        const favoriteBtn = row.querySelector('.wallet-btn');
        
        if (nameCell && signalCell) {
            const name = nameCell.textContent.toLowerCase();
            const signal = signalCell.textContent;
            const isFavorite = favoriteBtn && favoriteBtn.classList.contains('active');
            
            const matchesSearch = name.includes(searchText);
            const matchesSignal = !signalFilter || signal.includes(signalFilter);
            const matchesFavorite = !showFavoritesOnly || isFavorite;

            if (matchesSearch && matchesSignal && matchesFavorite) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        }
    }

    updateCryptoCounter(visibleCount);
}

// Fonction pour calculer la rentabilité totale
function calculateTotalProfitability() {
    // Sélectionner les lignes qui ont un bouton favori actif
    const rows = document.querySelectorAll('#cryptoTableBody tr');
    let totalProfitPercentage = 0;
    let numberOfFavorites = 0;

    rows.forEach(row => {
        const favoriteBtn = row.querySelector('.wallet-btn');
        const isFavorite = favoriteBtn && favoriteBtn.classList.contains('active');

        if (isFavorite) {
            const priceCell = row.querySelector('td:nth-child(4)');
            const cryptoName = row.querySelector('td:nth-child(2)').textContent;
            
            if (priceCell) {
                const purchasePrice = parseFloat(priceCell.getAttribute('data-purchase-price'));
                const currentPrice = parseFloat(priceCell.getAttribute('data-current-price'));
                
                console.log(`${cryptoName} - Prix achat:`, purchasePrice);
                console.log(`${cryptoName} - Prix actuel:`, currentPrice);

                if (!isNaN(purchasePrice) && !isNaN(currentPrice) && purchasePrice !== 0) {
                    const profitPercentage = ((currentPrice - purchasePrice) / purchasePrice) * 100;
                    console.log(`${cryptoName} - Pourcentage de profit:`, profitPercentage);
                    
                    if (currentPrice !== purchasePrice) {
                        totalProfitPercentage += profitPercentage;
                        numberOfFavorites++;
                        console.log(`${cryptoName} ajouté au total. Nouveau total:`, totalProfitPercentage);
                        console.log('Nombre de favoris comptés:', numberOfFavorites);
                    }
                }
            }
        }
    });

    console.log('Total final:', totalProfitPercentage);
    console.log('Nombre final de favoris:', numberOfFavorites);
    
    // Calculer la moyenne des pourcentages
    const result = numberOfFavorites > 0 ? totalProfitPercentage / numberOfFavorites : 0;
    console.log('Résultat final:', result);
    return result;
}

// Fonction pour ouvrir la modale et afficher la rentabilité
function showProfitabilityModal() {
    const modal = document.getElementById('profitabilityModal');
    const totalProfitElement = document.getElementById('totalProfit');
    const totalProfitPercentage = calculateTotalProfitability();

    // Ajouter un signe + pour les valeurs positives
    const sign = totalProfitPercentage > 0 ? '+' : '';
    totalProfitElement.textContent = sign + totalProfitPercentage.toFixed(2) + ' %';
    totalProfitElement.className = 'total-profit ' + (totalProfitPercentage >= 0 ? 'positive' : 'negative');

    modal.style.display = 'block';
}

// Fonction pour fermer la modale
function closeProfitabilityModal() {
    const modal = document.getElementById('profitabilityModal');
    modal.style.display = 'none';
}

// Ajouter les event listeners
document.addEventListener('DOMContentLoaded', function() {
    const calculateButton = document.getElementById('calculateProfitBtn');
    const closeButton = document.querySelector('.close');

    if (calculateButton) {
        calculateButton.addEventListener('click', showProfitabilityModal);
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeProfitabilityModal);
    }

    // Fermer la modale en cliquant en dehors
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('profitabilityModal');
        if (event.target === modal) {
            closeProfitabilityModal();
        }
    });
});
