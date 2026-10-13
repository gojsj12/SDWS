const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (สไตล์ SHGOX ค่ายบักก๊อต)
const ICONS = {
    SYSTEM: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png'
};

// 🗄️ ตัวแปรชั่วคราวสำหรับเก็บข้อมูลพรีวิว (Cache)
const interviewCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('interview')
        .setDescription('เปิดฟอร์มประกาศนัดหมายสัมภาษณ์พร้อมตกแต่งอีโมจิและข้อความสวยๆ')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('เลือกห้องแชทที่ต้องการส่งประกาศสัมภาษณ์')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('candidate')
                .setDescription('เลือกผู้ใช้ที่จะเข้ารับการสัมภาษณ์')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('interviewer')
                .setDescription('เลือกผู้สัมภาษณ์ / กรรมการ')
                .setRequired(true)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const candidate = interaction.options.getUser('candidate');
        const interviewer = interaction.options.getUser('interviewer');

        // 📝 สร้าง Modal ฟอร์มให้แอดมินพิมพ์ข้อความ/อีโมจิแต่งรายละเอียดได้อย่างอิสระ
        const modal = new ModalBuilder()
            .setCustomId(`interview_modal_${interaction.user.id}_${channel.id}_${candidate.id}_${interviewer.id}`)
            .setTitle('✨ ตั้งค่ารายละเอียดประกาศสัมภาษณ์');

        const titleInput = new TextInputBuilder()
            .setCustomId('interview_title')
            .setLabel('หัวข้อประกาศ (Embed Title)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('👑 ประกาศผลและนัดหมายสัมภาษณ์ 🎙️')
            .setRequired(true)
            .setMaxLength(100);

        const descInput = new TextInputBuilder()
            .setCustomId('interview_desc')
            .setLabel('รายละเอียด / ข้อความอธิบาย (รองรับอีโมจิ)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('📌 กรุณาเตรียมตัวให้พร้อม\n💬 เข้าห้องเสียงล่วงหน้า 5 นาที')
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput)
        );

        await interaction.showModal(modal);
    },

    // 🔄 ฟังก์ชันจัดการ Interaction (Modal Submit และ Buttons) พร้อมระบบกันพัง (Safe Interaction Handler)
    async handleInteraction(interaction) {
        try {
            // 1. จัดการข้อมูลจาก Modal เมื่อแอดมินกดส่งฟอร์ม
            if (interaction.isModalSubmit() && interaction.customId.startsWith('interview_modal_')) {
                const parts = interaction.customId.split('_');
                const adminId = parts[2];
                const channelId = parts[3];
                const candidateId = parts[4];
                const interviewerId = parts[5];

                if (interaction.user.id !== adminId) {
                    return await interaction.reply({ content: '❌ คุณไม่มีสิทธิ์จัดการฟอร์มนี้', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }

                const customTitle = interaction.fields.getTextInputValue('interview_title');
                const customDesc = interaction.fields.getTextInputValue('interview_desc');

                const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
                if (!channel) {
                    return await interaction.reply({ content: '❌ ไม่พบห้องแชทเป้าหมายแล้ว', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }

                // 🔑 บันทึกข้อมูลลง Cache สำหรับปุ่มยืนยัน
                const cacheKey = `interview_${interaction.user.id}_${Date.now()}`;
                interviewCache.set(cacheKey, {
                    channelId,
                    candidateId,
                    interviewerId,
                    customTitle,
                    customDesc
                });

                setTimeout(() => interviewCache.delete(cacheKey), 10 * 60 * 1000);

                // 🔍 สร้าง Embed พรีวิวให้ดูก่อนส่งจริง
                const previewEmbed = new EmbedBuilder()
                    .setColor('#38bdf8')
                    .setAuthor({ name: '✨ INTERVIEW ANNOUNCEMENT PREVIEW', iconURL: ICONS.SYSTEM })
                    .setTitle(customTitle)
                    .setDescription(customDesc)
                    .addFields(
                        { name: '📌 ห้องปลายทาง', value: `<#${channelId}>`, inline: false },
                        { name: '👤 ผู้รอสัมภาษณ์', value: `<@${candidateId}> (\`${candidateId}\`)`, inline: true },
                        { name: '🎙️ ผู้สัมภาษณ์', value: `<@${interviewerId}> (\`${interviewerId}\`)`, inline: true }
                    )
                    .setImage(ICONS.BANNER)
                    .setFooter({ text: `${interaction.client.user.username} | กรุณาตรวจสอบความถูกต้องก่อนกดยืนยัน`, iconURL: ICONS.FOOTER })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`interview_send_${cacheKey}`)
                        .setLabel('🚀 ยืนยันและส่งประกาศจริง')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('interview_cancel')
                        .setLabel('❌ ยกเลิก')
                        .setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({
                    embeds: [previewEmbed],
                    components: [row],
                    flags: [MessageFlags.Ephemeral]
                }).catch(() => {});
                return true;
            }

            // 2. จัดการปุ่มกด (Buttons)
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('interview_send_')) {
                    const cacheKey = interaction.customId.replace('interview_send_', '');
                    const data = interviewCache.get(cacheKey);

                    if (!data) {
                        return await interaction.update({
                            content: '⏱️ ข้อมูลประกาศนี้หมดอายุแล้ว (เกิน 10 นาที) กรุณาใช้คำสั่งใหม่อีกครั้ง',
                            embeds: [],
                            components: []
                        }).catch(async () => {
                            if (interaction.deferred || interaction.replied) {
                                await interaction.followUp({ content: '⏱️ ข้อมูลประกาศนี้หมดอายุแล้ว (เกิน 10 นาที) กรุณาใช้คำสั่งใหม่อีกครั้ง', ephemeral: true }).catch(() => {});
                            }
                        });
                    }

                    const { channelId, candidateId, interviewerId, customTitle, customDesc } = data;
                    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

                    if (!channel || !channel.isTextBased()) {
                        return await interaction.update({
                            content: '❌ ไม่พบห้องแชทเป้าหมายในเซิร์ฟเวอร์นี้แล้ว',
                            embeds: [],
                            components: []
                        }).catch(() => {});
                    }

                    try {
                        // 📢 สร้าง Embed ประกาศจริงที่จะส่งลงห้อง
                        const announceEmbed = new EmbedBuilder()
                            .setColor('#5865F2')
                            .setAuthor({ name: '📢 OFFICIAL INTERVIEW ANNOUNCEMENT', iconURL: ICONS.SYSTEM })
                            .setTitle(customTitle)
                            .setDescription(customDesc)
                            .addFields(
                                { name: '👤 ผู้รอสัมภาษณ์', value: `<@${candidateId}>`, inline: true },
                                { name: '🎙️ ผู้สัมภาษณ์ / กรรมการ', value: `<@${interviewerId}>`, inline: true }
                            )
                            .setImage(ICONS.BANNER)
                            .setFooter({ text: `${interaction.client.user.username} | SHGOX Interview System`, iconURL: ICONS.FOOTER })
                            .setTimestamp();

                        // ส่งประกาศลงห้องที่เลือก พร้อมแท็กแจ้งเตือนผู้รอสัมภาษณ์
                        await channel.send({
                            content: `🔔 แจ้งเตือนการสัมภาษณ์ถึง <@${candidateId}>`,
                            embeds: [announceEmbed]
                        });

                        interviewCache.delete(cacheKey);

                        await interaction.update({
                            content: `✅ **ส่งประกาศนัดหมายสัมภาษณ์ไปยังห้อง <#${channelId}> เรียบร้อยแล้ว!**`,
                            embeds: [],
                            components: []
                        }).catch(() => {});
                    } catch (error) {
                        console.error('Error sending interview announcement:', error.message);
                        await interaction.update({
                            content: '❌ เกิดข้อผิดพลาดในการส่งข้อความ (กรุณาตรวจสอบสิทธิ์การส่งข้อความของบอทในห้องปลายทาง)',
                            embeds: [],
                            components: []
                        }).catch(async () => {
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการส่งข้อความ (กรุณาตรวจสอบสิทธิ์การส่งข้อความของบอทในห้องปลายทาง)', ephemeral: true }).catch(() => {});
                            }
                        });
                    }
                    return true;
                }

                if (interaction.customId === 'interview_cancel') {
                    await interaction.update({
                        content: '❌ **ยกเลิกการส่งประกาศสัมภาษณ์เรียบร้อยแล้ว**',
                        embeds: [],
                        components: []
                    }).catch(() => {});
                    return true;
                }
            }
        } catch (err) {
            console.error('⚠️ [Interview Command Interaction Error Handled]:', err.message);
        }

        return false;
    }
};
