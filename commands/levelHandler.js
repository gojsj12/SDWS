const { SlashCommandBuilder, PermissionFlagsBits, ChannelSelectMenuBuilder, ChannelType, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../ai-config.json');

function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveConfig(data) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('⚠️ [Config Save Error]:', e.message);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelsetup')
        .setDescription('ตั้งค่าห้องสำหรับส่งข้อความแจ้งเตือนเลเวลอัป')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        if (!interaction.guild) {
            return await interaction.editReply({ content: '🛑 คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น!' });
        }

        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('level_channel_select')
            .setPlaceholder('เลือกห้องแชตสำหรับส่งประกาศเลเวลอัป...')
            .setMinValues(1)
            .setMaxValues(1)
            .setChannelTypes(ChannelType.GuildText);

        const row = new ActionRowBuilder().addComponents(channelSelect);

        await interaction.editReply({
            content: '📊 กรุณาเลือกห้องแชตที่ต้องการให้บอทส่งข้อความแจ้งเตือน **Level Up** สุดเท่:',
            components: [row]
        });
    },

    async handleInteraction(interaction) {
        if (!interaction.isChannelSelectMenu() || interaction.customId !== 'level_channel_select') return false;

        const db = loadConfig();
        const guildId = interaction.guild.id;

        if (!db[guildId]) db[guildId] = {};
        const selectedChannelId = interaction.channels.first().id;

        db[guildId].levelChannel = selectedChannelId;
        saveConfig(db);

        await interaction.update({
            content: `✅ ตั้งค่าห้องแจ้งเตือนเลเวลอัปเรียบร้อย! บอทจะส่งประกาศไปที่ห้อง <#${selectedChannelId}>`,
            components: []
        });

        return true;
    }
};
