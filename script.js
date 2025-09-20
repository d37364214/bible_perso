// ======== Début du patch : forcer exécution après DOM ready ========
let bookSelect, chapterSelect, verseSelect, toggleModeButton, textDisplay,
    editArea, textEditor, verseNavigationContainer, previousVerseButton,
    nextVerseButton, currentVerseInfo, toggleThemeButton, saveFileButton,
    loadFileButton, loadFileInput, sidebar, openSidebarBtn, closeSidebarBtn,
    addBibleBtn, newBibleNameInput, manageBibleSelect, renameBibleBtn,
    deleteBibleBtn, versionSelect, modifiedVersesToggle, accordionButtons;

function queryAllElements() {
  bookSelect = document.getElementById('book-select');
  chapterSelect = document.getElementById('chapter-select');
  verseSelect = document.getElementById('verse-select');
  toggleModeButton = document.getElementById('toggle-mode-button');
  textDisplay = document.getElementById('text-display');
  editArea = document.getElementById('edit-area');
  textEditor = document.getElementById('text-editor');
  verseNavigationContainer = document.querySelector('.verse-navigation');
  previousVerseButton = document.getElementById('previous-verse-btn');
  nextVerseButton = document.getElementById('next-verse-btn');
  currentVerseInfo = document.querySelector('.current-verse-info');
  toggleThemeButton = document.getElementById('toggle-theme-button');
  saveFileButton = document.getElementById('save-file-button');
  loadFileButton = document.getElementById('load-file-button');
  loadFileInput = document.getElementById('load-file-input');
  sidebar = document.getElementById('sidebar');
  openSidebarBtn = document.getElementById('open-sidebar-btn');
  closeSidebarBtn = document.getElementById('close-sidebar-btn');
  addBibleBtn = document.getElementById('add-bible-btn');
  newBibleNameInput = document.getElementById('new-bible-name');
  manageBibleSelect = document.getElementById('manage-bible-select');
  renameBibleBtn = document.getElementById('rename-bible-btn');
  deleteBibleBtn = document.getElementById('delete-bible-btn');
  versionSelect = document.getElementById('version-select');
  modifiedVersesToggle = document.getElementById('modified-verses-toggle');
  accordionButtons = document.querySelectorAll('.accordion-button');
}

// ======== Fin du patch ========

// Variables de gestion de l'état
let currentMode = 'read';
let selectedBookIndex = -1;
let selectedChapterIndex = -1;
let selectedVerseIndex = -1;
let currentTheme = 'light';

const STORAGE_VERSIONS_KEY = 'bibleVersions';
const STORAGE_ACTIVE_KEY = 'activeBibleVersion';
const EDITED_KEY = name => `editedData_${encodeURIComponent(name)}`;

let bibleVersions = ['Version Originale'];
let bibleVersionsDiffs = {};
let currentVersionName = 'Version Originale';
let modifiedVersesOnly = false;
let allBooks = [];

// Caches pour optimiser la détection des versets modifiés
let editedBooksCache = new Set();
let editedChaptersCache = new Set();


