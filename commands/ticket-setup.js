const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    MessageFlags 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../ticket-config.json');

function saveConfig(guildId, data) {
    let db = {};
    if (fs.existsSync(configPath)) {
        try { db = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { db = {}; }
    }
    db[guildId] = data;
    fs.writeFileSync(configPath, JSON.stringify(db, null, 2), 'utf8');
}

const ICONS = {
    SHGOX: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

// ฟังก์ชันแปลง Array ของ ID เป็นข้อความ Mention แท็กรายคนอย่างสวยงาม
function formatStaffList(ids) {
    if (!ids || ids.length === 0) return '⚠️ `ยังไม่มีผู้ให้บริการในฝ่ายนี้`';
    return ids.map(id => `<@${id}>`).join(', ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('ตั้งค่าแผงตั๋วพรีเมียม เลือกฝ่าย รายชื่อผู้รับผิดชอบ และห้อง Log')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('เลือกห้องแชทที่จะส่งแผงเปิดตั๋ว')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('log_channel')
                .setDescription('เลือกห้องสำหรับเก็บ Log บันทึกประวัติการเปิด-ปิดตั๋ว')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        // 1. ฝ่ายแอดมินหลัก
        .addUserOption(option => option.setName('admin_1').setDescription('แอดมินหลักประจำระบบ').setRequired(true))
        
        // 2. ฝ่ายติดต่อ (สูงสุด 5 คน)
        .addUserOption(option => option.setName('contact_1').setDescription('ฝ่ายติดต่อ คนที่ 1').setRequired(false))
        .addUserOption(option => option.setName('contact_2').setDescription('ฝ่ายติดต่อ คนที่ 2').setRequired(false))
        .addUserOption(option => option.setName('contact_3').setDescription('ฝ่ายติดต่อ คนที่ 3').setRequired(false))
        .addUserOption(option => option.setName('contact_4').setDescription('ฝ่ายติดต่อ คนที่ 4').setRequired(false))
        .addUserOption(option => option.setName('contact_5').setDescription('ฝ่ายติดต่อ คนที่ 5').setRequired(false))

        // 3. ฝ่ายแจ้งระบบ (สูงสุด 5 คน)
        .addUserOption(option => option.setName('system_1').setDescription('ฝ่ายแจ้งระบบ คนที่ 1').setRequired(false))
        .addUserOption(option => option.setName('system_2').setDescription('ฝ่ายแจ้งระบบ คนที่ 2').setRequired(false))
        .addUserOption(option => option.setName('system_3').setDescription('ฝ่ายแจ้งระบบ คนที่ 3').setRequired(false))
        .addUserOption(option => option.setName('system_4').setDescription('ฝ่ายแจ้งระบบ คนที่ 4').setRequired(false))
        .addUserOption(option => option.setName('system_5').setDescription('ฝ่ายแจ้งระบบ คนที่ 5').setRequired(false))

        // 4. ฝ่ายดิสคอส (สูงสุด 3 คน)
        .addUserOption(option => option.setName('discord_1').setDescription('ฝ่ายดิสคอส คนที่ 1').setRequired(false))
        .addUserOption(option => option.setName('discord_2').setDescription('ฝ่ายดิสคอส คนที่ 2').setRequired(false))
        .addUserOption(option => option.setName('discord_3').setDescription('ฝ่ายดิสคอส คนที่ 3').setRequired(false))

        // 5. ฝ่ายดูแล (สูงสุด 3 คน)
        .addUserOption(option => option.setName('care_1').setDescription('ฝ่ายดูแล คนที่ 1').setRequired(false))
        .addUserOption(option => option.setName('care_2').setDescription('ฝ่ายดูแล คนที่ 2').setRequired(false))
        .addUserOption(option => option.setName('care_3').setDescription('ฝ่ายดูแล คนที่ 3').setRequired(false))

        .addStringOption(option => option.setName('title').setDescription('กำหนดหัวข้อแผงตั๋ว').setRequired(false))
        .addStringOption(option => option.setName('description').setDescription('กำหนดรายละเอียดแผงตั๋ว').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const targetChannel = interaction.options.getChannel('channel');
        const logChannel = interaction.options.getChannel('log_channel');
        const title = interaction.options.getString('title') || 'SHGOX SUPPORT CENTER';
        const description = interaction.options.getString('description') || 'ยินดีต้อนรับสู่ศูนย์บริการช่วยเหลือส่วนบุคคล กรุณากดปุ่มด้านล่างเพื่อเลือกฝ่ายที่ต้องการติดต่อ ทีมงานจะเข้ามาดูแลในห้องส่วนตัวทันที';
        const guildId = interaction.guild.id;

        // รวบรวมข้อมูลรายชื่อผู้รับผิดชอบแต่ละฝ่าย
        const departments = {
            admin: [interaction.options.getUser('admin_1').id],
            contact: [1, 2, 3, 4, 5].map(i => interaction.options.getUser(`contact_${i}`)).filter(Boolean).map(u => u.id),
            system: [1, 2, 3, 4, 5].map(i => interaction.options.getUser(`system_${i}`)).filter(Boolean).map(u => u.id),
            discord: [1, 2, 3].map(i => interaction.options.getUser(`discord_${i}`)).filter(Boolean).map(u => u.id),
            care: [1, 2, 3].map(i => interaction.options.getUser(`care_${i}`)).filter(Boolean).map(u => u.id)
        };

        // บันทึกลง Config JSON
        saveConfig(guildId, {
            panelChannelId: targetChannel.id,
            logChannelId: logChannel.id,
            departments: departments,
            title: title,
            description: description
        });

        // ตรวจสอบสถานะฝ่ายที่ไม่มีคนดูแลเพื่อแจ้งเตือนแอดมินเบื้องต้น
        const emptyDepts = [];
        if (departments.contact.length === 0) emptyDepts.push('ฝ่ายติดต่อสอบถาม');
        if (departments.system.length === 0) emptyDepts.push('ฝ่ายแจ้งระบบ / ปัญหา');
        if (departments.discord.length === 0) emptyDepts.push('ฝ่ายดูแลระบบ Discord');
        if (departments.care.length === 0) emptyDepts.push('ฝ่ายดูแลสมาชิกทั่วไป');

        // ==========================================
        // 🎨 ตกแต่ง Embed แผงตั๋วหน้าหลักให้พรีเมียม
        // ==========================================
        const embed = new EmbedBuilder()
            .setColor('#5865F2') // โทนสี Blurple พรีเมียม
            .setAuthor({ name: '✨ SHGOX OFFICIAL SUPPORT CENTER', iconURL: ICONS.SHGOX })
            .setTitle(`📌 ${title}`)
            .setDescription(
                `>>> ${description}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `### 🏢 **รายชื่อผู้รับผิดชอบประจำฝ่าย (Staff Members)**\n\n` +
                `👑 **ฝ่ายแอดมินหลัก (Main Administrator)**\n` +
                `└ ${formatStaffList(departments.admin)}\n\n` +
                `💬 **ฝ่ายติดต่อสอบถาม (General Support)**\n` +
                `└ ${formatStaffList(departments.contact)}\n\n` +
                `🛠️ **ฝ่ายแจ้งระบบ / ปัญหา (System Bug & Issue)**\n` +
                `└ ${formatStaffList(departments.system)}\n\n` +
                `🤖 **ฝ่ายดูแลระบบ Discord (Discord Support)**\n` +
                `└ ${formatStaffList(departments.discord)}\n\n` +
                `❤️ **ฝ่ายดูแลสมาชิกทั่วไป (Community Care)**\n` +
                `└ ${formatStaffList(departments.care)}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .addFields(
                { name: '🔒 รูปแบบบริการ', value: '```ห้องแชทส่วนตัว (1:1 Private Channel)```', inline: true },
                { name: '🛡️ บันทึกระบบ', value: '```รักษาความปลอดภัย Log 100%```', inline: true }
            )
            .setImage(ICONS.BANNER)
            .setFooter({ 
                text: `${interaction.client.user.username} • SHGOX ค่าย บักก๊อต Official`, 
                iconURL: ICONS.FOOTER 
            })
            .setTimestamp();

        // 🔘 ปุ่มกดหน้าแผงตั๋ว
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_select_dept')
                .setLabel('📩 คลิกที่นี่เพื่อเลือกฝ่าย / เปิดตั๋วติดต่อ')
                .setStyle(ButtonStyle.Primary)
        );

        // 📋 Embed ตอบกลับแอดมินเมื่อติดตั้งสำเร็จ
        const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'SYSTEM SETUP COMPLETED', iconURL: ICONS.SHGOX })
            .setTitle('✅ ติดตั้งระบบตั๋วเรียบร้อยแล้ว!')
            .setDescription(
                `ส่งแผงเปิดตั๋วไปยัง <#${targetChannel.id}> สำเร็จ!\n` +
                (emptyDepts.length > 0 ? `\n⚠️ **คำเตือน:** มีบางฝ่ายที่ยังไม่ได้ระบุเจ้าหน้าที่ ได้แก่: \`${emptyDepts.join(', ')}\` (ระบบได้ติดตั้งระบบแจ้งเตือน "ไม่มีผู้ให้บริการ" ไว้ให้แล้วหากมีผู้ใช้กด)` : '')
            )
            .addFields(
                { name: '📍 ห้องแผงตั๋ว', value: `<#${targetChannel.id}>`, inline: true },
                { name: '📜 ห้องเก็บ Log', value: `<#${logChannel.id}>`, inline: true }
            )
            .setTimestamp();

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error in ticket-setup:', error);
            await interaction.editReply({
                content: '❌ **เกิดข้อผิดพลาด:** ไม่สามารถส่งข้อความไปยังห้องที่เลือกได้ กรุณาตรวจสอบสิทธิ์ของบอท (Send Messages / Embed Links)'
            });
        }
    },
};
