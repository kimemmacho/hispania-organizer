/**
 * Converts a standard Google Sheets URL (e.g., from the browser's address bar)
 * into a direct TSV export URL.
 * 
 * @param url The original Google Sheets URL.
 * @returns The converted TSV export URL, or the original URL if it doesn't match
 * a standard Google Sheets format, to allow for manually entered export URLs.
 */
export const convertToTSVExportURL = (url: string): string => {
    // Regex to capture the sheet ID from various Google Sheets URL formats.
    const regex = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);

    // If a valid sheet ID is found and the URL isn't already a known export format.
    if (match && match[1]) {
        const sheetId = match[1];
        
        // Don't convert if it's already in a direct download/API format.
        if (url.includes('/export?format=tsv') || url.includes('/gviz/tq')) {
            return url;
        }

        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv`;
    }

    // Return the original URL if it's not a recognizable Google Sheets URL.
    return url;
};

/**
 * Generates a SHA-256 hash for a given string.
 * @param str The string to hash.
 * @returns A promise that resolves to the hex string of the hash.
 */
export const generateHash = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};