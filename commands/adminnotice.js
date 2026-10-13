const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChannelType } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนและรูปภาพพรีเมียม (สไตล์ SHGOX ค่ายบักก๊อต)
const ICONS = {
    SYSTEM: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png',
    ALERT_THUMB: 'https://cdn-icons-png.flaticon.com/512/1792/1792931.png'
};

// 👑 ID เจ้าของบอทตัวจริงเท่านั้น
const OWNER_ID = '1143741885098250281';

// 🗄️ ตัวแปรชั่วคราวสำหรับเก็บข้อมูลพรีวิว (Cache)
const noticeCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminnotice')
        .setDescription('ประกาศแจ้งเตือนกระจายไปยังทุกเซิร์ฟเวอร์ (สำหรับเจ้าของบอทสั่งใน DM)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('หัวข้อประกาศแจ้งเตือน (Embed Title)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('รายละเอียดข้อความแจ้งเตือนที่ต้องการกระจายไปทุกเซิร์ฟเวอร์')
                .setRequired(true)),

    async execute(interaction) {
        // 1. ดักจับสิทธิ์: ต้องเป็นเจ้าของบอทเท่านั้น
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ **คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้!** คำสั่งนี้อนุญาตเฉพาะนายท่าน/เจ้าของบอทเท่านั้น',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const customTitle = interaction.options.getString('title');
        const customMessage = interaction.options.getString('message');

        // 🔑 บันทึกข้อมูลพรีวิวลง Cache ชั่วคราว (10 นาที)
        const cacheKey = `notice_${interaction.user.id}_${Date.now()}`;
        noticeCache.set(cacheKey, {
            customTitle,
            customMessage,
            ownerId: interaction.user.id
        });

        setTimeout(() => noticeCache.delete(cacheKey), 10 * 60 * 1000);

        const totalServers = interaction.client.guilds.cache.size;

        // 🔍 Embed พรีวิวให้เจ้าของบอทตรวจสอบก่อนส่ง
        const previewEmbed = new EmbedBuilder()
            .setColor('#FF0055')
            .setAuthor({ name: '👑 ALL-SERVERS BROADCAST PREVIEW', iconURL: ICONS.SYSTEM })
            .setTitle(`✨ ${customTitle}`)
            .setDescription(`>>> ${customMessage}`)
            .addFields(
                { name: '🌐 เซิร์ฟเวอร์เป้าหมาย', value: `\`\`\`yaml\n${totalServers} เซิร์ฟเวอร์\n\`\`\``, inline: true },
                { name: '🛠️ ผู้สั่งการประกาศ', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setThumbnail(ICONS.ALERT_THUMB)
            .setImage(ICONS.BANNER)
            .setFooter({ text: `${interaction.client.user.username} | ตรวจสอบความถูกต้องก่อนกดยืนยัน`, iconURL: ICONS.FOOTER })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`notice_send_${cacheKey}`)
                .setLabel(`🚀 ยืนยันกระจายไปทุกเซิร์ฟเวอร์ (${totalServers})`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('notice_cancel')
                .setLabel('❌ ยกเลิก')
                .setStyle(ButtonStyle.Danger)
        );

        // ส่ง Embed Preview กลับไปหาเจ้าของใน DM
        await interaction.reply({
            embeds: [previewEmbed],
            components: [row]
        });
    },

    // 🔄 ฟังก์ชันจัดการปุ่มกด (Buttons Interaction)
    async handleInteraction(interaction) {
        if (!interaction.isButton()) return false;

        if (interaction.customId.startsWith('notice_send_')) {
            const cacheKey = interaction.customId.replace('notice_send_', '');
            const data = noticeCache.get(cacheKey);

            if (!data) {
                return interaction.update({
                    content: '⏱️ ข้อมูลประกาศนี้หมดอายุแล้ว (เกิน 10 นาที) กรุณาใช้คำสั่งใหม่อีกครั้ง',
                    embeds: [],
                    components: []
                });
            }

            const { customTitle, customMessage, ownerId } = data;

            await interaction.update({
                content: '⏳ **กำลังส่งประกาศไปยังทุกเซิร์ฟเวอร์ กรุณารอสักครู่...**',
                embeds: [],
                components: []
            });

            const unixTimestamp = Math.floor(Date.now() / 1000);

            // 📢 Embed ประกาศพรีเมียมที่จะส่งลงทุกเซิร์ฟเวอร์
            const announceEmbed = new EmbedBuilder()
                .setColor('#FF0055')
                .setAuthor({ name: '🚨 SHGOX OFFICIAL GLOBAL ANNOUNCEMENT', iconURL: ICONS.SYSTEM })
                .setTitle(`📌 ${customTitle}`)
                .setDescription(`>>> ${customMessage}`)
                .addFields(
                    { 
                        name: '👑 ผู้ดูแลระบบสูงสุด (Owner)', 
                        value: `<@${ownerId}> (\`${ownerId}\`)`, 
                        inline: true 
                    },
                    { 
                        name: '⏰ เวลาที่ประกาศ', 
                        value: `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`, 
                        inline: true 
                    },
                    { 
                        name: '⚡ สถานะการแจ้งเตือน', 
                        value: '```arm\n[OFFICIAL BROADCAST NOTICE - ALL SERVERS]\n```', 
                        inline: false 
                    }
                )
                .setThumbnail(ICONS.ALERT_THUMB)
                .setImage(ICONS.BANNER)
                .setFooter({ 
                    text: `${interaction.client.user.username} • ค่ายบักก๊อต | Global Announcement System`, 
                    iconURL: ICONS.FOOTER 
                })
                .setTimestamp();

            let successCount = 0;
            let failCount = 0;

            // 🌐 วนลูปส่งหาทุกเซิร์ฟเวอร์ที่บอทอยู่
            for (const guild of interaction.client.guilds.cache.values()) {
                try {
                    const targetChannel = guild.channels.cache.find(channel => 
                        channel.type === ChannelType.GuildText && 
                        channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
                    );

                    if (targetChannel) {
                        await targetChannel.send({
                            content: `📢 **ประกาศแจ้งเตือนด่วนจากผู้ดูแลระบบ!** @everyone`,
                            embeds: [announceEmbed]
                        });
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (e) {
                    failCount++;
                }
            }

            noticeCache.delete(cacheKey);

            // ส่งรายงานสรุปผลกลับให้ก๊อตใน DM
            await interaction.followUp({
                content: `✅ **กระจายประกาศเรียบร้อยแล้ว!**\n\n🟢 **ส่งสำเร็จ:** \`${successCount}\` เซิร์ฟเวอร์\n🔴 **ล้มเหลว:** \`${failCount}\` เซิร์ฟเวอร์`
            });

            return true;
        }

        if (interaction.customId === 'notice_cancel') {
            await interaction.update({
                content: '❌ **ยกเลิกการส่งประกาศเรียบร้อยแล้ว**',
                embeds: [],
                components: []
            });
            return true;
        }

        return false;
    }
};
