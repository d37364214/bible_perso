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

// --- FONCTIONS DE GESTION DE L'INTERFACE ---

function populateDropdowns() {
    // Remplissage de la liste des livres à partir des deux testaments
    let bookIndex = 0;
    for (const testament of BIBLEDATA.Testaments) {
        for (const book of testament.Books) {
            const option = document.createElement('option');
            option.value = bookIndex;
            option.textContent = book.Name;
            bookSelect.appendChild(option);
            bookIndex++;
        }
    }
}

function updateChapters() {
    chapterSelect.innerHTML = '';
    chapterSelect.disabled = true;
    if (selectedBookIndex !== -1) {
        const book = getSelectedBook();
        let chapterIndex = 0;
        for (const chapter of book.Chapters) {
            const option = document.createElement('option');
            option.value = chapterIndex;
            option.textContent = `Chapitre ${chapter.ID}`;
            chapterSelect.appendChild(option);
            chapterIndex++;
        }
        chapterSelect.disabled = false;
        selectedChapterIndex = chapterSelect.value;
        updateVerses();
    }
}

function updateVerses() {
    verseSelect.innerHTML = '';
    verseSelect.disabled = true;
    if (selectedBookIndex !== -1 && selectedChapterIndex !== -1) {
        const chapter = getSelectedChapter();
        let verseIndex = 0;
        for (const verse of chapter.Verses) {
            const option = document.createElement('option');
            option.value = verseIndex;
            option.textContent = `Verset ${verse.ID}`;
            verseSelect.appendChild(option);
            verseIndex++;
        }
        verseSelect.disabled = false;
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

    const verseId = `${getSelectedBook().Abbreviation}_${getSelectedChapter().ID}_${verse.ID}`;
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
    
    const verseId = `${getSelectedBook().Abbreviation}_${getSelectedChapter().ID}_${verse.ID}`;
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
