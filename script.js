// On récupère les éléments HTML
const bookSelect = document.getElementById('book-select');
const chapterSelect = document.getElementById('chapter-select');
const verseSelect = document.getElementById('verse-select');
const toggleModeButton = document.getElementById('toggle-mode-button');
const textDisplay = document.getElementById('text-display');
const editArea = document.getElementById('edit-area');
const textEditor = document.getElementById('text-editor');
// NOUVEAU: Éléments de navigation
const verseNavigationContainer = document.querySelector('.verse-navigation');
const previousVerseButton = document.getElementById('previous-verse-btn');
const nextVerseButton = document.getElementById('next-verse-btn');
const currentVerseInfo = document.querySelector('.current-verse-info');
// NOUVEAU: Éléments du thème
const toggleThemeButton = document.getElementById('toggle-theme-button');
// NOUVEAU: Éléments de sauvegarde/chargement
const saveFileButton = document.getElementById('save-file-button');
const loadFileButton = document.getElementById('load-file-button');
const loadFileInput = document.getElementById('load-file-input');

// Variables de gestion de l'état
let currentMode = 'read'; // 'read' ou 'edit'
let selectedBookIndex = -1;
let selectedChapterIndex = -1;
let selectedVerseIndex = -1;
let currentTheme = 'light'; // 'light' ou 'dark'

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
    // --- NOUVEAU: Fonction de gestion du thème ---
    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        toggleThemeButton.textContent = theme === 'dark' ? 'Clair' : 'Sombre';
        currentTheme = theme;
        localStorage.setItem('theme', theme);
    }
    
    // --- FONCTIONS DE GESTION DE L'INTERFACE ---
    function populateDropdowns() {
        let bookIndex = 0;
        for (const testament of BIBLEDATA.Testaments) {
            for (const book of testament.Books) {
                const option = document.createElement('option');
                option.value = bookIndex;
                option.textContent = book.Text || book.Name || book.Abbreviation;
                bookSelect.appendChild(option);
                bookIndex++;
            }
        }
        
        if (bookSelect.options.length > 1) {
            if (bookSelect.selectedIndex === -1) {
                bookSelect.selectedIndex = 1;
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
                const chapterID = chapter.ID || (chapterIndex + 1);
                option.textContent = `Chapitre ${chapterID}`;
                chapterSelect.appendChild(option);
                chapterIndex++;
            }
            chapterSelect.disabled = false;
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
                const verseID = verse.ID || (verseIndex + 1);
                option.textContent = `Verset ${verseID}`;
                verseSelect.appendChild(option);
                verseIndex++;
            }
            verseSelect.disabled = false;
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
            toggleModeButton.style.display = 'none';
            verseNavigationContainer.style.display = 'none';
            return;
        }

        const verseID = verse.ID || 1;
        const chapterID = getSelectedChapter().ID || 1;
        const bookText = getSelectedBook().Text || getSelectedBook().Abbreviation;
        const verseId = `${bookText}_${chapterID}_${verseID}`;
        const originalText = verse.Text;
        const editedText = editedData[verseId] || originalText;

        toggleModeButton.textContent = currentMode === 'read' ? 'Édition' : 'Lecture';
        toggleModeButton.style.display = 'block';
        verseNavigationContainer.style.display = 'flex';
        currentVerseInfo.textContent = `${bookText} ${chapterID}:${verseID}`;

        if (currentMode === 'read') {
            textDisplay.innerHTML = `<p>${editedText}</p>`;
            textDisplay.style.display = 'block';
            editArea.style.display = 'none';
        } else {
            textEditor.value = stripHtmlTags(editedText);
            editArea.style.display = 'block';
            textDisplay.style.display = 'none';
        }

        updateNavigationButtons();
    }

    function stripHtmlTags(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    // Fonctions de navigation
    function goToNextVerse() {
        const chapter = getSelectedChapter();
        const book = getSelectedBook();
        let nextVerseIndex = parseInt(selectedVerseIndex) + 1;
        let nextChapterIndex = parseInt(selectedChapterIndex);
        let nextBookIndex = parseInt(selectedBookIndex);

        if (nextVerseIndex < chapter.Verses.length) {
            verseSelect.value = nextVerseIndex;
            selectedVerseIndex = nextVerseIndex;
            renderVerse();
        } else {
            nextChapterIndex++;
            if (nextChapterIndex < book.Chapters.length) {
                chapterSelect.value = nextChapterIndex;
                selectedChapterIndex = nextChapterIndex;
                updateVerses();
            } else {
                nextBookIndex++;
                if (nextBookIndex < bookSelect.options.length - 1) {
                    bookSelect.value = nextBookIndex;
                    selectedBookIndex = nextBookIndex;
                    updateChapters();
                }
            }
        }
    }
    
    function goToPreviousVerse() {
        let previousVerseIndex = parseInt(selectedVerseIndex) - 1;
        let previousChapterIndex = parseInt(selectedChapterIndex);
        let previousBookIndex = parseInt(selectedBookIndex);

        if (previousVerseIndex >= 0) {
            verseSelect.value = previousVerseIndex;
            selectedVerseIndex = previousVerseIndex;
            renderVerse();
        } else {
            previousChapterIndex--;
            if (previousChapterIndex >= 0) {
                chapterSelect.value = previousChapterIndex;
                selectedChapterIndex = previousChapterIndex;
                updateVerses();
                const previousChapter = getSelectedChapter();
                verseSelect.value = previousChapter.Verses.length - 1;
                selectedVerseIndex = previousChapter.Verses.length - 1;
                renderVerse();
            } else {
                previousBookIndex--;
                if (previousBookIndex >= 0) {
                    bookSelect.value = previousBookIndex;
                    selectedBookIndex = previousBookIndex;
                    updateChapters();
                    const previousBook = getSelectedBook();
                    chapterSelect.value = previousBook.Chapters.length - 1;
                    selectedChapterIndex = previousBook.Chapters.length - 1;
                    updateVerses();
                    const lastChapter = getSelectedChapter();
                    verseSelect.value = lastChapter.Verses.length - 1;
                    selectedVerseIndex = lastChapter.Verses.length - 1;
                    renderVerse();
                }
            }
        }
    }

    function updateNavigationButtons() {
        const book = getSelectedBook();
        const chapter = getSelectedChapter();
        const isFirstVerse = parseInt(selectedVerseIndex) === 0;
        const isFirstChapter = parseInt(selectedChapterIndex) === 0;
        const isFirstBook = parseInt(selectedBookIndex) === 0;
        const isLastVerse = parseInt(selectedVerseIndex) === chapter.Verses.length - 1;
        const isLastChapter = parseInt(selectedChapterIndex) === book.Chapters.length - 1;
        const isLastBook = parseInt(selectedBookIndex) === bookSelect.options.length - 2;

        previousVerseButton.disabled = isFirstVerse && isFirstChapter && isFirstBook;
        nextVerseButton.disabled = isLastVerse && isLastChapter && isLastBook;
    }


    // --- FONCTIONS DE GESTION DE L'ÉTAT ET DE LA SAUVEGARDE ---
    function loadState() {
        const savedBookIndex = localStorage.getItem('lastBookIndex');
        const savedChapterIndex = localStorage.getItem('lastChapterIndex');
        const savedVerseIndex = localStorage.getItem('lastVerseIndex');
        const savedData = localStorage.getItem('editedData');
        const savedTheme = localStorage.getItem('theme');

        if (savedData) {
            editedData = JSON.parse(savedData);
        }

        // NOUVEAU: Logique de chargement du thème
        let initialTheme = 'light';
        if (savedTheme) {
            initialTheme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            initialTheme = 'dark';
        }
        applyTheme(initialTheme);
        

        if (savedBookIndex && savedChapterIndex && savedVerseIndex) {
            selectedBookIndex = savedBookIndex;
            bookSelect.value = selectedBookIndex;
            updateChapters();
            selectedChapterIndex = savedChapterIndex;
            chapterSelect.value = selectedChapterIndex;
            updateVerses();
            selectedVerseIndex = savedVerseIndex;
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
        const bookAbbr = getSelectedBook().Abbreviation || getSelectedBook().Text;
        const verseId = `${bookAbbr}_${chapterID}_${verseID}`;
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
        localStorage.setItem('theme', currentTheme);

        console.log('Sauvegarde automatique effectuée !');
    }

    // NOUVEAU: Fonctions de sauvegarde et de chargement
    function savePersonalizedBible() {
        // Crée une copie profonde des données originales pour ne pas les modifier
        const personalizedData = JSON.parse(JSON.stringify(BIBLEDATA));

        // Met à jour les versets avec les modifications locales
        for (const verseId in editedData) {
            if (editedData.hasOwnProperty(verseId)) {
                // Parse l'ID du verset (ex: "Genèse_1_1")
                const [bookAbbr, chapterId, verseIdNum] = verseId.split('_');

                // Recherche et met à jour le verset dans la copie
                let found = false;
                for (const testament of personalizedData.Testaments) {
                    for (const book of testament.Books) {
                        // S'assure que le livre correspond à l'abréviation ou au nom complet
                        if (book.Text === bookAbbr || book.Abbreviation === bookAbbr) {
                            const chapter = book.Chapters.find(ch => (ch.ID || ch.ID_string) == chapterId);
                            if (chapter) {
                                const verse = chapter.Verses.find(v => (v.ID || v.ID_string) == verseIdNum);
                                if (verse) {
                                    verse.Text = editedData[verseId];
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (found) break;
                }
            }
        }

        const dataContent = `const BIBLEDATA = ${JSON.stringify(personalizedData, null, 2)};`;
        const blob = new Blob([dataContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ma-bible-personnalisee.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Votre version de la Bible a été sauvegardée !');
    }

    function loadPersonalizedBible(fileContent) {
        // Évalue le contenu du fichier pour récupérer la variable BIBLEDATA
        let tempBIBLEDATA = {};
        try {
            eval(fileContent); // Attention : cette méthode est potentiellement dangereuse si la source est inconnue.
            tempBIBLEDATA = BIBLEDATA;
            // Charge la nouvelle version dans l'application
            BIBLEDATA = tempBIBLEDATA; 
            editedData = {}; // Réinitialise les données éditées du localStorage
            localStorage.removeItem('editedData'); // Supprime la sauvegarde locale
            
            // Re-initialise l'application avec les nouvelles données
            populateDropdowns();
            loadState();
            alert('Votre version de la Bible a été chargée avec succès !');

        } catch (e) {
            console.error("Erreur de chargement du fichier :", e);
            alert("Erreur: Le fichier sélectionné n'est pas une version de Bible valide.");
        }
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
        renderVerse();
    });

    // Événement pour le bouton de thème
    toggleThemeButton.addEventListener('click', () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });

    // NOUVEAU: Écouteurs d'événements pour la sauvegarde et le chargement
    saveFileButton.addEventListener('click', savePersonalizedBible);
    
    loadFileButton.addEventListener('click', () => {
        loadFileInput.click();
    });

    loadFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadPersonalizedBible(e.target.result);
            };
            reader.readAsText(file);
        }
    });

    previousVerseButton.addEventListener('click', goToPreviousVerse);
    nextVerseButton.addEventListener('click', goToNextVerse);

    // Lancement de l'application
    populateDropdowns();
    loadState();
    
    // Activation de la sauvegarde automatique toutes les 2 minutes (120 000 ms)
    setInterval(autoSave, 120000);
}
