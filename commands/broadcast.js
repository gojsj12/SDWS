const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (พรีเมียม คลีน ไร้อีโมจิข้อความ)
const ICONS = {
    BROADCAST: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

// ID เจ้าของบอทรวมสิทธิ์พิเศษ
const OWNER_ID = '1143741885098250281';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('ส่งข้อความแจ้งเตือนไปยังเซิร์ฟเวอร์และห้องที่กำหนด (สำหรับเจ้าของบอทเท่านั้น)')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('ID ของเซิร์ฟเวอร์ปลายทาง')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('channel_id')
                .setDescription('ID ของห้องแชทปลายทาง')
                .setRequired(true)
        ),

    async execute(interaction) {
        // 1. ตรวจสอบสิทธิ์เจ้าของบอท
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: 'คำสั่งนี้สงวนสิทธิ์ให้เฉพาะเจ้าของบอทเท่านั้น',
                ephemeral: true
            });
        }

        const serverId = interaction.options.getString('server_id');
        const channelId = interaction.options.getString('channel_id');

        // 2. สร้าง Modal (หน้าต่างกรอกข้อความ)
        const modal = new ModalBuilder()
            .setCustomId(`broadcast_modal_${serverId}_${channelId}`)
            .setTitle('SYSTEM BROADCAST MESSAGE');

        // ช่องกรอกหัวข้อประกาศ
        const titleInput = new TextInputBuilder()
            .setCustomId('broadcast_title')
            .setLabel('หัวข้อประกาศ (Title)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('พิมพ์หัวข้อข้อความที่นี่...')
            .setRequired(true);

        // ช่องกรอกเนื้อหาข้อความ
        const messageInput = new TextInputBuilder()
            .setCustomId('broadcast_message')
            .setLabel('เนื้อหาข้อความ (Message / Description)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('พิมพ์เนื้อหาตกแต่งข้อความของคุณที่นี่ สามารถเว้นบรรทัดได้...')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(messageInput)
        );

        // แสดง Modal ให้เจ้าของบอทกรอก
        await interaction.showModal(modal);
    },
};
