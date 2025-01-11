import fs from 'fs';
import Logger from '../../features/errorhandle/errorhandle.js'; // 假設 Logger 位於此位置

/** @type {Map<string, string[]>} */
export let playlists = new Map();

const playlistPath = './features/music/playlists.json';
const logger = new Logger();

/**
 * 保存播放列表到文件。
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
 * 加載播放列表。
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