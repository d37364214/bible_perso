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
// NOUVEAU: Éléments du menu latéral
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
let currentMode = 'read'; // 'read' ou 'edit'
let selectedBookIndex = -1;
let selectedChapterIndex = -1;
let selectedVerseIndex = -1;
let currentTheme = 'light'; // 'light' ou 'dark'
let editedData = {};
let bibleVersions = {
    'bible-data.js': BIBLEDATA,
};
let currentVersionName = 'bible-data.js';
let modifiedVersesOnly = false;


// --- VÉRIFICATION DES DONNÉES ---
if (typeof BIBLEDATA === 'undefined' || !BIBLEDATA.Testaments) {
    textDisplay.innerHTML = `<p style="color:red; text-align:center;">Erreur de chargement des données. Veuillez vérifier le fichier bible-data.js.</p>`;
    console.error("Erreur: La variable BIBLEDATA n'est pas définie ou ne contient pas la bonne structure.");
} else {
    initializeApp();
}

function initializeApp() {
    // --- NOUVEAU: Fonctions de gestion du thème ---
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
            if (name !== 'bible-data.js') {
                versionsToSave[name] = data;
            }
        }
        localStorage.setItem('bibleVersions', JSON.stringify(versionsToSave));
        localStorage.setItem('currentVersion', currentVersionName);
    }

    function loadBibleVersions() {
        const savedVersions = JSON.parse(localStorage.getItem('bibleVersions')) || {};
        for (const [name, data] of Object.entries(savedVersions)) {
            bibleVersions[name] = data;
        }
        currentVersionName = localStorage.getItem('currentVersion') || 'bible-data.js';
        updateVersionSelectors();
        switchBibleVersion(currentVersionName);
    }

    function updateVersionSelectors() {
        // Met à jour le sélecteur principal
        versionSelect.innerHTML = '';
        const originalOption = document.createElement('option');
        originalOption.value = 'bible-data.js';
        originalOption.textContent = 'Version Originale';
        versionSelect.appendChild(originalOption);
    
        // Met à jour le sélecteur du menu latéral
        manageBibleSelect.innerHTML = '';
        
        for (const version in bibleVersions) {
            if (version !== 'bible-data.js') {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                versionSelect.appendChild(option);
                manageBibleSelect.appendChild(option.cloneNode(true));
            }
        }
        
        // Sélectionne la version actuelle dans les deux menus
        versionSelect.value = currentVersionName;
        manageBibleSelect.value = currentVersionName !== 'bible-data.js' ? currentVersionName : '';
        deleteBibleBtn.disabled = currentVersionName === 'bible-data.js';
        renameBibleBtn.disabled = currentVersionName === 'bible-data.js';
    }

    function switchBibleVersion(versionName) {
        currentVersionName = versionName;
        BIBLEDATA = bibleVersions[currentVersionName];
        editedData = {};
        // Recharge les données éditées si on n'est pas sur la version originale
        if (currentVersionName !== 'bible-data.js') {
            const savedData = localStorage.getItem(`editedData_${currentVersionName}`);
            if (savedData) {
                editedData = JSON.parse(savedData);
            }
        } else {
            localStorage.removeItem('editedData');
        }
        
        populateDropdowns();
        loadState();
        saveBibleVersions();
    }
    
    // --- FONCTIONS DE GESTION DE L'INTERFACE ---
    function populateDropdowns() {
        bookSelect.innerHTML = '<option disabled selected value="">Livre</option>';
        chapterSelect.innerHTML = '<option disabled selected value="">Chapitre</option>';
        verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
        
        let bookIndex = 0;
        for (const testament of BIBLEDATA.Testaments) {
            for (const book of testament.Books) {
                const option = document.createElement('option');
                option.value = bookIndex;
                option.textContent = book.Text || book.Name || book.Abbreviation;
                
                // NOUVEAU: Marquer les livres avec des versets modifiés
                if (doesBookContainEditedVerses(book)) {
                    option.classList.add('edited-verse');
                }
                
                bookSelect.appendChild(option);
                bookIndex++;
            }
        }
        
        if (bookSelect.options.length > 1) {
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

                // NOUVEAU: Marquer les chapitres avec des versets modifiés
                if (doesChapterContainEditedVerses(book, chapter)) {
                    option.classList.add('edited-verse');
                }

                chapterSelect.appendChild(option);
                chapterIndex++;
            }
            chapterSelect.disabled = false;
            if (chapterSelect.options.length > 1) {
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

                // NOUVEAU: Marquer les versets avec des modifications
                const verseId = `${getSelectedBook().Abbreviation || getSelectedBook().Text}_${chapter.ID || (selectedChapterIndex + 1)}_${verse.ID || (verseIndex + 1)}`;
                if (editedData.hasOwnProperty(verseId)) {
                    option.classList.add('edited-verse');
                }
                
                verseSelect.appendChild(option);
                verseIndex++;
            }
            verseSelect.disabled = false;
            if (verseSelect.options.length > 1) {
                selectedVerseIndex = verseSelect.value;
            } else {
                selectedVerseIndex = -1; // Aucun verset à afficher
            }
            renderVerse();
        }
    }

    // --- FONCTIONS UTILITAIRES POUR L'ACCÈS AUX DONNÉES ---
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
        const currentBookVerses = modifiedVersesOnly ? getEditedVersesInBook(book) : book.Verses;

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
                if (nextBookIndex < bookSelect.options.length - 1) {
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
                    bookSelect.value = previousBookIndex;
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
        for (const testament of BIBLEDATA.Testaments) {
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
        for (const testament of BIBLEDATA.Testaments) {
            allBooks.push(...testament.Books);
        }

        const isFirstBook = allBooks.findIndex(b => b.Text === book.Text) === 0;
        const isLastBook = allBooks.findIndex(b => b.Text === book.Text) === allBooks.length - 1;

        const isFirstChapter = parseInt(selectedChapterIndex) === 0;
        const isLastChapter = parseInt(selectedChapterIndex) === book.Chapters.length - 1;

        const isFirstVerse = parseInt(selectedVerseIndex) === 0;
        const isLastVerse = parseInt(selectedVerseIndex) === chapter.Verses.length - 1;

        if (modifiedVersesOnly) {
            const editedVersesInCurrentChapter = getEditedVersesInChapter(chapter);
            const editedVersesInCurrentBook = getEditedVersesInBook(book);
            
            const isFirstEditedVerse = editedVersesInCurrentBook.length > 0 && editedVersesInCurrentBook[0].ID_string === getSelectedVerse().ID_string;
            const isLastEditedVerse = editedVersesInCurrentBook.length > 0 && editedVersesInCurrentBook[editedVersesInCurrentBook.length - 1].ID_string === getSelectedVerse().ID_string;

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

        localStorage.setItem(`editedData_${currentVersionName}`, JSON.stringify(editedData));
        localStorage.setItem('lastBookIndex', selectedBookIndex);
        localStorage.setItem('lastChapterIndex', selectedChapterIndex);
        localStorage.setItem('lastVerseIndex', selectedVerseIndex);
        localStorage.setItem('theme', currentTheme);
        localStorage.setItem('currentVersion', currentVersionName);

        console.log('Sauvegarde automatique effectuée !');
    }

    // NOUVEAU: Fonctions de sauvegarde/chargement de fichiers (inchangées)
    function savePersonalizedBible() {
        const personalizedData = JSON.parse(JSON.stringify(BIBLEDATA));

        for (const verseId in editedData) {
            if (editedData.hasOwnProperty(verseId)) {
                const [bookAbbr, chapterId, verseIdNum] = verseId.split('_');

                let found = false;
                for (const testament of personalizedData.Testaments) {
                    for (const book of testament.Books) {
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
        a.download = `${currentVersionName}.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Votre version de la Bible a été sauvegardée !');
    }

    function loadPersonalizedBible(fileContent) {
        let tempBIBLEDATA = {};
        try {
            eval(fileContent);
            tempBIBLEDATA = BIBLEDATA;
            BIBLEDATA = tempBIBLEDATA;
            editedData = {};
            localStorage.removeItem('editedData');
            
            populateDropdowns();
            loadState();
            alert('Votre version de la Bible a été chargée avec succès !');

        } catch (e) {
            console.error("Erreur de chargement du fichier :", e);
            alert("Erreur: Le fichier sélectionné n'est pas une version de Bible valide.");
        }
    }


    // --- GESTION DES ÉVÉNEMENTS ---
    openSidebarBtn.addEventListener('click', () => {
        sidebar.style.width = '250px';
        document.body.style.marginLeft = '250px';
        openSidebarBtn.style.opacity = '0';
    });
    
    closeSidebarBtn.addEventListener('click', () => {
        sidebar.style.width = '0';
        document.body.style.marginLeft = '0';
        openSidebarBtn.style.opacity = '1';
    });

    accordionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const panel = button.nextElementSibling;
            const icon = button.querySelector('i');
            button.classList.toggle('active');
            
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
            
            if (icon) {
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            }
        });
    });

    addBibleBtn.addEventListener('click', () => {
        const newName = newBibleNameInput.value.trim();
        if (newName) {
            if (bibleVersions.hasOwnProperty(newName)) {
                alert('Ce nom de version existe déjà. Veuillez en choisir un autre.');
                return;
            }
            const confirmed = confirm(`Êtes-vous sûr de vouloir créer une nouvelle version nommée "${newName}" ?`);
            if (confirmed) {
                const newVersionData = JSON.parse(JSON.stringify(BIBLEDATA));
                bibleVersions[newName] = newVersionData;
                switchBibleVersion(newName);
                newBibleNameInput.value = '';
            }
        } else {
            alert('Veuillez entrer un nom pour la nouvelle version.');
        }
    });

    manageBibleSelect.addEventListener('change', (e) => {
        const selectedVersion = e.target.value;
        if (selectedVersion) {
            switchBibleVersion(selectedVersion);
        }
    });

    renameBibleBtn.addEventListener('click', () => {
        const oldName = manageBibleSelect.value;
        if (!oldName) {
            alert('Veuillez sélectionner une version à renommer.');
            return;
        }
        const newName = prompt(`Entrez le nouveau nom pour "${oldName}" :`);
        if (newName && newName.trim() !== '' && !bibleVersions.hasOwnProperty(newName)) {
            const confirmed = confirm(`Êtes-vous sûr de vouloir renommer "${oldName}" en "${newName}" ?`);
            if (confirmed) {
                const data = bibleVersions[oldName];
                delete bibleVersions[oldName];
                bibleVersions[newName] = data;
                switchBibleVersion(newName);
            }
        } else {
            alert('Nom invalide ou déjà utilisé.');
        }
    });

    deleteBibleBtn.addEventListener('click', () => {
        const versionToDelete = manageBibleSelect.value;
        if (versionToDelete && versionToDelete !== 'bible-data.js') {
            const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer la version "${versionToDelete}" ? Cette action est irréversible.`);
            if (confirmed) {
                delete bibleVersions[versionToDelete];
                localStorage.removeItem(`editedData_${versionToDelete}`);
                switchBibleVersion('bible-data.js'); // Revenir à la version originale
            }
        } else {
            alert('Impossible de supprimer la version originale.');
        }
    });

    versionSelect.addEventListener('change', (e) => {
        switchBibleVersion(e.target.value);
    });

    modifiedVersesToggle.addEventListener('change', () => {
        modifiedVersesOnly = modifiedVersesToggle.checked;
        updateVerses();
    });

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

    toggleThemeButton.addEventListener('click', () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });

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
    loadBibleVersions();
    setInterval(autoSave, 120000);
}
