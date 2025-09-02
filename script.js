// On récupère les éléments HTML
const bookSelect = document.getElementById('book-select');
const chapterSelect = document.getElementById('chapter-select');
const verseSelect = document.getElementById('verse-select');
const toggleModeButton = document.getElementById('toggle-mode-button');
const textDisplay = document.getElementById('text-display');
const editArea = document.getElementById('edit-area');
const textEditor = document.getElementById('text-editor');

// Variables de gestion de l'état
let currentMode = 'read'; // 'read' ou 'edit'
let selectedBook = '';
let selectedChapter = '';
let selectedVerse = '';

// On prépare une structure pour les données éditées, qui sera stockée dans localStorage
let editedData = {};

// --- FONCTIONS DE GESTION DE L'INTERFACE ---

// Fonction pour peupler les listes déroulantes
function populateDropdowns() {
    // Remplissage de la liste des livres
    for (const book in BIBLEDATA) {
        const option = document.createElement('option');
        option.value = book;
        option.textContent = BIBLEDATA[book].name;
        bookSelect.appendChild(option);
    }
}

// Fonction pour mettre à jour la liste des chapitres
function updateChapters() {
    chapterSelect.innerHTML = '';
    chapterSelect.disabled = true;
    if (selectedBook) {
        for (const chapter in BIBLEDATA[selectedBook].chapters) {
            const option = document.createElement('option');
            option.value = chapter;
            option.textContent = `Chapitre ${chapter}`;
            chapterSelect.appendChild(option);
        }
        chapterSelect.disabled = false;
        updateVerses();
    }
}

// Fonction pour mettre à jour la liste des versets
function updateVerses() {
    verseSelect.innerHTML = '';
    verseSelect.disabled = true;
    if (selectedBook && selectedChapter) {
        const versesCount = Object.keys(BIBLEDATA[selectedBook].chapters[selectedChapter]).length;
        for (let i = 1; i <= versesCount; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Verset ${i}`;
            verseSelect.appendChild(option);
        }
        verseSelect.disabled = false;
        renderVerse();
    }
}

// Fonction pour afficher le verset dans la bonne zone
function renderVerse() {
    if (!selectedBook || !selectedChapter || !selectedVerse) {
        textDisplay.innerHTML = 'Sélectionnez un verset.';
        editArea.style.display = 'none';
        return;
    }

    const verseId = `${selectedBook}_${selectedChapter}_${selectedVerse}`;
    let verseText = editedData[verseId] || BIBLEDATA[selectedBook].chapters[selectedChapter][selectedVerse];

    if (currentMode === 'read') {
        textDisplay.innerHTML = `<p>${verseText}</p>`;
        textDisplay.style.display = 'block';
        editArea.style.display = 'none';
    } else {
        textEditor.value = stripHtmlTags(verseText);
        editArea.style.display = 'block';
        textDisplay.style.display = 'none';
    }
}

// Petite fonction utilitaire pour enlever les balises HTML (pour l'édition)
function stripHtmlTags(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// --- FONCTIONS DE GESTION DE L'ÉTAT ET DE LA SAUVEGARDE ---

// Fonction pour charger la dernière position et les données éditées
function loadState() {
    const savedBook = localStorage.getItem('lastBook');
    const savedChapter = localStorage.getItem('lastChapter');
    const savedVerse = localStorage.getItem('lastVerse');
    const savedData = localStorage.getItem('editedData');

    if (savedData) {
        editedData = JSON.parse(savedData);
    }

    if (savedBook && savedChapter && savedVerse) {
        selectedBook = savedBook;
        selectedChapter = savedChapter;
        selectedVerse = savedVerse;
        bookSelect.value = selectedBook;
        updateChapters();
        chapterSelect.value = selectedChapter;
        updateVerses();
        verseSelect.value = selectedVerse;
        renderVerse();
    } else {
        // Sélection par défaut
        selectedBook = bookSelect.value;
        updateChapters();
    }
}

// Fonction de sauvegarde automatique
function autoSave() {
    const verseId = `${selectedBook}_${selectedChapter}_${selectedVerse}`;
    const originalText = BIBLEDATA[selectedBook].chapters[selectedChapter][selectedVerse];
    const editedText = textEditor.value;

    if (editedText !== originalText && editedText !== '') {
        // On sauvegarde le texte modifié, avec les balises <strong>
        editedData[verseId] = `<strong>${editedText}</strong>`;
    } else {
        // Si le texte est de nouveau identique à l'original ou vide, on le supprime
        delete editedData[verseId];
    }

    localStorage.setItem('editedData', JSON.stringify(editedData));
    localStorage.setItem('lastBook', selectedBook);
    localStorage.setItem('lastChapter', selectedChapter);
    localStorage.setItem('lastVerse', selectedVerse);

    console.log('Sauvegarde automatique effectuée !');
}

// --- GESTION DES ÉVÉNEMENTS ---

bookSelect.addEventListener('change', (e) => {
    selectedBook = e.target.value;
    updateChapters();
});

chapterSelect.addEventListener('change', (e) => {
    selectedChapter = e.target.value;
    updateVerses();
});

verseSelect.addEventListener('change', (e) => {
    selectedVerse = e.target.value;
    renderVerse();
});

toggleModeButton.addEventListener('click', () => {
    currentMode = currentMode === 'read' ? 'edit' : 'read';
    toggleModeButton.textContent = currentMode === 'read' ? 'Passer en mode Édition' : 'Passer en mode Lecture';
    renderVerse();
});

// Lancement de l'application
populateDropdowns();
loadState();

// Activation de la sauvegarde automatique toutes les 2 minutes (120 000 ms)
setInterval(autoSave, 120000);
