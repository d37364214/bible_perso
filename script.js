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
let selectedBookIndex = -1;
let selectedChapterIndex = -1;
let selectedVerseIndex = -1;

// On prépare une structure pour les données éditées
let editedData = {};

// --- VÉRIFICATION DES DONNÉES ---
if (typeof BIBLEDATA === 'undefined' || !BIBLEDATA.Testaments) {
    textDisplay.innerHTML = `<p style="color:red; text-align:center;">Erreur de chargement des données. Veuillez vérifier le fichier bible-data.js.</p>`;
    console.error("Erreur: La variable BIBLEDATA n'est pas définie ou ne contient pas la bonne structure.");
} else {
    initializeApp();
}

function initializeApp() {
    // --- FONCTIONS DE GESTION DE L'INTERFACE ---
    function populateDropdowns() {
        let bookIndex = 0;
        for (const testament of BIBLEDATA.Testaments) {
            for (const book of testament.Books) {
                const option = document.createElement('option');
                option.value = bookIndex;
                // Utiliser le nom du livre si disponible, sinon l'abréviation
                option.textContent = book.Name || book.Abbreviation;
                bookSelect.appendChild(option);
                bookIndex++;
            }
        }

        if (bookSelect.options.length > 0) {
            // Assure qu'au moins une option est sélectionnée
            if (bookSelect.selectedIndex === -1) {
                bookSelect.selectedIndex = 0;
            }
            selectedBookIndex = bookSelect.value;
            updateChapters();
        }
    }

    function updateChapters() {
        chapterSelect.innerHTML = '<option disabled selected value="">Chapitre</option>';
        chapterSelect.disabled = true;
        if (selectedBookIndex !== -1) {
            const book = getSelectedBook();
            let chapterIndex = 0;
            for (const chapter of book.Chapters) {
                const option = document.createElement('option');
                option.value = chapterIndex;
                // Utiliser l'ID du chapitre si disponible, sinon 1
                const chapterID = chapter.ID || 1;
                option.textContent = `Chapitre ${chapterID}`;
                chapterSelect.appendChild(option);
                chapterIndex++;
            }
            chapterSelect.disabled = false;
            // Sélectionne le premier chapitre par défaut
            if (chapterSelect.options.length > 1) {
                chapterSelect.selectedIndex = 1;
            }
            selectedChapterIndex = chapterSelect.value;
            updateVerses();
        }
    }

    function updateVerses() {
        verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
        verseSelect.disabled = true;
        if (selectedBookIndex !== -1 && selectedChapterIndex !== -1) {
            const chapter = getSelectedChapter();
            let verseIndex = 0;
            for (const verse of chapter.Verses) {
                const option = document.createElement('option');
                option.value = verseIndex;
                // Utiliser l'ID du verset si disponible, sinon 1
                const verseID = verse.ID || 1;
                option.textContent = `Verset ${verseID}`;
                verseSelect.appendChild(option);
                verseIndex++;
            }
            verseSelect.disabled = false;
            // Sélectionne le premier verset par défaut
            if (verseSelect.options.length > 1) {
                verseSelect.selectedIndex = 1;
            }
            selectedVerseIndex = verseSelect.value;
            renderVerse();
        }
    }

    function getSelectedBook() {
        let currentBookIndex = 0;
        for (const testament of BIBLEDATA.Testaments) {
            for (const book of testament.Books) {
                if (currentBookIndex === parseInt(selectedBookIndex)) {
                    return book;
                }
                currentBookIndex++;
            }
        }
        return null;
    }

    function getSelectedChapter() {
        const book = getSelectedBook();
        if (book && book.Chapters && selectedChapterIndex !== -1) {
            return book.Chapters[selectedChapterIndex];
        }
        return null;
    }

    function getSelectedVerse() {
        const chapter = getSelectedChapter();
        if (chapter && chapter.Verses && selectedVerseIndex !== -1) {
            return chapter.Verses[selectedVerseIndex];
        }
        return null;
    }

    function renderVerse() {
        const verse = getSelectedVerse();
        if (!verse) {
            textDisplay.innerHTML = 'Sélectionnez un verset.';
            editArea.style.display = 'none';
            return;
        }

        const verseID = verse.ID || 1;
        const chapterID = getSelectedChapter().ID || 1;
        const verseId = `${getSelectedBook().Abbreviation}_${chapterID}_${verseID}`;
        const originalText = verse.Text;
        const editedText = editedData[verseId] || originalText;

        if (currentMode === 'read') {
            textDisplay.innerHTML = `<p>${editedText}</p>`;
            textDisplay.style.display = 'block';
            editArea.style.display = 'none';
        } else {
            textEditor.value = stripHtmlTags(editedText);
            editArea.style.display = 'block';
            textDisplay.style.display = 'none';
        }
    }

    function stripHtmlTags(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    // --- FONCTIONS DE GESTION DE L'ÉTAT ET DE LA SAUVEGARDE ---
    function loadState() {
        const savedBookIndex = localStorage.getItem('lastBookIndex');
        const savedChapterIndex = localStorage.getItem('lastChapterIndex');
        const savedVerseIndex = localStorage.getItem('lastVerseIndex');
        const savedData = localStorage.getItem('editedData');

        if (savedData) {
            editedData = JSON.parse(savedData);
        }

        if (savedBookIndex && savedChapterIndex && savedVerseIndex) {
            selectedBookIndex = savedBookIndex;
            selectedChapterIndex = savedChapterIndex;
            selectedVerseIndex = savedVerseIndex;
            bookSelect.value = selectedBookIndex;
            updateChapters();
            chapterSelect.value = selectedChapterIndex;
            updateVerses();
            verseSelect.value = selectedVerseIndex;
            renderVerse();
        } else {
            selectedBookIndex = bookSelect.value;
            updateChapters();
        }
    }

    function autoSave() {
        const verse = getSelectedVerse();
        if (!verse) return;
        
        const verseID = verse.ID || 1;
        const chapterID = getSelectedChapter().ID || 1;
        const verseId = `${getSelectedBook().Abbreviation}_${chapterID}_${verseID}`;
        const originalText = verse.Text;
        const editedText = textEditor.value;

        if (editedText !== originalText && editedText !== '') {
            editedData[verseId] = `<strong>${editedText}</strong>`;
        } else {
            delete editedData[verseId];
        }

        localStorage.setItem('editedData', JSON.stringify(editedData));
        localStorage.setItem('lastBookIndex', selectedBookIndex);
        localStorage.setItem('lastChapterIndex', selectedChapterIndex);
        localStorage.setItem('lastVerseIndex', selectedVerseIndex);

        console.log('Sauvegarde automatique effectuée !');
    }

    // --- GESTION DES ÉVÉNEMENTS ---
    bookSelect.addEventListener('change', (e) => {
        selectedBookIndex = e.target.value;
        updateChapters();
    });

    chapterSelect.addEventListener('change', (e) => {
        selectedChapterIndex = e.target.value;
        updateVerses();
    });

    verseSelect.addEventListener('change', (e) => {
        selectedVerseIndex = e.target.value;
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
}
