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
const exportCompactBtn = document.getElementById('export-compact-btn'); // NOUVEAU
const exportCompleteBtn = document.getElementById('export-complete-btn'); // NOUVEAU

// Variables de gestion de l'état
let currentMode = 'read';
let selectedBookIndex = -1;
let selectedChapterIndex = -1;
let selectedVerseIndex = -1;
let currentTheme = 'light';
let editedData = {}; // Sera toujours le diff de la version actuelle
let bibleVersions = ['Version Originale']; // Stocke les noms des versions
let currentVersionName = 'Version Originale';
let modifiedVersesOnly = false;
let allBibleData = {}; // Contiendra la version originale chargée

// --- FONCTIONS UTILITAIRES POUR L'ACCÈS AUX DONNÉES ---
// Identifie de manière unique un verset, quel que soit l'ID de la source
function getVerseId(book, chapter, verse) {
    const bookAbbr = book.Abbreviation || book.Text;
    const chapterId = chapter.ID || (book.Chapters.findIndex(c => c === chapter) + 1);
    const verseId = verse.ID || (chapter.Verses.findIndex(v => v === verse) + 1);
    return `${bookAbbr}_${chapterId}_${verseId}`;
}

// Récupère le texte original d'un verset
function getOriginalVerseText(bookIndex, chapterIndex, verseIndex) {
    const book = allBibleData.Testaments.flatMap(t => t.Books)[bookIndex];
    if (!book) return '';
    const chapter = book.Chapters[chapterIndex];
    if (!chapter) return '';
    const verse = chapter.Verses[verseIndex];
    return verse ? verse.Text : '';
}

// Récupère le texte d'un verset, soit modifié, soit original
function getVerseText(bookIndex, chapterIndex, verseIndex) {
    const book = allBibleData.Testaments.flatMap(t => t.Books)[bookIndex];
    const chapter = book.Chapters[chapterIndex];
    const verse = chapter.Verses[verseIndex];
    const verseId = getVerseId(book, chapter, verse);
    return editedData[verseId] || getOriginalVerseText(bookIndex, chapterIndex, verseIndex);
}

