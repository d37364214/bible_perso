function populateDropdowns() {
    // Remplissage de la liste des livres à partir des deux testaments
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
        // Sélectionne le premier livre si rien n'est sélectionné
        if (bookSelect.selectedIndex === -1) {
            bookSelect.selectedIndex = 1; 
        }
        selectedBookIndex = bookSelect.value;
        updateChapters();
    }
}
