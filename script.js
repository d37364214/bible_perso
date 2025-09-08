// On récupère les éléments HTML
const bookSelect = document.getElementById('book-select');
const chapterSelect = document.getElementById('chapter-select');
const verseSelect = document.getElementById('verse-select');
const toggleModeButton = document.getElementById('toggle-mode-button');
const textDisplay = document.getElementById('text-display');
const editArea = document.getElementById('edit-area');
const textEditor = document.getElementById('text-editor');
const verseNavigationContainer = document.querySelector('.verse-navigation');
const previousVerseButton = document.getElementById('previous-verse-btn');
const nextVerseButton = document.getElementById('next-verse-btn');
const currentVerseInfo = document.querySelector('.current-verse-info');
const toggleThemeButton = document.getElementById('toggle-theme-button');
const saveFileButton = document.getElementById('save-file-button');
const loadFileButton = document.getElementById('load-file-button');
const loadFileInput = document.getElementById('load-file-input');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const addBibleBtn = document.getElementById('add-bible-btn');
const newBibleNameInput = document.getElementById('new-bible-name');
const manageBibleSelect = document.getElementById('manage-bible-select');
const renameBibleBtn = document.getElementById('rename-bible-btn');
const deleteBibleBtn = document.getElementById('delete-bible-btn');
const versionSelect = document.getElementById('version-select');
const modifiedVersesToggle = document.getElementById('modified-verses-toggle');
const accordionButtons = document.querySelectorAll('.accordion-button');

// Variables de gestion de l'état
let currentMode = 'read';
let selectedBookIndex = -1;
let selectedChapterIndex = -1;
let selectedVerseIndex = -1;
let currentTheme = 'light';
let editedData = {};
let bibleVersions = {};
let currentVersionName = 'Version Originale';
let modifiedVersesOnly = false;

// --- VÉRIFICATION ET INITIALISATION DES DONNÉES ---
if (typeof BIBLEDATA === 'undefined' || !BIBLEDATA.Testaments) {
    textDisplay.innerHTML = `<p style="color:red; text-align:center;">Erreur de chargement des données. Veuillez vérifier le fichier bible-data.js.</p>`;
    console.error("Erreur: La variable BIBLEDATA n'est pas définie ou ne contient pas la bonne structure.");
} else {
    window.BIBLEDATA = BIBLEDATA;
    initializeApp();
}