function initializeApp() {
    // Vérification de l'existence des éléments clés pour éviter les erreurs
    const elements = {
        bookSelect, chapterSelect, verseSelect, toggleModeButton, textDisplay,
        editArea, textEditor, verseNavigationContainer, previousVerseButton, nextVerseButton,
        currentVerseInfo, toggleThemeButton, saveFileButton, loadFileButton, loadFileInput,
        sidebar, openSidebarBtn, closeSidebarBtn, addBibleBtn, newBibleNameInput,
        manageBibleSelect, renameBibleBtn, deleteBibleBtn, versionSelect, modifiedVersesToggle, accordionButtons
    };

    for (const key in elements) {
        if (!elements[key]) {
            console.warn(`Avertissement : L'élément HTML avec l'ID #${key} est manquant.`);
        }
    }
    
    // Déplacement de cette logique pour qu'elle s'exécute après la récupération des éléments
    if (typeof BIBLEDATA === 'undefined' || !BIBLEDATA.Testaments) {
        if (textDisplay) {
            textDisplay.innerHTML = `<p style="color:red; text-align:center;">Erreur de chargement des données. Veuillez vérifier le fichier bible-data.js.</p>`;
        }
        console.error("Erreur: La variable BIBLEDATA n'est pas définie ou ne contient pas la bonne structure.");
    } else {
        window.BIBLEDATA = BIBLEDATA;
        for (const testament of window.BIBLEDATA.Testaments) {
            allBooks.push(...testament.Books);
        }
        loadState();
        loadBibleVersions();
        
        // Ajout des écouteurs d'événements ici pour s'assurer que les éléments existent
        if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => {
            if (sidebar) sidebar.style.transform = 'translateX(0)';
            if (document.body) document.body.classList.add('sidebar-open');
        });
        
        if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => {
            if (sidebar) sidebar.style.transform = 'translateX(-100%)';
            if (document.body) document.body.classList.remove('sidebar-open');
        });

        accordionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const panel = button.nextElementSibling;
                const icon = button.querySelector('i');
                button.classList.toggle('active');
                if (panel) {
                    if (panel.style.maxHeight) {
                        panel.style.maxHeight = null;
                    } else {
                        panel.style.maxHeight = panel.scrollHeight + "px";
                    }
                }
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
            });
        });

        if (addBibleBtn) addBibleBtn.addEventListener('click', () => {
            const newName = newBibleNameInput.value.trim();
            if (newName) {
                if (bibleVersions.includes(newName)) {
                    alert('Ce nom de version existe déjà.');
                    return;
                }
                const confirmed = confirm(`Créer une nouvelle version nommée "${newName}" ?`);
                if (confirmed) {
                    bibleVersions.push(newName);
                    bibleVersionsDiffs[newName] = {};
                    if (newBibleNameInput) newBibleNameInput.value = '';
                    updateVersionSelectors();
                    switchBibleVersion(newName);
                }
            } else {
                alert('Veuillez entrer un nom.');
            }
        });

        if (manageBibleSelect) manageBibleSelect.addEventListener('change', (e) => {
            const selectedVersion = e.target.value;
            if (selectedVersion) {
                switchBibleVersion(selectedVersion);
            }
        });

        if (renameBibleBtn) renameBibleBtn.addEventListener('click', () => {
            const oldName = manageBibleSelect.value;
            if (!oldName) {
                alert('Veuillez sélectionner une version.');
                return;
            }
            const newName = prompt(`Entrez le nouveau nom pour "${oldName}" :`);
            if (newName && newName.trim() !== '' && !bibleVersions.includes(newName)) {
                const confirmed = confirm(`Renommer "${oldName}" en "${newName.trim()}" ?`);
                if (confirmed) {
                    const oldIndex = bibleVersions.indexOf(oldName);
                    if (oldIndex > -1) bibleVersions[oldIndex] = newName.trim();
                    const data = bibleVersionsDiffs[oldName] || {};
                    delete bibleVersionsDiffs[oldName];
                    bibleVersionsDiffs[newName.trim()] = data;
                    localStorage.removeItem(EDITED_KEY(oldName));
                    localStorage.setItem(EDITED_KEY(newName.trim()), JSON.stringify(data));
                    updateVersionSelectors();
                    switchBibleVersion(newName.trim());
                }
            } else {
                alert('Nom invalide ou déjà utilisé.');
            }
        });

        if (deleteBibleBtn) deleteBibleBtn.addEventListener('click', () => {
            const versionToDelete = manageBibleSelect.value;
            if (versionToDelete && versionToDelete !== 'Version Originale') {
                const confirmed = confirm(`Supprimer "${versionToDelete}" ?`);
                if (confirmed) {
                    const index = bibleVersions.indexOf(versionToDelete);
                    if (index > -1) bibleVersions.splice(index, 1);
                    delete bibleVersionsDiffs[versionToDelete];
                    localStorage.removeItem(EDITED_KEY(versionToDelete));
                    updateVersionSelectors();
                    const lastActiveVersion = localStorage.getItem('lastActiveVersion') || 'Version Originale';
                    switchBibleVersion(lastActiveVersion);
                }
            } else {
                alert('Impossible de supprimer la version originale.');
            }
        });

        if (versionSelect) versionSelect.addEventListener('change', (e) => switchBibleVersion(e.target.value));
        if (modifiedVersesToggle) modifiedVersesToggle.addEventListener('change', () => {
            modifiedVersesOnly = modifiedVersesToggle.checked;
            updateVerses();
        });
        if (bookSelect) bookSelect.addEventListener('change', (e) => {
            selectedBookIndex = Number(e.target.value);
            updateChapters();
        });
        if (chapterSelect) chapterSelect.addEventListener('change', (e) => {
            selectedChapterIndex = Number(e.target.value);
            updateVerses();
        });
        if (verseSelect) verseSelect.addEventListener('change', (e) => {
            selectedVerseIndex = Number(e.target.value);
            renderVerse();
        });
        if (toggleModeButton) toggleModeButton.addEventListener('click', () => {
            currentMode = currentMode === 'read' ? 'edit' : 'read';
            renderVerse();
        });
        if (toggleThemeButton) toggleThemeButton.addEventListener('click', () => {
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        });
        if (saveFileButton) saveFileButton.addEventListener('click', () => {
            if (currentVersionName === 'Version Originale') {
                alert("Impossible de sauvegarder la version originale.");
                return;
            }
            const dataToSave = exportCompact(currentVersionName);
            const blob = new Blob([dataToSave], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentVersionName}_diffs.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Votre version a été sauvegardée au format "diffs".');
        });
        
        if (loadFileButton) loadFileButton.addEventListener('click', () => { if (loadFileInput) loadFileInput.click(); });
        if (loadFileInput) loadFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => loadPersonalizedBible(e.target.result);
                reader.readAsText(file);
            }
        });

        if (previousVerseButton) previousVerseButton.addEventListener('click', goToPreviousVerse);
        if (nextVerseButton) nextVerseButton.addEventListener('click', goToNextVerse);
        if (textEditor) {
            textEditor.addEventListener('input', debouncedAutoSave);
            textEditor.addEventListener('blur', () => {
                if (currentMode === 'edit') {
                    saveEditedVerse(textEditor.value);
                }
            });
        }
    }
}

