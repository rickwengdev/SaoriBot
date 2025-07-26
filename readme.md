# SaoriBot

SaoriBot is a high-performance Discord bot based on Node.js and Discord.js, designed to enhance server interaction and management functionality.

## Features

- **Modular Command Management**: Organize and manage various bot commands through the `commands` directory, providing flexibility for expansion.
- **Feature Modules**: Implement specific functionalities in the `features` directory to enhance bot customization.
- **Automatic Command Deployment**: Use the `.deploy-commands.js` script to deploy commands automatically, simplifying the development process.
- **Containerized Deployment Support**: Provides a `Dockerfile` for easy deployment and execution using Docker.

## Installation & Configuration

### Clone the Repository

```bash
git clone https://github.com/rickwengdev/SaoriBot.git
cd SaoriBot
```

### Install Dependencies

Ensure that Node.js (matching the required version in `package.json`) is installed, then run:

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the project root directory and add the following content:

```bash
TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id
apiEndpoint=https://backend_container:3000
GEMINI_API_KEY=
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_CX=
```

Replace the values with your actual bot token and relevant IDs.

## Running the Bot

### Using Node.js

```bash
node main.js
```

### Using Docker

Ensure that Docker is installed, then execute the following in the project root directory:

```bash
docker build -t saoribot .
docker run -d saoribot
```

## Adding New Commands

### Create a Command File

Inside the `commands` directory, create a new JavaScript file, e.g., `ping.js`.

### Write the Command Logic

In the new file, write the command logic using ES6 syntax:

```javascript
export default {
  name: 'ping',
  description: 'Responds with Pong!',
  execute(interaction) {
    interaction.reply('Pong!');
  },
};
```

### Deploy the Command

Every time you add or modify a command, run the following command to update the commands in the Discord application:

```bash
node .deploy-commands.js
```

## Adding New Features

### Create a Feature File

Inside the `features` directory, create a new JavaScript file, e.g., `welcome.js`.

### Write the Feature Logic

In the new file, implement the feature using ES6 syntax:

```javascript
export default (client) => {
  client.on('guildMemberAdd', (member) => {
    const channel = member.guild.systemChannel;
    if (channel) {
      channel.send(`Welcome ${member} to our server!`);
    }
  });
};
```

### Load the Feature in the Main File

Open `main.js` and add the following code to load the new feature module:

```javascript
import welcomeFeature from './features/welcome.js';
welcomeFeature(client);
```

## Contribution Guidelines

We welcome contributions to SaoriBot! Before submitting a pull request (PR), please ensure:

- **Code Style**: Follow the project's coding style and structure.
- **Testing**: Test your changes locally to ensure no new issues are introduced.
- **Documentation**: Update relevant documentation if necessary to reflect your changes.

## Support & Contact

If you encounter any issues while using SaoriBot, please submit an issue on the GitHub issues page. We will assist as soon as possible.

## License

This project is licensed under the [LICENSE](LICENSE). Please refer to the LICENSE file for details.
