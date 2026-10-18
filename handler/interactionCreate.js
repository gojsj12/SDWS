const {
    Events,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(
    process.cwd(),
    'data',
    'intro-config.json'
);

const ICONS = {
    SYSTEM: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png'
};

function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return {};
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (error) {
        console.error('[INTRO] Config error:', error);
        return {};
    }
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        try {
            // =====================================
            // 1. ปุ่มเริ่มแนะนำตัวเอง
            // =====================================
            if (
                interaction.isButton() &&
                interaction.customId === 'intro:start'
            ) {
                if (!interaction.inGuild()) {
                    return interaction.reply({
                        content: 'กรุณาใช้งานในเซิร์ฟเวอร์',
                        ephemeral: true
                    });
                }

                const config = loadConfig()[interaction.guildId];

                if (!config) {
                    return interaction.reply({
                        content: 'ระบบแนะนำตัวยังไม่ได้ตั้งค่า',
                        ephemeral: true
                    });
                }

                if (interaction.channelId !== config.channelId) {
                    return interaction.reply({
                        content: 'กรุณากดปุ่มในห้องแนะนำตัวที่กำหนด',
                        ephemeral: true
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId('intro:submit')
                    .setTitle('SELF INTRODUCTION');

                const nameInput = new TextInputBuilder()
                    .setCustomId('displayName')
                    .setLabel('ชื่อที่ต้องการให้เรียก')
                    .setPlaceholder('กรอกชื่อของคุณ')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(50)
                    .setRequired(true);

                const ageInput = new TextInputBuilder()
                    .setCustomId('age')
                    .setLabel('อายุ')
                    .setPlaceholder('กรอกอายุเป็นตัวเลข')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(3)
                    .setRequired(true);

                const aboutInput = new TextInputBuilder()
                    .setCustomId('about')
                    .setLabel('แนะนำตัวเอง')
                    .setPlaceholder('เขียนข้อมูลแนะนำตัวเอง')
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(1000)
                    .setRequired(true);

                const hobbyInput = new TextInputBuilder()
                    .setCustomId('hobby')
                    .setLabel('งานอดิเรก')
                    .setPlaceholder('สิ่งที่คุณสนใจ (ไม่บังคับ)')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(200)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(nameInput),
                    new ActionRowBuilder().addComponents(ageInput),
                    new ActionRowBuilder().addComponents(aboutInput),
                    new ActionRowBuilder().addComponents(hobbyInput)
                );

                return interaction.showModal(modal);
            }

            // =====================================
            // 2. รับข้อมูลจาก Modal
            // =====================================
            if (
                interaction.isModalSubmit() &&
                interaction.customId === 'intro:submit'
            ) {
                if (!interaction.inGuild()) {
                    return interaction.reply({
                        content: 'กรุณาใช้งานในเซิร์ฟเวอร์',
                        ephemeral: true
                    });
                }

                const config = loadConfig()[interaction.guildId];

                if (!config) {
                    return interaction.reply({
                        content: 'ไม่พบการตั้งค่าระบบ',
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                const displayName = interaction.fields
                    .getTextInputValue('displayName').trim();

                const ageText = interaction.fields
                    .getTextInputValue('age').trim();

                const about = interaction.fields
                    .getTextInputValue('about').trim();

                const hobby = interaction.fields
                    .getTextInputValue('hobby').trim() || 'ไม่ได้ระบุ';

                if (
                    !/^\d{1,3}$/.test(ageText) ||
                    Number(ageText) < 1 ||
                    Number(ageText) > 120
                ) {
                    return interaction.editReply(
                        'กรุณากรอกอายุเป็นตัวเลขที่ถูกต้อง'
                    );
                }

                if (!displayName || !about) {
                    return interaction.editReply(
                        'กรุณากรอกข้อมูลให้ครบถ้วน'
                    );
                }

                const guild = interaction.guild;

                const introChannel = await guild.channels
                    .fetch(config.channelId).catch(() => null);

                const historyChannel = await guild.channels
                    .fetch(config.historyChannelId).catch(() => null);

                if (
                    !introChannel?.isTextBased() ||
                    !historyChannel?.isTextBased()
                ) {
                    return interaction.editReply(
                        'ไม่พบห้องแนะนำตัวหรือห้องประวัติ กรุณาแจ้งทีมงาน'
                    );
                }

                const botMember = guild.members.me;

                const requiredPermissions = [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks
                ];

                for (const channel of [
                    introChannel,
                    historyChannel
                ]) {
                    if (!channel.permissionsFor(botMember)?.has(
                        requiredPermissions
                    )) {
                        return interaction.editReply(
                            'บอทไม่มีสิทธิ์ส่งข้อความในห้องที่ตั้งค่าไว้'
                        );
                    }
                }

                const introEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({
                        name: 'SELF INTRODUCTION SYSTEM',
                        iconURL: ICONS.SYSTEM
                    })
                    .setTitle('สมาชิกแนะนำตัวเอง')
                    .setThumbnail(
                        interaction.user.displayAvatarURL({
                            size: 256
                        })
                    )
                    .setDescription(about)
                    .addFields(
                        {
                            name: 'ชื่อ',
                            value: displayName,
                            inline: true
                        },
                        {
                            name: 'อายุ',
                            value: ageText,
                            inline: true
                        },
                        {
                            name: 'งานอดิเรก',
                            value: hobby,
                            inline: false
                        }
                    )
                    .setFooter({
                        text: `${guild.name} | INTRO SYSTEM`,
                        iconURL: ICONS.FOOTER
                    })
                    .setTimestamp();

                const logEmbed = new EmbedBuilder()
                    .setColor('#2B2D31')
                    .setAuthor({
                        name: 'INTRODUCTION AUDIT LOG',
                        iconURL: ICONS.SYSTEM
                    })
                    .setTitle('บันทึกการแนะนำตัว')
                    .addFields(
                        {
                            name: 'สมาชิก',
                            value: `${interaction.user.tag}\n${interaction.user.id}`
                        },
                        {
                            name: 'ชื่อ',
                            value: displayName,
                            inline: true
                        },
                        {
                            name: 'อายุ',
                            value: ageText,
                            inline: true
                        },
                        {
                            name: 'ข้อความแนะนำตัว',
                            value: about
                        },
                        {
                            name: 'งานอดิเรก',
                            value: hobby
                        },
                        {
                            name: 'ห้องต้นทาง',
                            value: `<#${config.channelId}>`
                        }
                    )
                    .setFooter({
                        text: 'PRIVATE STAFF LOG',
                        iconURL: ICONS.FOOTER
                    })
                    .setTimestamp();

                // ส่งประวัติก่อนโพสต์ข้อความสาธารณะ
                try {
                    await historyChannel.send({
                        embeds: [logEmbed],
                        allowedMentions: { parse: [] }
                    });

                    await introChannel.send({
                        embeds: [introEmbed],
                        allowedMentions: { parse: [] }
                    });
                } catch (error) {
                    console.error('[INTRO] Send error:', error);

                    return interaction.editReply(
                        'ไม่สามารถส่งข้อมูลได้ กรุณาตรวจสอบสิทธิ์ห้อง Discord'
                    );
                }

                // =====================================
                // 3. เพิ่มยศ + ส่งข้อความเข้า DM
                // =====================================
                let roleStatus = '';
                let assignedRoleObj = null;

                if (config.roleId) {
                    const role = await guild.roles
                        .fetch(config.roleId).catch(() => null);

                    if (
                        role &&
                        !role.managed &&
                        role.position < botMember.roles.highest.position
                    ) {
                        try {
                            const member = await guild.members.fetch(
                                interaction.user.id
                            );

                            if (!member.roles.cache.has(role.id)) {
                                await member.roles.add(
                                    role,
                                    'ส่งข้อมูลแนะนำตัวสำเร็จ'
                                );
                            }

                            assignedRoleObj = role;
                            roleStatus = '\nเพิ่มยศเรียบร้อยแล้ว';
                        } catch (error) {
                            console.error('[INTRO] Role error:', error);
                            roleStatus = '\nส่งข้อมูลแล้ว แต่เพิ่มยศไม่สำเร็จ';
                        }
                    } else {
                        roleStatus = '\nRole ID ไม่ถูกต้องหรือบอทไม่มีสิทธิ์เพิ่มยศ';
                    }
                }

                // 📩 ส่งข้อความขอบคุณเข้า DM สมาชิกแบบสวยๆ
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setAuthor({
                            name: `WELCOME TO ${guild.name.toUpperCase()}`,
                            iconURL: guild.iconURL({ dynamic: true }) || ICONS.SYSTEM
                        })
                        .setTitle(`🎉 ยินดีต้อนรับคุณ ${displayName} เข้าสู่เซิร์ฟเวอร์!`)
                        .setDescription([
                            `ขอบคุณที่เข้ามาเป็นส่วนหนึ่งของคอมมูนิตี้ **${guild.name}** นะครับ/ค่ะ! 💖`,
                            '',
                            '📌 **ข้อมูลการแนะนำตัวของคุณได้รับการบันทึกเรียบร้อยแล้ว**',
                            'ขอให้สนุกและมีความสุขกับการได้พูดคุย สร้างมิตรภาพใหม่ๆ ในเซิร์ฟเวอร์ของเรานะครับ/ค่ะ ✨'
                        ].join('\n'))
                        .addFields(
                            {
                                name: '🔰 ยศที่ได้รับ',
                                value: assignedRoleObj ? `\`${assignedRoleObj.name}\` (<@&${assignedRoleObj.id}>)` : '`ไม่มีการมอบยศ`',
                                inline: true
                            },
                            {
                                name: '🏠 เซิร์ฟเวอร์',
                                value: `\`${guild.name}\``,
                                inline: true
                            }
                        )
                        .setImage(ICONS.BANNER)
                        .setFooter({
                            text: `${guild.name} | OFFICIAL INTRO SYSTEM`,
                            iconURL: ICONS.FOOTER
                        })
                        .setTimestamp();

                    await interaction.user.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    console.log(`[INTRO] ไม่สามารถส่ง DM หา ${interaction.user.tag} ได้ (ปิด DM อยู่)`);
                }

                return interaction.editReply(
                    'แนะนำตัวเองสำเร็จแล้ว' + roleStatus
                );
            }
        } catch (error) {
            console.error('[INTRO] Interaction error:', error);

            const response = {
                content: 'ระบบเกิดข้อผิดพลาด กรุณาติดต่อทีมงาน',
                ephemeral: true
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(response).catch(() => {});
            } else if (interaction.isRepliable()) {
                await interaction.reply(response).catch(() => {});
            }
        }
    }
};