function applyTheme(theme) {
    if (document.body) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }
    if (toggleThemeButton) {
        toggleThemeButton.textContent = theme === 'dark' ? 'Clair' : 'Sombre';
    }
    currentTheme = theme;
    localStorage.setItem('theme', theme);
}

function saveBibleVersions() {
    localStorage.setItem(STORAGE_VERSIONS_KEY, JSON.stringify(bibleVersions));
    localStorage.setItem(STORAGE_ACTIVE_KEY, currentVersionName);
}

function loadBibleVersions() {
    bibleVersions = JSON.parse(localStorage.getItem(STORAGE_VERSIONS_KEY)) || ['Version Originale'];
    currentVersionName = localStorage.getItem(STORAGE_ACTIVE_KEY) || 'Version Originale';

    bibleVersionsDiffs = {};
    for (const name of bibleVersions) {
        if (name !== 'Version Originale') {
            bibleVersionsDiffs[name] = JSON.parse(localStorage.getItem(EDITED_KEY(name))) || {};
        }
    }
    updateVersionSelectors();
    switchBibleVersion(currentVersionName);
}

function updateVersionSelectors() {
    if (versionSelect) versionSelect.innerHTML = '';
    if (manageBibleSelect) manageBibleSelect.innerHTML = '';

    for (const versionName of bibleVersions) {
        const option = document.createElement('option');
        option.value = versionName;
        option.textContent = versionName;
        if (versionSelect) versionSelect.appendChild(option);
        if (versionName !== 'Version Originale' && manageBibleSelect) {
            manageBibleSelect.appendChild(option.cloneNode(true));
        }
    }

    if (versionSelect) versionSelect.value = currentVersionName;
    if (manageBibleSelect) manageBibleSelect.value = currentVersionName !== 'Version Originale' ? currentVersionName : '';
    if (deleteBibleBtn) deleteBibleBtn.disabled = currentVersionName === 'Version Originale';
    if (renameBibleBtn) renameBibleBtn.disabled = currentVersionName === 'Version Originale';
}

function switchBibleVersion(versionName) {
    if (!bibleVersions.includes(versionName)) {
        bibleVersions.push(versionName);
    }
    currentVersionName = versionName;
    if (!bibleVersionsDiffs[versionName]) {
        bibleVersionsDiffs[versionName] = JSON.parse(localStorage.getItem(EDITED_KEY(versionName))) || {};
    }
    updateCache(versionName);
    saveBibleVersions();
    populateDropdowns();
    renderVerse();
}

function updateCache(versionName) {
    editedBooksCache = new Set();
    editedChaptersCache = new Set();
    const diffs = bibleVersionsDiffs[versionName] || {};

    for (const key in diffs) {
        const [bookAbbr, chapterId] = key.split('_');
        editedBooksCache.add(bookAbbr);
        editedChaptersCache.add(`${bookAbbr}_${chapterId}`);
    }
}

