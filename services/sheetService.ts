import { HeroDatabaseEntry, EngravingNode, PriorityHero, Hero } from '../types';
import { TRANSLATION_SHEET_URL, NODE_TRANSLATION_MAP } from '../constants';

/**
 * Parses a TSV string from Google Sheets gviz API into a 2D array.
 * @param tsvText The raw TSV string.
 * @returns A 2D array of strings representing the sheet data.
 */
const parseTSV = (tsvText: string): string[][] => {
  return tsvText
    .trim()
    .split(/\r?\n/) // Split by newline, handling both LF and CRLF
    .map(row => {
      if (row.trim() === '') return [];
      return row.split('\t').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });
};

interface TranslationData {
    translatedName: string;
    faction: string;
    isAwakened: boolean;
}

const parseInvestmentString = (raw: string): { si: number; furniture: number; engravings: number; nodes: EngravingNode[] } => {
    if (!raw || !raw.trim()) {
        return { si: 0, furniture: 0, engravings: 0, nodes: [] };
    }
    let si = 0, furniture = 0, engravings = 0;
    let nodes: EngravingNode[] = [];
    const separatorMatch = raw.match(/[eе]/);
    const separatorIndex = separatorMatch ? separatorMatch.index : -1;
    const siFurnStr = (separatorIndex === -1 ? raw : raw.substring(0, separatorIndex)).replace(/\D/g, '');
    if (siFurnStr.length >= 2) si = parseInt(siFurnStr.substring(0, 2), 10);
    if (siFurnStr.length >= 3) furniture = parseInt(siFurnStr.substring(2, 3), 10);
    if (separatorIndex !== -1) {
        let engraveNodeStr = raw.substring(separatorIndex + 1).trim();
        const engraveMatch = engraveNodeStr.match(/^\d+/);
        if (engraveMatch) {
            engravings = parseInt(engraveMatch[0], 10);
            const nodeStrRaw = engraveNodeStr.substring(engraveMatch[0].length).trim();
            const nodeParts = nodeStrRaw.split(/->|>/).map(p => p.trim()).filter(Boolean);
            for (const part of nodeParts) {
                const translation = NODE_TRANSLATION_MAP[part];
                nodes.push({ original: part, translated: translation || '', found: !!translation });
            }
        }
    }
    return { si: isNaN(si) ? 0 : si, furniture: isNaN(furniture) ? 0 : furniture, engravings: isNaN(engravings) ? 0 : engravings, nodes };
};


const areEngravingNodesDifferent = (nodesA: EngravingNode[], nodesB: EngravingNode[]): boolean => {
    if (!nodesA && !nodesB) return false;
    if (!nodesA || !nodesB || nodesA.length !== nodesB.length) return true;
    for (let i = 0; i < nodesA.length; i++) {
        if (nodesA[i].original !== nodesB[i].original) return true;
    }
    return false;
};

const areBuildsDifferent = (buildsA: HeroDatabaseEntry['builds'], buildsB: HeroDatabaseEntry['builds']): boolean => {
    if (!buildsA || !buildsB) return buildsA !== buildsB;
    if (buildsA.length !== buildsB.length) return true;

    // A simple sort to handle reordering in the source sheet
    const sortedA = [...buildsA].sort((a,b) => a.group.localeCompare(b.group));
    const sortedB = [...buildsB].sort((a,b) => a.group.localeCompare(b.group));


    for (let i = 0; i < sortedA.length; i++) {
        const a = sortedA[i];
        const b = sortedB[i];
        if (a.group !== b.group ||
            a.priorityComment !== b.priorityComment ||
            a.requiredSI !== b.requiredSI ||
            a.requiredFurniture !== b.requiredFurniture ||
            a.requiredEngravings !== b.requiredEngravings ||
            a.isAlternative !== b.isAlternative ||
            areEngravingNodesDifferent(a.engravingNodes, b.engravingNodes)) {
            return true;
        }
    }
    return false;
};

// FIX: Added missing functions by refactoring core logic into a reusable helper.

