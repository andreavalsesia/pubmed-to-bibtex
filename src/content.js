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
    pages = pages.replace('-', '--');

    const title = getMeta("citation_title");
    const journal = getMeta("citation_journal_title");

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

// Listen for the "copy button" input
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {

        const title = getMeta("citation_title");
        const pmid = getMeta("citation_pmid");

        // Return the snippet along with title and pmid to save the paper in the library
        sendResponse({ bibtex: getBibTeX(), title: title, pmid: pmid });
    }
});
