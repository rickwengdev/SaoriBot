import fs from 'fs';

/** @type {Map<string, string[]>} */
export let playlists = new Map();

const playlistPath = './features/music/playlists.json';

/**
 * 保存播放列表到文件。
 */
export const savePlaylists = () => {
    fs.writeFileSync(playlistPath, JSON.stringify(Object.fromEntries(playlists.entries())));
};

/**
 * 加載播放列表。
 */
export const loadPlaylists = () => {
    if (fs.existsSync(playlistPath)) {
        try {
            const data = fs.readFileSync(playlistPath, 'utf-8');
            playlists = new Map(Object.entries(JSON.parse(data)));
        } catch (error) {
            console.error('Failed to load playlists:', error.message);
        }
    }
};

// Initialize playlists
loadPlaylists();