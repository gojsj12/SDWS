const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const simplementts = require('discord-tts'); 

const ICONS = {
    SPEAK: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('speak')
        .setDescription('ให้บอทเข้าห้องเสียงและพูดข้อความที่คุณต้องการ (พิมพ์ซ้ำเพื่อให้ออก)')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('ข้อความที่ต้องการให้บอทพูด')
                .setRequired(true)
        ),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ 
                content: '❌ กรุณาเข้าห้องเสียง (Voice Channel) ก่อนใช้งานคำสั่งนี้', 
                ephemeral: true 
            });
        }

        // ตรวจสอบว่าบอทอยู่ในห้องเสียงของกิลด์นี้อยู่แล้วหรือไม่
        const existingConnection = getVoiceConnection(interaction.guild.id);

        if (existingConnection) {
            // ถ้าบอทอยู่ในห้องอยู่แล้ว ให้ทำการออกจากห้อง (Disconnect)
            existingConnection.destroy();
            return interaction.reply({ 
                content: '🔌 บอทได้ออกจากห้องเสียงเรียบร้อยแล้ว', 
                ephemeral: true 
            });
        }

        // ตรวจสอบสิทธิ์การเข้าและพูดในห้องเสียง (Permission Check)
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({ 
                content: '❌ บอทไม่มีสิทธิ์ในการ **Connect (เข้าห้อง)** หรือ **Speak (พูด)** ในห้องเสียงนี้ กรุณาตรวจสอบยศหรือสิทธิ์ของบอท', 
                ephemeral: true 
            });
        }

        const textToSpeak = interaction.options.getString('text');
        await interaction.deferReply();

        try {
            // เชื่อมต่อบอทเข้าห้องเสียง
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // แปลงข้อความให้เป็นเสียงพูดด้วย discord-tts
            const stream = await simplementts.getVoiceStream(textToSpeak, { lang: 'th' });
            const resource = createAudioResource(stream);
            const player = createAudioPlayer();

            connection.subscribe(player);
            player.play(resource);

            const embedSpeak = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ 
                    name: 'VOICE TTS SYSTEM', 
                    iconURL: ICONS.SPEAK 
                })
                .setTitle('กำลังพูดข้อความในห้องเสียง')
                .setDescription(`\`\`\`${textToSpeak}\`\`\``)
                .addFields(
                    { name: 'ห้องเสียง', value: `${voiceChannel.name}`, inline: true },
                    { name: 'ผู้สั่งการ', value: `${interaction.user.username}`, inline: true }
                )
                .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                .setFooter({ 
                    text: `${interaction.client.user.username} | Text-to-Speech`, 
                    iconURL: ICONS.FOOTER 
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embedSpeak] });

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

        } catch (error) {
            console.error('Error in /speak:', error);
            // กรณีเกิดข้อผิดพลาดในการเชื่อมต่อหรือสร้างเสียง
            const cleanupConnection = getVoiceConnection(interaction.guild.id);
            if (cleanupConnection) {
                cleanupConnection.destroy();
            }
            await interaction.editReply('❌ เกิดข้อผิดพลาดในการสร้างเสียงพูดหรือเชื่อมต่อห้องเสียง (บอทอาจไม่ได้รับอนุญาตให้ออกเสียงในห้องนี้)');
        }
    },
};