// --- VÉRIFICATION ET INITIALISATION DES DONNÉES ---
if (typeof BIBLEDATA === 'undefined' || !BIBLEDATA.Testaments) {
    textDisplay.innerHTML = `<p style="color:red; text-align:center;">Erreur de chargement des données. Veuillez vérifier le fichier bible-data.js.</p>`;
    console.error("Erreur: La variable BIBLEDATA n'est pas définie ou ne contient pas la bonne structure.");
} else {
    allBibleData = BIBLEDATA;
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
        // Sauvegarde uniquement la liste des noms de versions personnalisées
        const versionsToSave = bibleVersions.filter(name => name !== 'Version Originale');
        localStorage.setItem('bibleVersions', JSON.stringify(versionsToSave));
        localStorage.setItem('currentVersion', currentVersionName);
    }

    function loadBibleVersions() {
        bibleVersions = ['Version Originale'];
        const savedVersions = JSON.parse(localStorage.getItem('bibleVersions')) || [];
        bibleVersions = bibleVersions.concat(savedVersions);
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

        for (const version of bibleVersions) {
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
        
        // Charger le diff de la nouvelle version
        editedData = JSON.parse(localStorage.getItem(`editedData_${currentVersionName}`)) || {};

        populateDropdowns();
        
        if (previousBookIndex !== -1 && previousChapterIndex !== -1 && previousVerseIndex !== -1) {
            selectedBookIndex = previousBookIndex;
            selectedChapterIndex = previousChapterIndex;
            selectedVerseIndex = previousVerseIndex;
        } else {
            loadState();
        }
        
        // Re-sélectionner les valeurs et mettre à jour l'affichage
        if (selectedBookIndex !== -1) {
            bookSelect.value = selectedBookIndex;
            updateChapters();
            if (selectedChapterIndex !== -1) {
                chapterSelect.value = selectedChapterIndex;
                updateVerses();
                if (selectedVerseIndex !== -1) {
                    verseSelect.value = selectedVerseIndex;
                }
            }
        }
        
        renderVerse();
        saveBibleVersions();
    }
    
    // --- FONCTIONS DE GESTION DE L'INTERFACE ---
    function populateDropdowns() {
        bookSelect.innerHTML = '<option disabled selected value="">Livre</option>';
        chapterSelect.innerHTML = '<option disabled selected value="">Chapitre</option>';
        verseSelect.innerHTML = '<option disabled selected value="">Verset</option>';
        
        const fragment = document.createDocumentFragment();
        let bookIndex = 0;
        for (const testament of allBibleData.Testaments) {
            for (const book of testament.Books) {
                const option = document.createElement('option');
                option.value = bookIndex;
                option.textContent = book.Text || book.Name || book.Abbreviation;
                
                if (doesBookContainEditedVerses(book)) {
                    option.classList.add('edited-verse');
                }
                
                fragment.appendChild(option);
                bookIndex++;
            }
        }
        bookSelect.appendChild(fragment);
        
        if (bookSelect.options.length > 1) {
            bookSelect.value = selectedBookIndex >= 0 && bookSelect.options[selectedBookIndex + 1] ? selectedBookIndex : 0;
            selectedBookIndex = bookSelect.value;
            updateChapters();
        }
    }
    
    // ... (les fonctions updateChapters et updateVerses n'ont pas besoin de changer, elles utilisent déjà les variables globales)

    // --- FONCTIONS UTILITAIRES POUR L'ACCÈS AUX DONNÉES ---
    // (Cette section ne change pas, car elle est générique)

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
        
        // Utilisation de la nouvelle fonction pour obtenir le texte
        const verseText = getVerseText(selectedBookIndex, selectedChapterIndex, selectedVerseIndex);

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
    
    // ... (les fonctions de navigation ne changent pas)

    // --- GESTION DE L'ÉTAT ET SAUVEGARDE LOCALE ---
    // ... (loadState ne change pas)

    function autoSave() {
        const verse = getSelectedVerse();
        if (!verse) return;
        
        // Utilisation de la fonction d'utilitaire pour obtenir l'ID
        const verseId = getVerseId(getSelectedBook(), getSelectedChapter(), verse);
        const originalText = getOriginalVerseText(selectedBookIndex, selectedChapterIndex, selectedVerseIndex);
        const editedText = textEditor.value;

        // Logique pour n'enregistrer que le diff
        if (stripHtmlTags(editedText) !== stripHtmlTags(originalText) && editedText.trim() !== '') {
            editedData[verseId] = `<strong>${editedText}</strong>`;
        } else {
            delete editedData[verseId];
        }

        // Sauvegarde uniquement le diff de la version active
        localStorage.setItem(`editedData_${currentVersionName}`, JSON.stringify(editedData));
        localStorage.setItem('lastBookIndex', selectedBookIndex);
        localStorage.setItem('lastChapterIndex', selectedChapterIndex);
        localStorage.setItem('lastVerseIndex', selectedVerseIndex);
        localStorage.setItem('theme', currentTheme);
        localStorage.setItem('currentVersion', currentVersionName);
    }
    
    // Fonctions d'export/import
    function exportCompact() {
        const diffs = editedData;
        const dataContent = `const DIFFS = ${JSON.stringify(diffs, null, 2)};`;
        const blob = new Blob([dataContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentVersionName}_diffs.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Diffs exportés !');
    }

    function exportComplete() {
        const fullBible = JSON.parse(JSON.stringify(allBibleData));
        // Appliquer les diffs à la copie complète
        for (const verseId in editedData) {
            const [bookAbbr, chapterId, verseIdNum] = verseId.split('_');
            const book = fullBible.Testaments.flatMap(t => t.Books).find(b => b.Abbreviation === bookAbbr || b.Text === bookAbbr);
            if (book) {
                const chapter = book.Chapters.find(c => (c.ID || c.ID_string) == chapterId);
                if (chapter) {
                    const verse = chapter.Verses.find(v => (v.ID || v.ID_string) == verseIdNum);
                    if (verse) {
                        verse.Text = editedData[verseId];
                    }
                }
            }
        }
        const dataContent = `const BIBLEDATA = ${JSON.stringify(fullBible, null, 2)};`;
        const blob = new Blob([dataContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentVersionName}_complete.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Version complète exportée !');
    }
    
    function importCompact(fileContent, newVersionName) {
        try {
            let tempDiffs = {};
            eval(fileContent.replace('const DIFFS', 'tempDiffs'));
            if (typeof tempDiffs !== 'object') {
                throw new Error('Le fichier ne contient pas la bonne structure de données (diffs).');
            }
            if (bibleVersions.includes(newVersionName)) {
                alert('Ce nom de version existe déjà. Veuillez en choisir un autre.');
                return;
            }
            localStorage.setItem(`editedData_${newVersionName}`, JSON.stringify(tempDiffs));
            bibleVersions.push(newVersionName);
            updateVersionSelectors();
            switchBibleVersion(newVersionName);
            alert(`La version "${newVersionName}" a été chargée avec succès !`);
        } catch (e) {
            console.error('Erreur de chargement du fichier (compact) :', e);
            alert('Erreur: Le fichier sélectionné n\'est pas un fichier de diff valide.');
        }
    }
    
    function importComplete(fileContent, newVersionName) {
        try {
            let tempBIBLEDATA = {};
            eval(fileContent.replace('const BIBLEDATA', 'tempBIBLEDATA'));
            if (typeof tempBIBLEDATA !== 'object' || !tempBIBLEDATA.Testaments) {
                throw new Error('Le fichier ne contient pas la bonne structure de données (complète).');
            }
            // Créer les diffs à partir de la version complète importée
            const newDiffs = {};
            for (const testament of tempBIBLEDATA.Testaments) {
                for (const book of testament.Books) {
                    for (const chapter of book.Chapters) {
                        for (const verse of chapter.Verses) {
                            const originalText = getOriginalVerseText(allBibleData.Testaments.flatMap(t=>t.Books).findIndex(b=>b.Text===book.Text), book.Chapters.findIndex(c=>c.ID===chapter.ID), chapter.Verses.findIndex(v=>v.ID===verse.ID));
                            const newText = verse.Text;
                            if (stripHtmlTags(newText) !== stripHtmlTags(originalText) && newText.trim() !== '') {
                                const verseId = getVerseId(book, chapter, verse);
                                newDiffs[verseId] = newText;
                            }
                        }
                    }
                }
            }
            if (bibleVersions.includes(newVersionName)) {
                alert('Ce nom de version existe déjà. Veuillez en choisir un autre.');
                return;
            }
            localStorage.setItem(`editedData_${newVersionName}`, JSON.stringify(newDiffs));
            bibleVersions.push(newVersionName);
            updateVersionSelectors();
            switchBibleVersion(newVersionName);
            alert(`La version "${newVersionName}" a été chargée avec succès !`);
        } catch (e) {
            console.error('Erreur de chargement du fichier (complet) :', e);
            alert('Erreur: Le fichier sélectionné n\'est pas un fichier de version complète valide.');
        }
    }


    // --- GESTION DES ÉVÉNEMENTS ---
    // ... (la plupart des événements ne changent pas)

    addBibleBtn.addEventListener('click', () => {
        const newName = newBibleNameInput.value.trim();
        if (newName) {
            if (bibleVersions.includes(newName)) {
                alert('Ce nom de version existe déjà. Veuillez en choisir un autre.');
                return;
            }
            const confirmed = confirm(`Êtes-vous sûr de vouloir créer une nouvelle version nommée "${newName}" ?`);
            if (confirmed) {
                bibleVersions.push(newName);
                newBibleNameInput.value = '';
                updateVersionSelectors();
                switchBibleVersion(newName); // Crée un diff vide pour la nouvelle version
            }
        } else {
            alert('Veuillez entrer un nom pour la nouvelle version.');
        }
    });

    renameBibleBtn.addEventListener('click', () => {
        const oldName = manageBibleSelect.value;
        if (!oldName || oldName === 'Version Originale') {
            alert('Veuillez sélectionner une version personnalisée à renommer.');
            return;
        }
        const newName = prompt(`Entrez le nouveau nom pour "${oldName}" :`);
        if (newName && newName.trim() !== '' && !bibleVersions.includes(newName)) {
            const confirmed = confirm(`Êtes-vous sûr de vouloir renommer "${oldName}" en "${newName}" ?`);
            if (confirmed) {
                const oldDiffs = localStorage.getItem(`editedData_${oldName}`);
                if (oldDiffs) {
                    localStorage.setItem(`editedData_${newName}`, oldDiffs);
                }
                localStorage.removeItem(`editedData_${oldName}`);
                const index = bibleVersions.indexOf(oldName);
                if (index > -1) {
                    bibleVersions[index] = newName;
                }
                updateVersionSelectors();
                switchBibleVersion(newName);
            }
        } else {
            alert('Nom invalide ou déjà utilisé.');
        }
    });

    deleteBibleBtn.addEventListener('click', () => {
        const versionToDelete = manageBibleSelect.value;
        if (versionToDelete && versionToDelete !== 'Version Originale') {
            const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer la version "${versionToDelete}" ? Cette action est irréversible.`);
            if (confirmed) {
                const index = bibleVersions.indexOf(versionToDelete);
                if (index > -1) {
                    bibleVersions.splice(index, 1);
                }
                localStorage.removeItem(`editedData_${versionToDelete}`);
                updateVersionSelectors();
                switchBibleVersion('Version Originale');
            }
        } else {
            alert('Impossible de supprimer la version originale.');
        }
    });
    
    // Événements des nouveaux boutons d'export/import
    saveFileButton.addEventListener('click', exportComplete);
    exportCompactBtn.addEventListener('click', exportCompact);
    
    loadFileButton.addEventListener('click', () => {
        loadFileInput.click();
    });
    
    loadFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newVersionName = prompt("Entrez un nom pour cette version de la Bible chargée :");
                if (newVersionName) {
                    // Déterminer le type d'import (compact ou complet)
                    if (e.target.result.includes('const DIFFS')) {
                        importCompact(e.target.result, newVersionName);
                    } else if (e.target.result.includes('const BIBLEDATA')) {
                        importComplete(e.target.result, newVersionName);
                    } else {
                        alert('Format de fichier non reconnu. Veuillez choisir un fichier de diff ou de version complète.');
                    }
                }
            };
            reader.readAsText(file);
        }
    });
    
    // ... (le reste des écouteurs d'événements ne change pas)

    // Lancement de l'application
    loadBibleVersions();
    setInterval(autoSave, 120000);
}

// Les fonctions getSelectedBook, getSelectedChapter, etc., sont toujours valables
// Elles utilisent toujours les variables globales.
// (Ne pas les inclure dans le fichier, sauf si elles ont été modifiées)
// La logique de navigation (précédent/suivant) reste la même.

