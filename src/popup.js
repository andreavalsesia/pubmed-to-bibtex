// Generate the snippet when the popup is opened
async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.url?.includes("pubmed.ncbi.nlm.nih.gov")) {
        chrome.tabs.sendMessage(tab.id, { action: "extract" }, (response) => {
            if (response && response.bibtex) {
                document.getElementById('preview').innerText = response.bibtex;
            } else {
                document.getElementById('preview').innerText = "Data not found. Open an article page in PubMed or reload it";
            }
        });
    } else {
        document.getElementById('preview').innerText = "Open a PubMed page at https://pubmed.ncbi.nlm.nih.gov/ to start.";
    }
}

// Handle "copy button" click
document.getElementById('copyBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "extract" }, (response) => {
        if (chrome.runtime.lastError || !response) {
            alert("Error: Reload the PubMed page.");
            return;
        }

        if (response.bibtex) {
            // Copy into system clipboard
            navigator.clipboard.writeText(response.bibtex);

            // Save in browser local storage
            chrome.storage.local.get({ library: [] }, (data) => {
                const newItem = {
                    pmid: response.pmid || "N/D",
                    title: response.title || "No Title",
                    bib: response.bibtex
                };

                // Don't save the entry if a corresponding PMID is already in library
                const exists = data.library.some(item => item.pmid === newItem.pmid);

                let updatedLibrary;
                if (!exists) {
                    updatedLibrary = [newItem, ...data.library];
                } else {
                    updatedLibrary = data.library;
                }

                // Save and refresh
                chrome.storage.local.set({ library: updatedLibrary }, () => {
                    renderLibrary();

                    const btn = document.getElementById('copyBtn');
                    const originalText = btn.innerHTML;
                    btn.innerHTML = "✓ Copied!";
                    btn.style.background = "#28a745";

                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = "";
                    }, 2000);
                });
            });
        }
    });
});

// Generate an HTML div for each paper in the library
function renderLibrary() {
    chrome.storage.local.get({ library: [] }, (data) => {
        const container = document.getElementById('library');

        if (data.library.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#888; font-size:12px;">Your library is empty.</div>`;
            return;
        }

        // Generate the list keeping the last saved entry at the top
        container.innerHTML = data.library.map((item, index) => `
      <div class="library-item">
        <div class="item-title">
          ${item.title}
        </div>
        <div class="item-actions">
          <a href="https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/" 
             target="_blank"
             style="font-family: monospace; font-size: 10px; color: #007AFF; text-decoration: none;">
             PMID: ${item.pmid} ↗
          </a>
          <div style="display: flex; gap: 8px;">
            <button class="action-btn copy-item" data-index="${index}" title="Copy to BibTeX">
                <svg class="w-[18px] h-[18px] text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-5-4v4h4V3h-4Z"/>
                </svg>
            </button>
            <button class="action-btn danger delete-item" data-index="${index}" title="Delete">
                <svg class="w-[18px] h-[18px] text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                </svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');

        attachLibraryEvents(data.library);
    });
}

// Manage click events for single library items
function attachLibraryEvents(libraryData) {
    // COPY ITEM
    document.querySelectorAll('.copy-item').forEach(btn => {
        btn.onclick = (e) => {
            const index = e.target.dataset.index;
            navigator.clipboard.writeText(libraryData[index].bib).then(() => {
                const originalIcon = e.target.innerText;
                e.target.innerText = "✓";
                setTimeout(() => e.target.innerText = originalIcon, 1500);
            });
        };
    });

    // DELETE ITEM
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.onclick = (e) => {
            const index = parseInt(e.target.dataset.index);
            const updated = libraryData.filter((_, i) => i !== index);
            chrome.storage.local.set({ library: updated }, renderLibrary);
        };
    });
}

// Load the library when the popup is opened
document.addEventListener('DOMContentLoaded', renderLibrary);


// EXPORT JSON
document.getElementById('exportJsonBtn').addEventListener('click', () => {
    chrome.storage.local.get({ library: [] }, (data) => {
        if (data.library.length === 0) return alert("Empty library!");

        const blob = new Blob([JSON.stringify(data.library, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `pubmed_library_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
});

// IMPORT JSON
document.getElementById('importJsonBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) throw new Error();

            chrome.storage.local.get({ library: [] }, (data) => {
                // Merge data from the imported list with the local list. In this way, already saved elements are not duplicated
                const merged = [...importedData, ...data.library];
                const unique = merged.filter((v, i, a) => a.findIndex(t => t.pmid === v.pmid) === i);

                chrome.storage.local.set({ library: unique }, () => {
                    renderLibrary();
                    alert("Backup successfully loaded!");
                });
            });
        } catch (err) {
            alert("Error: The file is not a valid backup file.");
        }
    };
    reader.readAsText(file);
});

// Load everything
init();
