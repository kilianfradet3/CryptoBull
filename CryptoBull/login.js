// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBECxvN-5GSF1HNeA0nzm9v_izqoOxFhPY",
    authDomain: "crypto-analyse-26b5f.firebaseapp.com",
    projectId: "crypto-analyse-26b5f",
    storageBucket: "crypto-analyse-26b5f.firebasestorage.app",
    messagingSenderId: "260248103240",
    appId: "1:260248103240:web:6d095cff9bb3690f13eb7d"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Référence à l'authentification Firebase
const auth = firebase.auth();

// Gérer le formulaire de connexion
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Récupérer les valeurs des champs
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    // Tentative de connexion
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Connexion réussie
            window.location.href = 'index.html';
        })
        .catch((error) => {
            // Gestion des erreurs
            let message;
            switch (error.code) {
                case 'auth/invalid-email':
                    message = 'Adresse email invalide';
                    break;
                case 'auth/user-disabled':
                    message = 'Ce compte a été désactivé';
                    break;
                case 'auth/user-not-found':
                    message = 'Aucun compte ne correspond à cet email';
                    break;
                case 'auth/wrong-password':
                    message = 'Mot de passe incorrect';
                    break;
                default:
                    message = 'Une erreur est survenue lors de la connexion';
            }
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        });
});