function populateDropdowns() {
    if (bookSelect) bookSelect.innerHTML = '<option disabled selected value="">Livre</option>';
    if (chapterSelect) chapterSelect.innerHTML = '<option disabled selected value="">Chapitre</option>';
    if (verseSelect) verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
    
    let bookIndex = 0;
    for (const book of allBooks) {
        const option = document.createElement('option');
        option.value = bookIndex;
        option.textContent = book.Text || book.Name || book.Abbreviation;
        if (doesBookContainEditedVerses(book)) {
            option.classList.add('edited-verse');
        }
        if (bookSelect) bookSelect.appendChild(option);
        bookIndex++;
    }
    
    if (bookSelect) {
        if (selectedBookIndex !== -1 && bookSelect.querySelector(`option[value="${selectedBookIndex}"]`)) {
            bookSelect.value = selectedBookIndex;
            updateChapters();
        } else if (bookSelect.options.length > 1) {
            bookSelect.value = bookSelect.options[1].value;
            selectedBookIndex = Number(bookSelect.value);
            updateChapters();
        }
    }
}

function updateChapters() {
    if (chapterSelect) chapterSelect.innerHTML = '<option disabled selected value="">Chapitre</option>';
    if (chapterSelect) chapterSelect.disabled = true;
    if (verseSelect) verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
    if (verseSelect) verseSelect.disabled = true;

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
            if (chapterSelect) chapterSelect.appendChild(option);
            chapterIndex++;
        }
        if (chapterSelect) chapterSelect.disabled = false;
        if (selectedChapterIndex !== -1 && chapterSelect.querySelector(`option[value="${selectedChapterIndex}"]`)) {
            chapterSelect.value = selectedChapterIndex;
            updateVerses();
        } else if (chapterSelect && chapterSelect.options.length > 1) {
            chapterSelect.value = chapterSelect.options[1].value;
            selectedChapterIndex = Number(chapterSelect.value);
            updateVerses();
        }
    }
}

function updateVerses() {
    if (verseSelect) verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
    if (verseSelect) verseSelect.disabled = true;

    if (selectedBookIndex !== -1 && selectedChapterIndex !== -1) {
        const chapter = getSelectedChapter();
        const versesToDisplay = modifiedVersesOnly ? getEditedVersesInChapter(chapter) : chapter.Verses;
        
        if (versesToDisplay.length === 0 && modifiedVersesOnly) {
             if (verseSelect) verseSelect.innerHTML = '<option disabled selected value="">Pas de versets modifiés</option>';
             return;
        }

        for (const verse of versesToDisplay) {
            const originalIndex = chapter.Verses.findIndex(v => (v.ID && verse.ID && v.ID === verse.ID) || v === verse);
            if (originalIndex !== -1) {
                const option = document.createElement('option');
                option.value = originalIndex;
                const verseID = verse.ID || (originalIndex + 1);
                option.textContent = `Verset ${verseID}`;
                
                const book = getSelectedBook();
                const bookAbbr = book.Abbreviation || book.Text;
                const chapterID = chapter.ID || (selectedChapterIndex + 1);
                const verseKey = `${bookAbbr}_${chapterID}_${verseID}`;
                
                const diffs = bibleVersionsDiffs[currentVersionName] || {};
                if (diffs.hasOwnProperty(verseKey)) {
                    option.classList.add('edited-verse');
                }
                if (verseSelect) verseSelect.appendChild(option);
            }
        }

        if (verseSelect) {
            verseSelect.disabled = false;
            if (selectedVerseIndex !== -1 && verseSelect.querySelector(`option[value="${selectedVerseIndex}"]`)) {
                verseSelect.value = selectedVerseIndex;
            } else if (verseSelect.options.length > 1) {
                verseSelect.value = verseSelect.options[1].value;
                selectedVerseIndex = Number(verseSelect.value);
            } else {
                selectedVerseIndex = -1;
            }
        }
        renderVerse();
    }
}

function getSelectedBook() {
    return allBooks[selectedBookIndex] || null;
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
    if (!chapter || !chapter.Verses || verseSelect.value === '') {
        console.error("Verset non sélectionné ou index invalide.");
        return null;
    }

    const originalIndex = Number(verseSelect.value);
    if (isNaN(originalIndex) || originalIndex < 0 || originalIndex >= chapter.Verses.length) {
        console.error(`Index de verset invalide : ${originalIndex}`);
        return null;
    }

    return chapter.Verses[originalIndex];
}

