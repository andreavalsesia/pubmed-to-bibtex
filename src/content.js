const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || "";

// Extract data from website page and return a formatted snippet
function getBibTeX() {
    const raw_authors = getMeta("citation_authors");

    const authors_array = raw_authors.split(';').map(a => a.trim()).filter(a => a !== "");

    const authors = authors_array.map(a => {
        let name = a.trim();
        return name.replace(/\s+([A-Z]{1,3})$/, (match, initials) => {
            const dottedInitials = initials.split('').join('. ') + '.';
            return `, ${dottedInitials}`;
        });
    }).join(" and ");

    const citText = document.querySelector('.cit')?.innerText || "";
    const pagesMatch = citText.match(/:(\w+-?\w*)\.?$/) || citText.match(/:(\w+-?\w*)\s/);
    let pages = pagesMatch ? pagesMatch[1] : "";
    if (pages.includes('-')) {
        let [start, end] = pages.split('-');

        if (end.length < start.length) {
            const prefix = start.substring(0, start.length - end.length);
            end = prefix + end;
        }

        pages = `${start}--${end}`;
    }

    const title = formatForLatex(getMeta("citation_title"));
    let journal = getMeta("citation_journal_title");
    journal = formatForLatex(journal.split("(")[0].trim());

    const date = getMeta("citation_date")?.split(" ")[0];
    let year;
    if (date.split("/").length == 3) {
        year = date.split("/")[2];
    } else {
        year = date;
    }

    const doi = getMeta("citation_doi");
    const volume = getMeta("citation_volume");

    const first_author = authors_array[0].split(" ")[0];
    const citeKey = `${first_author}${year}`;

    const output = `@article{${citeKey},
    author = {${authors}},
    title = {${title}},
    journal = {${journal}},
    volume = {${volume}},
    pages = {${pages}},
    year = {${year}}
    }`;

    console.log(output);

    return output;
}

function formatForLatex(text) {
    if (!text) return "";

    let escaped = text.replace(/[&%$#_{}]/g, "\\$&");

    escaped = escaped
        .replace(/~/g, "\\textasciitilde ")
        .replace(/\^/g, "\\textasciicircum ");

    return escaped.replace(/\b([A-Z0-9]{2,}|[a-z]+[A-Z][a-z]*)\b/g, "{$1}");
}

// Listen for the "copy button" input
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {

        const title = getMeta("citation_title");
        const pmid = getMeta("citation_pmid");

        // Return the snippet along with title and pmid to save the paper in the library
        sendResponse({ bibtex: getBibTeX(), title: title, pmid: pmid });
    }
});

function injectStyles() {
    if (document.getElementById('pubmed-bib-styles')) return;

    const style = document.createElement('style');
    style.id = 'pubmed-bib-styles';
    style.textContent = `
        #pubmed-to-bib-btn {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px;
            border-radius: 3px !important;
            width: 141px !important;
            margin: 0 !important;
            padding-left: 10px;
            padding-right: 10px;
            background-color: darkorange !important;
            transition: all 0.1s ease !important;
        }
        #pubmed-to-bib-btn:hover {
            background-color: orange !important;
        }
    `;
    document.head.appendChild(style);
}

function injectBibButton() {
    injectStyles()

    // Cerchiamo la barra delle azioni di PubMed
    const actionButtons = document.querySelector('.actions-buttons .inner-wrap');
    if (!actionButtons || document.getElementById('pubmed-to-bib-btn')) return;

    // Creiamo il bottone copiando lo stile di PubMed
    const btn = document.createElement('button');
    btn.id = 'pubmed-to-bib-btn';
    btn.className = 'button-abstract control share-button'; // Classi native di PubMed
    btn.innerHTML = `
        <span class="icon">📄</span> 
        <span class="text">To BibTeX</span>
    `;

    btn.onclick = () => {
        chrome.runtime.sendMessage({ action: "open_side_panel" });
    };

    actionButtons.appendChild(btn);
}

injectBibButton();
const observer = new MutationObserver(injectBibButton);
observer.observe(document.body, { childList: true, subtree: true });