// Internal function to fetch and process data from sheets.
const _fetchAndProcessSheets = async (sheetUrl: string): Promise<Map<string, Omit<HeroDatabaseEntry, 'portraitStatus' | 'isUserModified' | 'sourceData' | 'status'>>> => {
    // 1. Fetch and process translation sheet into a map
    const translationResponse = await fetch(TRANSLATION_SHEET_URL);
    if (!translationResponse.ok) throw new Error(`Failed to fetch translation data: ${translationResponse.statusText}`);
    const translationTsv = await translationResponse.text();
    const translationRows = parseTSV(translationTsv).slice(1);
    const translationMap = new Map<string, TranslationData>();
    translationRows.forEach(row => {
        if (row.length > 4) { // Ensure at least up to column E (Russian Name)
            const spanishName = row[3]?.trim();
            const originalName = row[4]?.trim();
            const faction = row[12]?.trim();
            const isAwakened = row[13]?.trim().toUpperCase() === 'TRUE';
            // Only require the Russian name (key) to consider a hero valid.
            // This includes heroes with partial data (e.g., missing faction).
            if (originalName) {
                translationMap.set(originalName, { translatedName: spanishName || '', faction: faction || 'Desconocida', isAwakened });
            }
        }
    });

    // 2. Fetch and process main sheet
    const mainSheetResponse = await fetch(sheetUrl);
    if (!mainSheetResponse.ok) throw new Error(`Failed to fetch main sheet data: ${mainSheetResponse.statusText}`);
    const mainSheetTsv = await mainSheetResponse.text();
    const mainSheetRows = parseTSV(mainSheetTsv).slice(1);

    const sourceMap = new Map<string, Omit<HeroDatabaseEntry, 'portraitStatus' | 'isUserModified' | 'sourceData' | 'status'>>();
    
    // 3. Iterate main sheet to populate initial data
    mainSheetRows.forEach(row => {
        const originalName = row[3]?.trim();
        if (!originalName) return;

        const translationData = translationMap.get(originalName);
        const name = translationData?.translatedName || ''; // Fulfills: if no translation, leave empty
        const faction = translationData?.faction || 'Desconocida';
        const isAwakened = translationData?.isAwakened ?? false;

        const scoreStr = row[9]?.trim() || '0';
        const score = parseFloat(scoreStr.replace(',', '.')) || 0;
        const originalTierOrGroup = row[8]?.trim();

        let heroEntry = sourceMap.get(originalName);
        if (!heroEntry) {
            heroEntry = {
                key: originalName,
                russianName: originalName,
                spanishName: name,
                faction: faction,
                isAwakened: isAwakened,
                tier: 'N/A',
                score: 0,
                rankingComments: '',
                builds: [],
            };
            sourceMap.set(originalName, heroEntry);
        }
        
        if (originalTierOrGroup !== 'Ранг') {
            heroEntry.tier = originalTierOrGroup;
            heroEntry.score = score;
            heroEntry.rankingComments = row[7]?.trim() || '';
        }

        const investment = row[5]?.trim();
        if (originalTierOrGroup && originalTierOrGroup !== 'I' && investment) {
            const priorityComment = row[7]?.trim() || '';
            const createBuild = (inv: string, isAlt: boolean, baseSi?: number, sharedNodes?: EngravingNode[]): HeroDatabaseEntry['builds'][0] | null => {
                let finalInvStr = inv.trim();
                 if (isAlt && baseSi !== undefined && (finalInvStr.startsWith('e') || finalInvStr.startsWith('е'))) {
                    finalInvStr = `${String(baseSi).padStart(2, '0')}${baseSi === 30 ? '9' : '0'}${finalInvStr}`;
                }
                const parsedInv = parseInvestmentString(finalInvStr);
                return {
                    group: originalTierOrGroup,
                    priorityComment,
                    requiredSI: parsedInv.si,
                    requiredFurniture: parsedInv.furniture,
                    requiredEngravings: parsedInv.engravings,
                    engravingNodes: sharedNodes || parsedInv.nodes,
                    isAlternative: isAlt,
                };
            };

            if (investment.includes('/')) {
                const investmentParts = investment.split('/');
                const lastPart = investmentParts[investmentParts.length - 1];
                const sharedNodes = parseInvestmentString(lastPart).nodes;
                const [mainInv, ...altInvs] = investmentParts;
                const mainBuild = createBuild(mainInv, false, undefined, sharedNodes);
                if (mainBuild) heroEntry.builds.push(mainBuild);
                
                altInvs.forEach(altInv => {
                    const altBuild = createBuild(altInv, true, mainBuild?.requiredSI, sharedNodes);
                    if (altBuild) heroEntry.builds.push(altBuild);
                });
            } else {
                const build = createBuild(investment, false, undefined, undefined);
                if (build) heroEntry.builds.push(build);
            }
        }
    });

    // 4. Iterate translation rows to add any missing heroes.
    translationRows.forEach(row => {
        if (row.length > 4) { // Ensure at least up to column E
            const spanishName = row[3]?.trim() || '';
            const originalName = row[4]?.trim();
            const faction = row[12]?.trim() || 'Desconocida';
            const isAwakened = row[13]?.trim().toUpperCase() === 'TRUE';

            if (originalName) {
                // Case 1: Hero has a Russian name. Add them if they weren't in the main sheet.
                if (!sourceMap.has(originalName)) {
                    const heroEntry: Omit<HeroDatabaseEntry, 'portraitStatus' | 'isUserModified' | 'sourceData' | 'status'> = {
                        key: originalName,
                        russianName: originalName,
                        spanishName: spanishName,
                        faction: faction,
                        isAwakened: isAwakened,
                        tier: 'N/A',
                        score: 0,
                        rankingComments: '',
                        builds: [],
                    };
                    sourceMap.set(originalName, heroEntry);
                }
            } else if (spanishName) {
                // Case 2: Hero has NO Russian name, but has a Spanish name.
                const alreadyExists = Array.from(sourceMap.values()).some(
                    hero => hero.spanishName.toLowerCase() === spanishName.toLowerCase()
                );

                if (!alreadyExists) {
                    // Create a synthetic key to ensure uniqueness and add the hero.
                    const key = `no-russian-name-${spanishName.replace(/\s+/g, '-')}`;
                    const heroEntry: Omit<HeroDatabaseEntry, 'portraitStatus' | 'isUserModified' | 'sourceData' | 'status'> = {
                        key: key,
                        russianName: '', // No Russian name available
                        spanishName: spanishName,
                        faction: faction,
                        isAwakened: isAwakened,
                        tier: 'N/A',
                        score: 0,
                        rankingComments: '',
                        builds: [],
                    };
                    sourceMap.set(key, heroEntry);
                }
            }
        }
    });

    return sourceMap;
};

