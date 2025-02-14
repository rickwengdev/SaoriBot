// Import Discord.js REST and Routes modules
import { REST, Routes } from 'discord.js';

// Import Node.js modules
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const commands = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the commands directory
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Iterate through all command folders
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    // Iterate through each command file
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);
        
        // Ensure command files have 'data' and 'execute' properties
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] Command in ${filePath} is missing a required "data" or "execute" attribute.`);
        }
    }
}

// Create REST instance and set token
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Deploy application (/) commands
(async () => {
    try {
        console.log(`Registering application commands using token: ${process.env.TOKEN}`);

        console.log(`🔄 Starting to refresh ${commands.length} application (/) commands.`);

        // Use put method to completely refresh all commands on the server
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // Ensure errors are caught and logged
        console.error(error);
    }
})();