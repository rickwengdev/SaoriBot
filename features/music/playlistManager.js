import fs from 'fs';
import Logger from '../../features/errorhandle/errorhandle.js'; // Assume Logger is located here

/** @type {Map<string, string[]>} */
export let playlists = new Map();

const playlistPath = './features/music/playlists.json';
const logger = new Logger();

/**
 * Save playlists to a file.
 */
export const savePlaylists = () => {
    try {
        const data = JSON.stringify(Object.fromEntries(playlists.entries()), null, 2);
        fs.writeFileSync(playlistPath, data, 'utf-8');
        logger.info(`Playlists successfully saved to ${playlistPath}`);
    } catch (error) {
        logger.error(`Failed to save playlists to ${playlistPath}`, error);
    }
};

/**
 * Load playlists from a file.
 */
export const loadPlaylists = () => {
    if (fs.existsSync(playlistPath)) {
        try {
            const data = fs.readFileSync(playlistPath, 'utf-8');
            playlists = new Map(Object.entries(JSON.parse(data)));
            logger.info(`Playlists successfully loaded from ${playlistPath}`);
        } catch (error) {
            logger.error(`Failed to load playlists from ${playlistPath}`, error);
        }
    } else {
        logger.warn(`Playlist file not found at ${playlistPath}, initializing with an empty playlist.`);
    }
};

// Initialize playlists
loadPlaylists();