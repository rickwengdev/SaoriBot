# SaoriBot

SaoriBot 是一款基於 Node.js 和 Discord.js 的高效 Discord 機器人，旨在增強伺服器的互動性與管理功能。

## 功能特點

- **指令模組化管理**：透過 `commands` 目錄組織和管理各種機器人指令，提供靈活的擴展性。
- **功能模組**：在 `features` 目錄中實現特定功能，提升機器人的可定制性。
- **自動指令部署**：使用 `.deploy-commands.js` 腳本自動部署指令，簡化開發流程。
- **容器化部署支持**：提供 `Dockerfile`，方便使用 Docker 進行部署和運行。

## 安裝與配置

1. **克隆專案**：

    ```bash
    git clone https://github.com/rickwengdev/SaoriBot.git
    cd SaoriBot
    ```

2. **安裝依賴**：

    確保已安裝 Node.js（版本需符合 package.json 中的要求），然後執行：

    ```bash
    npm install
    ```

3. **配置環境變數**：

    在專案根目錄下創建 `.env` 文件，並添加以下內容：

    ```bash
    token=你的 Discord 機器人令牌
    client_id=你的客戶端 ID
    ```

    請將上述值替換為實際的機器人令牌和相關 ID。

## 運行機器人

- 使用 Node.js 運行:

  ```bash
  node main.js
  ```

- 使用 Docker 運行：

  確保已安裝 Docker，然後在專案根目錄下執行：

  ```bash
  docker build -t saoribot .
  docker run -d saoribot
  ```

## 添加新指令

1. 創建指令文件：

    在 `commands` 目錄中，創建一個新的 JavaScript 文件，例如 `ping.js`。

2. 編寫指令邏輯：

    在新文件中，按照以下範例結構編寫指令邏輯：

    ```javascript
    module.exports = {
      name: 'ping',
      description: '回應 Pong!',
      execute(interaction) {
         interaction.reply('Pong!');
      },
    };
    ```

3. 部署指令：

    每次添加或修改指令後，運行以下命令以更新 Discord 應用中的指令：

    ```bash
    node .deploy-commands.js
    ```

## 添加新功能模組

1. 創建功能文件：

    在 `features` 目錄中，創建一個新的 JavaScript 文件，例如 `welcome.js`。

2. 編寫功能邏輯：

    在新文件中，按照以下範例結構編寫功能邏輯：

    ```javascript
    module.exports = (client) => {
      client.on('guildMemberAdd', (member) => {
         const channel = member.guild.systemChannel;
         if (channel) {
            channel.send(`歡迎 ${member} 加入我們的伺服器!`);
         }
      });
    };
    ```

3. 在主文件中加載功能：

    打開 `main.js`，添加以下代碼以加載新功能模組：

    ```javascript
    const welcomeFeature = require('./features/welcome');
    welcomeFeature(client);
    ```

## 貢獻指南

歡迎對 SaoriBot 的改進和貢獻！在提交拉取請求（PR）之前，請確保：

- **代碼風格**：遵循專案的代碼風格和結構。
- **測試**：在本地環境中測試您的更改，確保沒有引入新的問題。
- **文檔**：如有必要，更新相關文檔以反映您的更改。

## 支援與聯絡

如在使用過程中遇到問題，請在 GitHub 問題頁面提交問題。我們將盡快協助解決。

## 授權條款

此專案採用 [ 授權條款](LICENSE)。詳情請參閱 LICENSE 文件。