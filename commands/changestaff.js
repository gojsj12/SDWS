const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (สไตล์ SHGOX ค่ายบักก๊อต)
const ICONS = {
    SYSTEM: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png',
    ALERT_THUMB: 'https://cdn-icons-png.flaticon.com/512/1792/1792931.png'
};

// 🛡️ ยศแอดมิน/สตาฟที่อนุญาตให้ใช้คำสั่งนี้
const ALLOWED_ROLE_IDS = [
    '1545137734757130321',
    '1559032191990890516'
];

// 🗄️ ตัวแปรชั่วคราวสำหรับเก็บข้อมูลพรีวิว (Cache)
const staffCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changestaff')
        .setDescription('ประกาศเปลี่ยนฝ่ายสตาฟและเลือกสตาฟคนใหม่ (สำหรับแอดมิน/สตาฟ)')
        .addUserOption(option =>
            option.setName('new_staff')
                .setDescription('เลือกสตาฟคนใหม่ที่จะเข้ามารับตำแหน่ง')
                .setRequired(true)),

    async execute(interaction) {
        // 🛑 ป้องกันการใช้งานใน DM เพื่อไม่ให้ระบบดึงยศแล้วแครช
        if (!interaction.guild || !interaction.member) {
            return interaction.reply({
                content: '❌ **คำสั่งนี้สามารถใช้งานได้เฉพาะภายในเซิร์ฟเวอร์ Discord เท่านั้น!**',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 1. ตรวจสอบสิทธิ์ว่าผู้ใช้มียศที่กำหนดหรือไม่
        const hasPermission = interaction.member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id));
        
        if (!hasPermission && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ **คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้!** คำสั่งนี้จำกัดเฉพาะผู้มียศสตาฟ/แอดมินที่กำหนดเท่านั้น',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const newStaff = interaction.options.getUser('new_staff');

        // 2. สร้าง Modal ฟอร์มให้ตั้งค่าข้อความประกาศและแจ้งเตือน
        const modal = new ModalBuilder()
            .setCustomId(`changestaff_modal_${interaction.user.id}_${newStaff.id}`)
            .setTitle('✨ ตั้งค่าประกาศเปลี่ยนฝ่ายสตาฟ');

        const titleInput = new TextInputBuilder()
            .setCustomId('staff_title')
            .setLabel('หัวข้อประกาศ (Embed Title)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('👑 แจ้งเปลี่ยนฝ่ายสตาฟ / ติดต่อเจ้าหน้าที่คนใหม่ 💬')
            .setRequired(true)
            .setMaxLength(100);

        const messageInput = new TextInputBuilder()
            .setCustomId('staff_message')
            .setLabel('ข้อความแจ้งเตือน / รายละเอียด (รองรับอีโมจิ)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('📢 ได้เปลี่ยนสตาฟติดต่อคนใหม่แล้วครับ กรุณารอสักครู่...\n📌 สามารถติดต่อสอบถามเพิ่มเติมได้ที่นี่')
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(messageInput)
        );

        await interaction.showModal(modal);
    },

    // 🔄 ฟังก์ชันจัดการ Interaction (Modal Submit และ Buttons)
    async handleInteraction(interaction) {
        // 1. จัดการข้อมูลจาก Modal เมื่อแอดมินกดส่งฟอร์ม
        if (interaction.isModalSubmit() && interaction.customId.startsWith('changestaff_modal_')) {
            const parts = interaction.customId.split('_');
            const adminId = parts[2];
            const newStaffId = parts[3];

            if (interaction.user.id !== adminId) {
                return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์จัดการฟอร์มนี้', flags: [MessageFlags.Ephemeral] });
            }

            const customTitle = interaction.fields.getTextInputValue('staff_title');
            const customMessage = interaction.fields.getTextInputValue('staff_message');

            // 🔑 บันทึกข้อมูลลง Cache สำหรับปุ่มยืนยัน
            const cacheKey = `staff_${interaction.user.id}_${Date.now()}`;
            staffCache.set(cacheKey, {
                customTitle,
                customMessage,
                authorId: interaction.user.id,
                newStaffId
            });

            setTimeout(() => staffCache.delete(cacheKey), 10 * 60 * 1000);

            const unixTimestamp = Math.floor(Date.now() / 1000);

            // 🔍 สร้าง Embed พรีวิวพรีเมียมให้แอดมินดูก่อนส่งลงห้อง
            const previewEmbed = new EmbedBuilder()
                .setColor('#38bdf8')
                .setAuthor({ name: '✨ STAFF UPDATE PREVIEW', iconURL: ICONS.SYSTEM })
                .setTitle(`📌 ${customTitle}`)
                .setDescription(`>>> ${customMessage}`)
                .addFields(
                    { name: '👤 สตาฟคนใหม่ที่รับตำแหน่ง', value: `<@${newStaffId}> (\`${newStaffId}\`)`, inline: false },
                    { name: '🛠️ ผู้สั่งการประกาศ', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏰ เวลาเตรียมประกาศ', value: `<t:${unixTimestamp}:R>`, inline: true }
                )
                .setThumbnail(ICONS.ALERT_THUMB)
                .setImage(ICONS.BANNER)
                .setFooter({ text: `${interaction.client.user.username} | ตรวจสอบความถูกต้องก่อนกดยืนยัน`, iconURL: ICONS.FOOTER })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`staff_send_${cacheKey}`)
                    .setLabel('🚀 ยืนยันและส่งประกาศลงห้อง')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('staff_cancel')
                    .setLabel('❌ ยกเลิก')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                embeds: [previewEmbed],
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
            return true;
        }

        // 2. จัดการปุ่มกด (Buttons)
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('staff_send_')) {
                const cacheKey = interaction.customId.replace('staff_send_', '');
                const data = staffCache.get(cacheKey);

                if (!data) {
                    return interaction.update({
                        content: '⏱️ ข้อมูลประกาศนี้หมดอายุแล้ว (เกิน 10 นาที) กรุณาใช้คำสั่งใหม่อีกครั้ง',
                        embeds: [],
                        components: []
                    });
                }

                const { customTitle, customMessage, authorId, newStaffId } = data;

                try {
                    const unixTimestamp = Math.floor(Date.now() / 1000);

                    // 📢 สร้าง Embed ประกาศพรีเมียมที่จะส่งลงห้องแชท พร้อมแท็กสตาฟคนใหม่
                    const announceEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ name: '📢 STAFF NOTIFICATION SYSTEM', iconURL: ICONS.SYSTEM })
                        .setTitle(`📌 ${customTitle}`)
                        .setDescription(`>>> ${customMessage}`)
                        .addFields(
                            { name: '👤 สตาฟผู้รับหน้าที่คนใหม่', value: `<@${newStaffId}>`, inline: true },
                            { name: '🛠️ ผู้ดูแลดำเนินการ', value: `<@${authorId}>`, inline: true },
                            { name: '⏰ เวลาอัปเดตสถานะ', value: `<t:${unixTimestamp}:F>`, inline: false }
                        )
                        .setThumbnail(ICONS.ALERT_THUMB)
                        .setImage(ICONS.BANNER)
                        .setFooter({ text: `${interaction.client.user.username} • ค่ายบักก๊อต | Staff Department`, iconURL: ICONS.FOOTER })
                        .setTimestamp();

                    // ส่งข้อความประกาศลงห้องปัจจุบัน พร้อมแท็กเตือนสตาฟคนใหม่
                    await interaction.channel.send({
                        content: `🔔 **ประกาศเปลี่ยนฝ่ายสตาฟ!** ขอต้อนรับสตาฟคนใหม่ <@${newStaffId}>`,
                        embeds: [announceEmbed]
                    });

                    staffCache.delete(cacheKey);

                    await interaction.update({
                        content: '✅ **ส่งประกาศเปลี่ยนฝ่ายสตาฟและแท็กสตาฟคนใหม่เรียบร้อยแล้ว!**',
                        embeds: [],
                        components: []
                    });
                } catch (error) {
                    console.error('Error sending staff notification:', error);
                    await interaction.update({
                        content: '❌ เกิดข้อผิดพลาดในการส่งข้อความ (กรุณาตรวจสอบสิทธิ์การส่งข้อความของบอทในห้องนี้)',
                        embeds: [],
                        components: []
                    });
                }
                return true;
            }

            if (interaction.customId === 'staff_cancel') {
                await interaction.update({
                    content: '❌ **ยกเลิกการส่งประกาศเปลี่ยนฝ่ายสตาฟเรียบร้อยแล้ว**',
                    embeds: [],
                    components: []
                });
                return true;
            }
        }

        return false;
    }
};
