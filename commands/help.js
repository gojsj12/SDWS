const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (ใช้แทนอีโมจิข้อความ เพื่อความคลีนและสวยงาม)
const ICONS = {
    HELP: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    COMMAND: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('แสดงรายการคำสั่งทั้งหมด'),

    async execute(interaction) {
        try {
            const client = interaction.client;
            const commands = client.commands;

            // ดีไซน์แบบเน้นสั้น กระชับ สวยงาม คลีนๆ
            const embedHelp = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ 
                    name: 'COMMAND CENTER', 
                    iconURL: ICONS.HELP 
                })
                .setTitle('ศูนย์รวมคำสั่งระบบ')
                .setDescription(
                    commands.size > 0 
                        ? commands.map(cmd => `\`/${cmd.data.name}\` — ${cmd.data.description}`).join('\n')
                        : '*ไม่มีคำสั่งในระบบ*'
                )
                .setThumbnail(client.user.displayAvatarURL({ size: 512 }))
                .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                .setFooter({ 
                    text: `${client.user.username} | Total: ${commands.size} Commands`, 
                    iconURL: ICONS.FOOTER 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embedHelp], ephemeral: false });

        } catch (error) {
            console.error('Error executing /help:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'เกิดข้อผิดพลาดในการโหลดคำสั่ง', ephemeral: true });
            }
        }
    },
};