export const fetchAndCombineAllData = async (sheetUrl: string, force?: boolean): Promise<Map<string, Omit<HeroDatabaseEntry, 'portraitStatus' | 'isUserModified' | 'sourceData' | 'status'>>> => {
    return _fetchAndProcessSheets(sheetUrl);
};

export const fetchAndParsePriorityData = async (sheetUrl: string): Promise<PriorityHero[]> => {
    const sourceMap = await _fetchAndProcessSheets(sheetUrl);
    const priorityHeroes: PriorityHero[] = [];
    sourceMap.forEach(hero => {
        hero.builds.forEach(build => {
            priorityHeroes.push({
                originalName: hero.key,
                name: hero.spanishName,
                faction: hero.faction,
                isNameTranslated: !!hero.spanishName,
                group: build.group,
                priorityComment: build.priorityComment,
                commentIsTranslated: !!build.priorityCommentIsTranslated,
                score: hero.score,
                requiredSI: build.requiredSI,
                requiredFurniture: build.requiredFurniture,
                requiredEngravings: build.requiredEngravings,
                engravingNodes: build.engravingNodes,
                isAlternative: build.isAlternative,
                isAwakened: hero.isAwakened,
            });
        });
    });
    return priorityHeroes;
};

export const fetchAndParseSheet = async (sheetUrl: string): Promise<Hero[]> => {
    const sourceMap = await _fetchAndProcessSheets(sheetUrl);
    const heroes: Hero[] = [];
    sourceMap.forEach(hero => {
        heroes.push({
            faction: hero.faction,
            name: hero.spanishName,
            comments: hero.rankingComments,
            tier: hero.tier,
            score: hero.score,
            originalName: hero.key,
            isNameTranslated: !!hero.spanishName,
            isFactionTranslated: true, // Assuming this is always true for processed data
            commentIsTranslated: !!hero.rankingCommentIsTranslated,
            isAwakened: hero.isAwakened,
        });
    });
    return heroes;
};