function doesBookContainEditedVerses(book) {
    const bookAbbr = book.Abbreviation || book.Text;
    return editedBooksCache.has(bookAbbr);
}

function doesChapterContainEditedVerses(book, chapter) {
    const bookAbbr = book.Abbreviation || book.Text;
    const chapterID = chapter.ID || (book.Chapters.indexOf(chapter) + 1);
    return editedChaptersCache.has(`${bookAbbr}_${chapterID}`);
}

function getEditedVersesInChapter(chapter) {
    const editedVerses = [];
    const book = getSelectedBook();
    const bookAbbr = book.Abbreviation || book.Text;
    const chapterID = chapter.ID || (book.Chapters.indexOf(chapter) + 1);
    const diffs = bibleVersionsDiffs[currentVersionName] || {};
    
    for (const verse of chapter.Verses) {
        const verseId = verse.ID || (chapter.Verses.indexOf(verse) + 1);
        const key = `${bookAbbr}_${chapterID}_${verseId}`;
        if (diffs.hasOwnProperty(key)) {
            editedVerses.push(verse);
        }
    }
    return editedVerses;
}

function getOriginalVerse(book, chapter, verse) {
    const bookAbbr = book.Abbreviation || book.Text;
    const chapterId = chapter.ID || (book.Chapters.indexOf(chapter) + 1);
    const verseId = verse.ID || (chapter.Verses.indexOf(verse) + 1);

    const foundBook = allBooks.find(b => (b.Abbreviation || b.Text) === bookAbbr);
    if (foundBook) {
        const foundChapter = foundBook.Chapters.find(c => (c.ID || (foundBook.Chapters.indexOf(c) + 1)) === chapterId);
        if (foundChapter) {
            const foundVerse = foundChapter.Verses.find(v => (v.ID && verse.ID && v.ID === verse.ID) || v === verse);
            if (foundVerse) {
                return foundVerse.Text;
            }
        }
    }
    return null;
}

function createVerseKey(book, chapter, verse) {
    const bookAbbr = book.Abbreviation || book.Text;
    const chapterId = chapter.ID || (book.Chapters.indexOf(chapter) + 1);
    const verseId = verse.ID || (chapter.Verses.indexOf(verse) + 1);
    return `${bookAbbr}_${chapterId}_${verseId}`;
}

function getVerseText(verse, versionName = currentVersionName) {
    const book = getSelectedBook();
    const chapter = getSelectedChapter();
    if (!book || !chapter || !verse) return '';

    const key = createVerseKey(book, chapter, verse);
    const diffs = bibleVersionsDiffs[versionName] || {};
    return diffs[key] || getOriginalVerse(book, chapter, verse) || '';
}

