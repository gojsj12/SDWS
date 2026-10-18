
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'intro-config.json');

const ICONS = {
    SYSTEM: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png'
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, '{}', 'utf8');
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function saveConfig(config) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(config, null, 2),
        'utf8'
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-intro')
        .setDescription('ตั้งค่าระบบแนะนำตัวเอง')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('ห้องแนะนำตัวและส่งแผงปุ่ม')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName('history')
                .setDescription('ห้องประวัติหลังบ้าน')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('role_id')
                .setDescription('Role ID ที่จะเพิ่มหลังแนะนำตัวสำเร็จ')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: 'คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const history = interaction.options.getChannel('history');
        const roleId = interaction.options.getString('role_id')?.trim() || null;

        if (roleId && !/^\d{17,20}$/.test(roleId)) {
            return interaction.reply({
                content: 'Role ID ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
                ephemeral: true
            });
        }

        const botMember = interaction.guild.members.me;

        const canSend = target =>
            target.permissionsFor(botMember)?.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory
            ]);

        if (!canSend(channel) || !canSend(history)) {
            return interaction.reply({
                content: 'บอทไม่มีสิทธิ์เข้าถึงหรือส่งข้อความในห้องที่เลือก',
                ephemeral: true
            });
        }

        if (roleId) {
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null);

            if (!role) {
                return interaction.reply({
                    content: 'ไม่พบ Role ID นี้ในเซิร์ฟเวอร์',
                    ephemeral: true
                });
            }

            if (
                role.managed ||
                role.position >= botMember.roles.highest.position
            ) {
                return interaction.reply({
                    content: 'บอทไม่สามารถมอบยศนี้ได้ กรุณาตรวจสอบลำดับยศ',
                    ephemeral: true
                });
            }
        }

        const config = loadConfig();

        config[interaction.guild.id] = {
            channelId: channel.id,
            historyChannelId: history.id,
            roleId,
            configuredBy: interaction.user.id,
            updatedAt: new Date().toISOString()
        };

        saveConfig(config);

        const panel = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: 'SELF INTRODUCTION SYSTEM',
                iconURL: ICONS.SYSTEM
            })
            .setTitle('แนะนำตัวเอง')
            .setDescription([
                'ยินดีต้อนรับเข้าสู่ระบบแนะนำตัวเอง',
                '',
                'กดปุ่มด้านล่างเพื่อเริ่มกรอกข้อมูล',
                'ระบบจะส่งข้อมูลของคุณไปยังห้องแนะนำตัว',
                'และบันทึกประวัติไว้สำหรับทีมงาน'
            ].join('\n'))
            .addFields(
                {
                    name: 'ขั้นตอนที่ 1',
                    value: 'กดปุ่มแนะนำตัวเอง',
                    inline: true
                },
                {
                    name: 'ขั้นตอนที่ 2',
                    value: 'กรอกข้อมูลให้ครบ',
                    inline: true
                }
            )
            .setImage(ICONS.BANNER)
            .setFooter({
                text: `${interaction.client.user.username} | INTRO SYSTEM`,
                iconURL: ICONS.FOOTER
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('intro:start')
                .setLabel('แนะนำตัวเอง')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary)
        );

        await channel.send({
            embeds: [panel],
            components: [row]
        });

        const result = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('ตั้งค่าระบบสำเร็จ')
            .addFields(
                {
                    name: 'ห้องแนะนำตัว',
                    value: `<#${channel.id}>`,
                    inline: true
                },
                {
                    name: 'ห้องประวัติ',
                    value: `<#${history.id}>`,
                    inline: true
                },
                {
                    name: 'Role ID',
                    value: roleId ? `<@&${roleId}> (\`${roleId}\`)` : 'ไม่ได้ตั้งค่า',
                    inline: false
                }
            )
            .setFooter({ text: 'SELF INTRODUCTION SYSTEM' })
            .setTimestamp();

        await interaction.reply({
            embeds: [result],
            ephemeral: true
        });
    }
};