/**
 * Fetches data from source sheets, combines it, compares with the local database,
 * and returns a new, merged database state. This version is designed to be robust
 * and preserve all user-entered data.
 * @param sheetUrl The URL of the main Google Sheet.
 * @param currentDb The current local hero database.
 * @returns A promise that resolves to the fully updated hero database.
 */
export const syncDatabaseWithSource = async (sheetUrl: string, currentDb: HeroDatabaseEntry[]): Promise<HeroDatabaseEntry[]> => {
    const sourceMap = await _fetchAndProcessSheets(sheetUrl);

    const manualHeroes = currentDb.filter(h => h.key.startsWith('nuevo-heroe-'));
    const officialHeroesMap = new Map(currentDb.filter(h => !h.key.startsWith('nuevo-heroe-')).map(h => [h.key, h]));

    const finalDb: HeroDatabaseEntry[] = [];
    const processedManualKeys = new Set<string>();

    // 1. Process all heroes from the source sheet.
    for (const [sourceKey, sourceHeroData] of sourceMap.entries()) {
        let baseHero: HeroDatabaseEntry | undefined = officialHeroesMap.get(sourceKey);
        let wasPromoted = false;

        // If no official hero found, try to promote a manual one.
        if (!baseHero) {
            const manualMatch = manualHeroes.find(h =>
                !processedManualKeys.has(h.key) &&
                h.spanishName?.trim().toLowerCase() === sourceHeroData.spanishName?.trim().toLowerCase() &&
                h.spanishName?.trim() !== '' &&
                h.spanishName?.trim() !== 'Nuevo Héroe'
            );

            if (manualMatch) {
                baseHero = manualMatch; // Use manual hero as the base
                processedManualKeys.add(manualMatch.key);
                wasPromoted = true;
            }
        }

        if (baseHero) {
            // An existing hero (official or promoted). Merge and check for diffs.
            const mergedHero: HeroDatabaseEntry = {
                ...baseHero, // Preserve user data like isHidden, isUserModified, portraitStatus
                key: sourceKey, // Ensure the key is the official one
                status: 'active',
            };
            
            const diffs: Partial<Omit<HeroDatabaseEntry, 'key'>> = {};
            let hasDiff = false;

            // Compare each property from the source with the base hero.
            (Object.keys(sourceHeroData) as Array<keyof typeof sourceHeroData>).forEach(prop => {
                if (prop === 'key') return;
                
                const baseValue = baseHero![prop as keyof HeroDatabaseEntry];
                const sourceValue = sourceHeroData[prop];

                const isDifferent = prop === 'builds'
                    ? areBuildsDifferent(baseValue as any, sourceValue as any)
                    : JSON.stringify(baseValue) !== JSON.stringify(sourceValue);

                if (isDifferent) {
                    (diffs as any)[prop] = sourceValue;
                    hasDiff = true;
                }
            });

            // If the hero was just promoted, we don't treat this as a "mismatch", we just merge the data.
            if (wasPromoted) {
                Object.assign(mergedHero, sourceHeroData);
                mergedHero.sourceData = undefined; // No diffs shown for a promotion
            } else {
                mergedHero.sourceData = hasDiff ? diffs : undefined;
            }

            finalDb.push(mergedHero);
        } else {
            // This is a genuinely new hero, not seen before.
            finalDb.push({ ...sourceHeroData, portraitStatus: 'pending', status: 'active' });
        }
    }

    // 2. Add back any manual heroes that were not promoted.
    for (const manualHero of manualHeroes) {
        if (!processedManualKeys.has(manualHero.key)) {
            finalDb.push(manualHero);
        }
    }

    // 3. Mark any official heroes that are no longer in the source as removed.
    for (const [officialKey, officialHero] of officialHeroesMap.entries()) {
        if (!sourceMap.has(officialKey)) {
            finalDb.push({ ...officialHero, status: 'removed_from_source', sourceData: undefined });
        }
    }

    return finalDb;
};