function saveEditedVerse(newText) {
    const verse = getSelectedVerse();
    const book = getSelectedBook();
    const chapter = getSelectedChapter();
    if (!verse || !book || !chapter) return;

    const key = createVerseKey(book, chapter, verse);
    const originalText = getOriginalVerse(book, chapter, verse);
    const diffs = bibleVersionsDiffs[currentVersionName] || {};
    const trimmedNewText = newText.trim();
    const trimmedOriginalText = stripHtmlTags(originalText).trim();

    if (trimmedNewText === trimmedOriginalText) {
        if (diffs.hasOwnProperty(key)) {
            delete diffs[key];
            updateCache(currentVersionName);
        }
    } else {
        diffs[key] = newText;
        updateCache(currentVersionName);
    }

    bibleVersionsDiffs[currentVersionName] = diffs;
    localStorage.setItem(EDITED_KEY(currentVersionName), JSON.stringify(diffs));

    if (verseSelect) {
        const optionElement = verseSelect.querySelector(`option[value="${verseSelect.value}"]`);
        if (optionElement) {
            if (diffs.hasOwnProperty(key)) {
                optionElement.classList.add('edited-verse');
            } else {
                optionElement.classList.remove('edited-verse');
            }
        }
    }
    renderVerse();
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const debouncedAutoSave = debounce(() => {
    if (currentMode === 'edit') {
        const verse = getSelectedVerse();
        if (verse && textEditor.value.trim() !== getVerseText(verse).trim()) {
            saveEditedVerse(textEditor.value);
        }
    }
}, 500);

function renderVerse() {
    const verse = getSelectedVerse();
    if (!verse) {
        if (textDisplay) textDisplay.innerHTML = 'Sélectionnez un verset.';
        if (editArea) editArea.style.display = 'none';
        if (toggleModeButton) toggleModeButton.style.display = 'none';
        if (verseNavigationContainer) verseNavigationContainer.style.display = 'none';
        return;
    }

    const verseID = verse.ID || (getSelectedChapter().Verses.findIndex(v => v === verse) + 1);
    const chapterID = getSelectedChapter().ID || (getSelectedBook().Chapters.findIndex(c => c === getSelectedChapter()) + 1);
    const bookText = getSelectedBook().Text || getSelectedBook().Abbreviation;
    
    let verseText = getVerseText(verse);

    if (toggleModeButton) toggleModeButton.textContent = currentMode === 'read' ? 'Édition' : 'Lecture';
    if (toggleModeButton) toggleModeButton.style.display = 'block';
    if (verseNavigationContainer) verseNavigationContainer.style.display = 'flex';
    if (currentVerseInfo) currentVerseInfo.textContent = `${bookText} ${chapterID}:${verseID}`;

    if (currentMode === 'read') {
        if (textDisplay) textDisplay.innerHTML = `<p>${verseText}</p>`;
        if (textDisplay) textDisplay.style.display = 'block';
        if (editArea) editArea.style.display = 'none';
    } else {
        if (textEditor) textEditor.value = stripHtmlTags(verseText);
        if (editArea) editArea.style.display = 'block';
        if (textDisplay) textDisplay.style.display = 'none';
    }
    updateNavigationButtons();
}

function stripHtmlTags(html) {
    return html.replace(/<[^>]*>/g, '');
}

function goToVerse(bookIndex, chapterIndex, verseIndex) {
    selectedBookIndex = bookIndex;
    selectedChapterIndex = chapterIndex;
    selectedVerseIndex = verseIndex;

    if (bookSelect) bookSelect.value = selectedBookIndex;
    updateChapters();
    if (chapterSelect) chapterSelect.value = selectedChapterIndex;
    updateVerses();
    if (verseSelect) verseSelect.value = selectedVerseIndex;
    renderVerse();

    localStorage.setItem('lastBookIndex', selectedBookIndex);
    localStorage.setItem('lastChapterIndex', selectedChapterIndex);
    localStorage.setItem('lastVerseIndex', selectedVerseIndex);
}

function goToNextVerse() {
    const book = getSelectedBook();
    const chapter = getSelectedChapter();
    
    const versesToDisplay = modifiedVersesOnly ? getEditedVersesInChapter(chapter) : chapter.Verses;
    const currentVerse = getSelectedVerse();
    const currentVerseIndexInDisplay = versesToDisplay.findIndex(v => v === currentVerse);
    
    if (currentVerseIndexInDisplay !== -1 && currentVerseIndexInDisplay < versesToDisplay.length - 1) {
        const nextVerse = versesToDisplay[currentVerseIndexInDisplay + 1];
        const nextVerseOriginalIndex = getSelectedChapter().Verses.findIndex(v => v === nextVerse);
        goToVerse(selectedBookIndex, selectedChapterIndex, nextVerseOriginalIndex);
    } else if (modifiedVersesOnly) {
        const nextModifiedChapter = getNextModifiedChapter(selectedBookIndex, selectedChapterIndex);
        if (nextModifiedChapter) {
            goToVerse(nextModifiedChapter.bookIndex, nextModifiedChapter.chapterIndex, 0);
        } else {
            const nextModifiedBook = getNextModifiedBook(selectedBookIndex);
            if (nextModifiedBook) {
                goToVerse(nextModifiedBook.bookIndex, nextModifiedBook.chapterIndex, 0);
            }
        }
    } else {
        let nextChapterIndex = parseInt(selectedChapterIndex) + 1;
        if (nextChapterIndex < book.Chapters.length) {
            goToVerse(selectedBookIndex, nextChapterIndex, 0);
        } else {
            let nextBookIndex = parseInt(selectedBookIndex) + 1;
            if (nextBookIndex < allBooks.length) {
                goToVerse(nextBookIndex, 0, 0);
            }
        }
    }
}

function goToPreviousVerse() {
    const book = getSelectedBook();
    const chapter = getSelectedChapter();
    
    const versesToDisplay = modifiedVersesOnly ? getEditedVersesInChapter(chapter) : chapter.Verses;
    const currentVerse = getSelectedVerse();
    const currentVerseIndexInDisplay = versesToDisplay.findIndex(v => v === currentVerse);
    
    if (currentVerseIndexInDisplay > 0) {
        const prevVerse = versesToDisplay[currentVerseIndexInDisplay - 1];
        const prevVerseOriginalIndex = getSelectedChapter().Verses.findIndex(v => v === prevVerse);
        goToVerse(selectedBookIndex, selectedChapterIndex, prevVerseOriginalIndex);
    } else if (modifiedVersesOnly) {
        const prevModifiedChapter = getPreviousModifiedChapter(selectedBookIndex, selectedChapterIndex);
        if (prevModifiedChapter) {
            const prevChapter = allBooks[prevModifiedChapter.bookIndex].Chapters[prevModifiedChapter.chapterIndex];
            const lastVerseIndex = prevChapter.Verses.length - 1;
            goToVerse(prevModifiedChapter.bookIndex, prevModifiedChapter.chapterIndex, lastVerseIndex);
        } else {
            const prevModifiedBook = getPreviousModifiedBook(selectedBookIndex);
            if (prevModifiedBook) {
                const prevBook = allBooks[prevModifiedBook.bookIndex];
                const lastChapterIndex = prevBook.Chapters.length - 1;
                const lastVerseIndex = prevBook.Chapters[lastChapterIndex].Verses.length - 1;
                goToVerse(prevModifiedBook.bookIndex, lastChapterIndex, lastVerseIndex);
            }
        }
    } else {
        let prevChapterIndex = parseInt(selectedChapterIndex) - 1;
        if (prevChapterIndex >= 0) {
            const prevChapter = book.Chapters[prevChapterIndex];
            const lastVerseIndex = prevChapter.Verses.length - 1;
            goToVerse(selectedBookIndex, prevChapterIndex, lastVerseIndex);
        } else {
            let prevBookIndex = parseInt(selectedBookIndex) - 1;
            if (prevBookIndex >= 0) {
                const prevBook = allBooks[prevBookIndex];
                const lastChapterIndex = prevBook.Chapters.length - 1;
                const lastVerseIndex = prevBook.Chapters[lastChapterIndex].Verses.length - 1;
                goToVerse(prevBookIndex, lastChapterIndex, lastVerseIndex);
            }
        }
    }
}

function getNextModifiedChapter(startBookIndex, startChapterIndex) {
    for (let b = startBookIndex; b < allBooks.length; b++) {
        const book = allBooks[b];
        const startC = (b === startBookIndex) ? startChapterIndex + 1 : 0;
        for (let c = startC; c < book.Chapters.length; c++) {
            if (doesChapterContainEditedVerses(book, book.Chapters[c])) {
                return { bookIndex: b, chapterIndex: c };
            }
        }
    }
    return null;
}

function getPreviousModifiedChapter(startBookIndex, startChapterIndex) {
    for (let b = startBookIndex; b >= 0; b--) {
        const book = allBooks[b];
        const startC = (b === startBookIndex) ? startChapterIndex - 1 : book.Chapters.length - 1;
        for (let c = startC; c >= 0; c--) {
            if (doesChapterContainEditedVerses(book, book.Chapters[c])) {
                return { bookIndex: b, chapterIndex: c };
            }
        }
    }
    return null;
}

function getNextModifiedBook(startBookIndex) {
    for (let b = startBookIndex + 1; b < allBooks.length; b++) {
        const book = allBooks[b];
        if (doesBookContainEditedVerses(book)) {
            return { bookIndex: b, chapterIndex: 0 };
        }
    }
    return null;
}

function getPreviousModifiedBook(startBookIndex) {
    for (let b = startBookIndex - 1; b >= 0; b--) {
        const book = allBooks[b];
        if (doesBookContainEditedVerses(book)) {
            const lastChapterIndex = book.Chapters.length - 1;
            return { bookIndex: b, chapterIndex: lastChapterIndex };
        }
    }
    return null;
}


function updateNavigationButtons() {
    const book = getSelectedBook();
    const chapter = getSelectedChapter();
    if (!book || !chapter || selectedVerseIndex === -1) {
        if (previousVerseButton) previousVerseButton.disabled = true;
        if (nextVerseButton) nextVerseButton.disabled = true;
        return;
    }

    const versesToDisplay = modifiedVersesOnly ? getEditedVersesInChapter(chapter) : chapter.Verses;
    const currentVerse = getSelectedVerse();
    const currentVerseIndexInDisplay = versesToDisplay.findIndex(v => v === currentVerse);
    
    const isFirstVerse = currentVerseIndexInDisplay === 0;
    const isLastVerse = currentVerseIndexInDisplay === versesToDisplay.length - 1;
    const isFirstChapter = selectedChapterIndex === 0;
    const isLastChapter = selectedChapterIndex === book.Chapters.length - 1;
    const isFirstBook = selectedBookIndex === 0;
    const isLastBook = selectedBookIndex === allBooks.length - 1;

    if (modifiedVersesOnly) {
        if (previousVerseButton) previousVerseButton.disabled = isFirstVerse && !getPreviousModifiedChapter(selectedBookIndex, selectedChapterIndex) && !getPreviousModifiedBook(selectedBookIndex);
        if (nextVerseButton) nextVerseButton.disabled = isLastVerse && !getNextModifiedChapter(selectedBookIndex, selectedChapterIndex) && !getNextModifiedBook(selectedBookIndex);
    } else {
        if (previousVerseButton) previousVerseButton.disabled = isFirstVerse && isFirstChapter && isFirstBook;
        if (nextVerseButton) nextVerseButton.disabled = isLastVerse && isLastChapter && isLastBook;
    }
}

function loadPersonalizedBible(fileContent) {
    try {
        const importedData = JSON.parse(fileContent);
        if (importedData.diffs && importedData.versionName) {
            // Vérifier la correspondance des clés de diffs avec la Bible actuelle
            const diffs = importedData.diffs;
            const invalidKeys = Object.keys(diffs).filter(key => {
                const parts = key.split('_');
                if (parts.length !== 3) return true;
                const [bookAbbr, chapterId, verseId] = parts;
                const book = allBooks.find(b => (b.Abbreviation || b.Text) === bookAbbr);
                if (!book) return true;
                const chapter = book.Chapters.find(c => (c.ID || (book.Chapters.indexOf(c) + 1)).toString() === chapterId);
                if (!chapter) return true;
                const verse = chapter.Verses.find(v => (v.ID || (chapter.Verses.indexOf(v) + 1)).toString() === verseId);
                return !verse;
            });

            if (invalidKeys.length > 0) {
                alert(`Attention : le fichier contient ${invalidKeys.length} verset(s) qui ne correspondent pas à cette Bible. L'importation sera partielle.`);
            }

            const newVersionName = prompt("Entrez un nom pour cette version des diffs :");
            if (newVersionName && newVersionName.trim() !== '' && !bibleVersions.includes(newVersionName)) {
                bibleVersions.push(newVersionName.trim());
                bibleVersionsDiffs[newVersionName] = diffs;
                saveBibleVersions();
                switchBibleVersion(newVersionName);
                alert(`Les diffs ont été importés et la version "${newVersionName}" a été créée !`);
            } else {
                alert("Nom de version invalide ou déjà existant. L'importation a été annulée.");
            }
        } else {
            alert("Erreur: Le format de fichier n'est pas un export de diffs valide.");
        }
    } catch (e) {
        console.error("Erreur de chargement du fichier :", e);
        alert("Erreur: Le fichier sélectionné n'est pas un export de Bible valide.");
    }
}

function exportCompact(name) {
    const diffs = bibleVersionsDiffs[name] || {};
    return JSON.stringify({ versionName: name, diffs }, null, 2);
}

function exportComplete(name) {
    alert("Attention : L'export complet peut générer un fichier très volumineux et prendre du temps.");
    const copy = JSON.parse(JSON.stringify(window.BIBLEDATA));
    const diffs = bibleVersionsDiffs[name] || {};

    for (const key in diffs) {
        const [bookAbbr, chapterId, verseId] = key.split('_');
        let found = false;
        for (const testament of copy.Testaments) {
            for (const book of testament.Books) {
                if ((book.Abbreviation || book.Text) === bookAbbr) {
                    const chapter = book.Chapters.find(ch => (ch.ID || (book.Chapters.indexOf(ch) + 1)).toString() === chapterId);
                    if (chapter) {
                        const verse = chapter.Verses.find(v => (v.ID || (chapter.Verses.indexOf(v) + 1)).toString() === verseId);
                        if (verse) {
                            verse.Text = diffs[key];
                            found = true;
                            break;
                        }
                    }
                }
            }
            if (found) break;
        }
    }
    return `const BIBLEDATA = ${JSON.stringify(copy, null, 2)};`;
}

// L'exécution du code principal
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        queryAllElements();
        initializeApp();
    });
} else {
    queryAllElements();
    initializeApp();
}
