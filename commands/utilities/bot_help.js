import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📜 顯示機器人的指令列表'),
    async execute(interaction) {
        // 📌 指令分類與對應指令
        const categories = [
            {
                title: "🎵 音樂指令",
                description: "控制機器人播放音樂的指令。",
                commands: [
                    "`/music_add` - 加入歌曲",
                    "`/music_play` - 播放歌曲",
                    "`/music_skip` - 跳過歌曲",
                    "`/music_stop` - 停止播放",
                    "`/music_showplaylist` - 顯示播放列表"
                ],
                color: 0x1DB954 // Spotify 綠色
            },
            {
                title: "🛠️ 公用工具",
                description: "實用的工具指令。",
                commands: [
                    "`/bot_anonymousmessage` - 匿名發送訊息",
                    "`/bot_randomchar` - 隨機角色生成"
                ],
                color: 0x7289DA // Discord 藍色
            },
            {
                title: "🔧 伺服器管理",
                description: "管理伺服器的指令。",
                commands: [
                    "`/deleteMessages` - 刪除訊息",
                    "`/messageDelete` - 訊息刪除紀錄",
                    "`/logservermessage` - 伺服器訊息紀錄"
                ],
                color: 0xFF5733 // 紅色
            }
        ];

        let page = 0; // 預設顯示第一頁
        const totalPages = categories.length;

        // 📌 產生 Embed 訊息
        function getEmbed(pageIndex) {
            const category = categories[pageIndex];
            return new EmbedBuilder()
                .setTitle(category.title)
                .setDescription(category.description)
                .addFields({ name: "📌 指令列表", value: category.commands.join("\n") })
                .setFooter({ text: `📖 頁數 ${pageIndex + 1} / ${totalPages}` })
                .setColor(category.color);
        }

        // 📌 設置按鈕
        const prevButton = new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('⬅️')
            .setStyle(1); // Primary color

        const nextButton = new ButtonBuilder()
            .setCustomId('next')
            .setLabel('➡️')
            .setStyle(1);

        const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

        // 📌 發送第一頁 Embed
        const message = await interaction.reply({
            embeds: [getEmbed(page)],
            components: [row],
            ephemeral: true
        });

        // 📌 按鈕互動處理
        const filter = (btnInteraction) =>
            btnInteraction.user.id === interaction.user.id &&
            ['prev', 'next'].includes(btnInteraction.customId);

        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId === 'next') {
                page = (page + 1) % totalPages;
            } else if (btnInteraction.customId === 'prev') {
                page = (page - 1 + totalPages) % totalPages;
            }

            await btnInteraction.update({ embeds: [getEmbed(page)], components: [row] });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }); // 60 秒後按鈕失效
        });
    }
};