function initializeApp() {
    // --- Fonctions de gestion du thème ---
    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        toggleThemeButton.textContent = theme === 'dark' ? 'Clair' : 'Sombre';
        currentTheme = theme;
        localStorage.setItem('theme', theme);
    }

    // --- FONCTIONS DE GESTION DES VERSIONS DE LA BIBLE ---
    function saveBibleVersions() {
        const versionsToSave = {};
        for (const [name, data] of Object.entries(bibleVersions)) {
            if (name !== 'Version Originale') {
                versionsToSave[name] = data;
            }
        }
        localStorage.setItem('bibleVersions', JSON.stringify(versionsToSave));
        localStorage.setItem('currentVersion', currentVersionName);
    }

    function loadBibleVersions() {
        bibleVersions = { 'Version Originale': window.BIBLEDATA };
        const savedVersions = JSON.parse(localStorage.getItem('bibleVersions')) || {};
        for (const [name, data] of Object.entries(savedVersions)) {
            bibleVersions[name] = data;
        }
        currentVersionName = localStorage.getItem('currentVersion') || 'Version Originale';
        updateVersionSelectors();
        switchBibleVersion(currentVersionName);
    }

    function updateVersionSelectors() {
        versionSelect.innerHTML = '';
        manageBibleSelect.innerHTML = '';

        const originalOption = document.createElement('option');
        originalOption.value = 'Version Originale';
        originalOption.textContent = 'Version Originale';
        versionSelect.appendChild(originalOption);

        for (const version in bibleVersions) {
            if (version !== 'Version Originale') {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                versionSelect.appendChild(option);
                manageBibleSelect.appendChild(option.cloneNode(true));
            }
        }

        versionSelect.value = currentVersionName;
        manageBibleSelect.value = currentVersionName !== 'Version Originale' ? currentVersionName : '';
        deleteBibleBtn.disabled = currentVersionName === 'Version Originale';
        renameBibleBtn.disabled = currentVersionName === 'Version Originale';
    }

    function switchBibleVersion(versionName) {
        const previousBookIndex = selectedBookIndex;
        const previousChapterIndex = selectedChapterIndex;
        const previousVerseIndex = selectedVerseIndex;

        currentVersionName = versionName;
        window.BIBLEDATA = bibleVersions[currentVersionName];

        editedData = {};
        const savedData = localStorage.getItem(`editedData_${currentVersionName}`);
        if (savedData) {
            editedData = JSON.parse(savedData);
        }

        if (previousBookIndex !== -1 && previousChapterIndex !== -1 && previousVerseIndex !== -1) {
            selectedBookIndex = previousBookIndex;
            selectedChapterIndex = previousChapterIndex;
            selectedVerseIndex = previousVerseIndex;
        } else {
            loadState();
        }

        populateDropdowns();
        saveBibleVersions();
    }
    
    // --- FONCTIONS DE GESTION DE L'INTERFACE ---
    function populateDropdowns() {
        bookSelect.innerHTML = '<option disabled selected value="">Livre</option>';
        chapterSelect.innerHTML = '<option disabled selected value="">Chapitre</option>';
        verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
        
        let bookIndex = 0;
        for (const testament of window.BIBLEDATA.Testaments) {
            for (const book of testament.Books) {
                const option = document.createElement('option');
                option.value = bookIndex;
                option.textContent = book.Text || book.Name || book.Abbreviation;
                
                if (doesBookContainEditedVerses(book)) {
                    option.classList.add('edited-verse');
                }
                
                bookSelect.appendChild(option);
                bookIndex++;
            }
        }
        
        if (bookSelect.options.length > 1) {
            bookSelect.value = selectedBookIndex >= 0 && bookSelect.options[selectedBookIndex + 1] ? selectedBookIndex : 0;
            selectedBookIndex = bookSelect.value;
            updateChapters();
        }
    }

    function updateChapters() {
        chapterSelect.innerHTML = '<option disabled selected value="">Chapitre</option>';
        chapterSelect.disabled = true;
        verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
        verseSelect.disabled = true;
        
        if (selectedBookIndex !== -1) {
            const book = getSelectedBook();
            let chapterIndex = 0;
            for (const chapter of book.Chapters) {
                const option = document.createElement('option');
                option.value = chapterIndex;
                const chapterID = chapter.ID || (chapterIndex + 1);
                option.textContent = `Chapitre ${chapterID}`;

                if (doesChapterContainEditedVerses(book, chapter)) {
                    option.classList.add('edited-verse');
                }

                chapterSelect.appendChild(option);
                chapterIndex++;
            }
            chapterSelect.disabled = false;
            if (chapterSelect.options.length > 1) {
                chapterSelect.value = selectedChapterIndex >= 0 && chapterSelect.options[selectedChapterIndex + 1] ? selectedChapterIndex : 0;
                selectedChapterIndex = chapterSelect.value;
                updateVerses();
            }
        }
    }

    function updateVerses() {
        verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
        verseSelect.disabled = true;
        
        if (selectedBookIndex !== -1 && selectedChapterIndex !== -1) {
            const chapter = getSelectedChapter();
            let verseIndex = 0;
            const versesToDisplay = modifiedVersesOnly ? getEditedVersesInChapter(chapter) : chapter.Verses;
            
            for (const verse of versesToDisplay) {
                const option = document.createElement('option');
                option.value = verseIndex;
                const verseID = verse.ID || (verseIndex + 1);
                option.textContent = `Verset ${verseID}`;

                const verseId = `${getSelectedBook().Abbreviation || getSelectedBook().Text}_${chapter.ID || (selectedChapterIndex + 1)}_${verse.ID || (verseIndex + 1)}`;
                if (editedData.hasOwnProperty(verseId)) {
                    option.classList.add('edited-verse');
                }
                
                verseSelect.appendChild(option);
                verseIndex++;
            }
            verseSelect.disabled = false;
            if (verseSelect.options.length > 1) {
                verseSelect.value = selectedVerseIndex >= 0 && verseSelect.options[selectedVerseIndex + 1] ? selectedVerseIndex : 0;
                selectedVerseIndex = verseSelect.value;
            } else {
                selectedVerseIndex = -1;
            }
            renderVerse();
        }
    }

    // --- FONCTIONS UTILITAIRES POUR L'ACCÈS AUX DONNÉES ---
    function getSelectedBook() {
        let currentBookIndex = 0;
        for (const testament of window.BIBLEDATA.Testaments) {
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
    
    function getEditedVersesInChapter(chapter) {
        const editedVerses = [];
        const bookAbbr = getSelectedBook().Abbreviation || getSelectedBook().Text;
        const chapterID = chapter.ID || (chapter.Verses.findIndex(v => v === chapter.Verses[0]) + 1);
        
        for (const verse of chapter.Verses) {
            const verseId = `${bookAbbr}_${chapterID}_${verse.ID || (chapter.Verses.findIndex(v => v === verse) + 1)}`;
            if (editedData.hasOwnProperty(verseId)) {
                editedVerses.push(verse);
            }
        }
        return editedVerses;
    }

    function doesBookContainEditedVerses(book) {
        const bookAbbr = book.Abbreviation || book.Text;
        for (const verseId in editedData) {
            if (verseId.startsWith(bookAbbr)) {
                return true;
            }
        }
        return false;
    }

    function doesChapterContainEditedVerses(book, chapter) {
        const bookAbbr = book.Abbreviation || book.Text;
        const chapterID = chapter.ID || (book.Chapters.findIndex(c => c === chapter) + 1);
        const prefix = `${bookAbbr}_${chapterID}_`;
        for (const verseId in editedData) {
            if (verseId.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    // --- RENDU ET LOGIQUE DE L'INTERFACE ---
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
        
        let verseText = verse.Text;
        if (editedData.hasOwnProperty(verseId)) {
            verseText = editedData[verseId];
        }

        toggleModeButton.textContent = currentMode === 'read' ? 'Édition' : 'Lecture';
        toggleModeButton.style.display = 'block';
        verseNavigationContainer.style.display = 'flex';
        currentVerseInfo.textContent = `${bookText} ${chapterID}:${verseID}`;

        if (currentMode === 'read') {
            textDisplay.innerHTML = `<p>${verseText}</p>`;
            textDisplay.style.display = 'block';
            editArea.style.display = 'none';
        } else {
            textEditor.value = stripHtmlTags(verseText);
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
        const book = getSelectedBook();
        let nextVerseIndex = parseInt(selectedVerseIndex) + 1;
        let nextChapterIndex = parseInt(selectedChapterIndex);
        let nextBookIndex = parseInt(selectedBookIndex);

        const currentChapterVerses = modifiedVersesOnly ? getEditedVersesInChapter(getSelectedChapter()) : getSelectedChapter().Verses;
        const allBooks = [];
        for (const testament of window.BIBLEDATA.Testaments) {
            allBooks.push(...testament.Books);
        }

        if (nextVerseIndex < currentChapterVerses.length) {
            selectedVerseIndex = nextVerseIndex;
            verseSelect.value = selectedVerseIndex;
            renderVerse();
        } else {
            nextChapterIndex++;
            if (nextChapterIndex < book.Chapters.length) {
                selectedChapterIndex = nextChapterIndex;
                chapterSelect.value = selectedChapterIndex;
                updateVerses();
            } else {
                nextBookIndex++;
                if (nextBookIndex < allBooks.length) {
                    selectedBookIndex = nextBookIndex;
                    bookSelect.value = selectedBookIndex;
                    updateChapters();
                }
            }
        }
    }
    
    function goToPreviousVerse() {
        const book = getSelectedBook();
        let previousVerseIndex = parseInt(selectedVerseIndex) - 1;
        let previousChapterIndex = parseInt(selectedChapterIndex);
        let previousBookIndex = parseInt(selectedBookIndex);

        const allBooks = [];
        for (const testament of window.BIBLEDATA.Testaments) {
            allBooks.push(...testament.Books);
        }

        if (previousVerseIndex >= 0) {
            selectedVerseIndex = previousVerseIndex;
            verseSelect.value = previousVerseIndex;
            renderVerse();
        } else {
            previousChapterIndex--;
            if (previousChapterIndex >= 0) {
                selectedChapterIndex = previousChapterIndex;
                chapterSelect.value = previousChapterIndex;
                updateVerses();
                const previousChapterVerses = modifiedVersesOnly ? getEditedVersesInChapter(getSelectedChapter()) : getSelectedChapter().Verses;
                selectedVerseIndex = previousChapterVerses.length - 1;
                verseSelect.value = selectedVerseIndex;
                renderVerse();
            } else {
                previousBookIndex--;
                if (previousBookIndex >= 0) {
                    selectedBookIndex = previousBookIndex;
                    bookSelect.value = selectedBookIndex;
                    updateChapters();
                    const previousBook = getSelectedBook();
                    selectedChapterIndex = previousBook.Chapters.length - 1;
                    chapterSelect.value = selectedChapterIndex;
                    updateVerses();
                    const lastChapterVerses = modifiedVersesOnly ? getEditedVersesInChapter(getSelectedChapter()) : getSelectedChapter().Verses;
                    selectedVerseIndex = lastChapterVerses.length - 1;
                    verseSelect.value = selectedVerseIndex;
                    renderVerse();
                }
            }
        }
    }
    
    function getEditedVersesInBook(book) {
        const editedVerses = [];
        const bookAbbr = book.Abbreviation || book.Text;
        for (const testament of window.BIBLEDATA.Testaments) {
            for (const b of testament.Books) {
                if ((b.Abbreviation || b.Text) === bookAbbr) {
                    for (const chapter of b.Chapters) {
                        const chapterID = chapter.ID || (b.Chapters.findIndex(c => c === chapter) + 1);
                        for (const verse of chapter.Verses) {
                            const verseId = `${bookAbbr}_${chapterID}_${verse.ID || (chapter.Verses.findIndex(v => v === verse) + 1)}`;
                            if (editedData.hasOwnProperty(verseId)) {
                                editedVerses.push(verse);
                            }
                        }
                    }
                }
            }
        }
        return editedVerses;
    }

    function updateNavigationButtons() {
        const book = getSelectedBook();
        const chapter = getSelectedChapter();
        if (!book || !chapter) return;

        const allBooks = [];
        for (const testament of window.BIBLEDATA.Testaments) {
            allBooks.push(...testament.Books);
        }

        const isFirstBook = allBooks.findIndex(b => b.Text === book.Text) === 0;
        const isLastBook = allBooks.findIndex(b => b.Text === book.Text) === allBooks.length - 1;
        const isFirstChapter = parseInt(selectedChapterIndex) === 0;
        const isLastChapter = parseInt(selectedChapterIndex) === book.Chapters.length - 1;
        const isFirstVerse = parseInt(selectedVerseIndex) === 0;
        const isLastVerse = parseInt(selectedVerseIndex) === chapter.Verses.length - 1;

        if (modifiedVersesOnly) {
            const editedVersesInCurrentBook = getEditedVersesInBook(book);
            const isFirstEditedVerse = editedVersesInCurrentBook.length > 0 && editedVersesInCurrentBook[0] === getSelectedVerse();
            const isLastEditedVerse = editedVersesInCurrentBook.length > 0 && editedVersesInCurrentBook[editedVersesInCurrentBook.length - 1] === getSelectedVerse();

            previousVerseButton.disabled = isFirstEditedVerse;
            nextVerseButton.disabled = isLastEditedVerse;

        } else {
            previousVerseButton.disabled = isFirstVerse && isFirstChapter && isFirstBook;
            nextVerseButton.disabled = isLastVerse && isLastChapter && isLastBook;
        }
    }
    
    // --- GESTION DE L'ÉTAT ET SAUVEGARDE LOCALE ---
    function loadState() {
        const savedBookIndex = localStorage.getItem('lastBookIndex');
        const savedChapterIndex = localStorage.getItem('lastChapterIndex');
        const savedVerseIndex = localStorage.getItem('lastVerseIndex');
        const savedTheme = localStorage.getItem('theme');

        let initialTheme = 'light';
        if (savedTheme) {
            initialTheme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            initialTheme = 'dark';
        }
        applyTheme(initialTheme);
        
        if (savedBookIndex !== null && savedChapterIndex !== null && savedVerseIndex !== null) {
            selectedBookIndex = savedBookIndex;
            selectedChapterIndex = savedChapterIndex;
            selectedVerseIndex = savedVerseIndex;
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

        if (editedText !== stripHtmlTags(originalText) && editedText.trim() !== '') {
            editedData[verseId] = `<strong>${editedText}</strong>`;
        }
