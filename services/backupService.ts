/**
 * This service centralizes the logic for creating a local backup of the user's data.
 * It also records the timestamp of the backup to enable the reminder feature.
 */

export const performBackupAndRecordTimestamp = () => {
    try {
        const backupData = {
            playerHeroData: JSON.parse(localStorage.getItem('player-hero-data') || '{}'),
            rosterNotes: JSON.parse(localStorage.getItem('roster-notes') || '""'),
            settings: JSON.parse(localStorage.getItem('afk-settings') || '{}'),
            heroesData: JSON.parse(localStorage.getItem('heroes-data') || '[]'),
            priorityHeroesData: JSON.parse(localStorage.getItem('priority-heroes-data') || '[]'),
            translationCache: JSON.parse(localStorage.getItem('comment-translations') || '{}'),
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_hispania_afk_data_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Record the timestamp of this successful backup.
        localStorage.setItem('last-manual-backup-date', JSON.stringify(new Date().toISOString()));

    } catch (error) {
        console.error("Backup failed:", error);
        // Rethrow the error so the caller can handle it (e.g., show an alert).
        throw error;
    }
};
