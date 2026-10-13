const { Client, GatewayIntentBits, Collection, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express'); // 🌐 เพิ่ม Express สำหรับรันเว็บเซิร์ฟเวอร์
require('dotenv').config();

// เรียกใช้ไฟล์ Handler ทั้งหมดที่แยกไว้
const setBotStatus = require('./handler/status');
const handleGuildCreate = require('./handler/guildCreate'); // 📥 ระบบต้อนรับเมื่อบอทเข้าเซิร์ฟเวอร์
const handleAI = require('./handler/aiHandler');
const handleTicket = require('./handler/ticketHandler');
const autoClearScheduler = require('./handler/autoClearScheduler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 🌐 ตั้งค่า Express Web Server & API Endpoint สำหรับหน้าเว็บ Dashboard
const app = express();
const PORT = process.env.PORT || 3000;

// กำหนดให้โฟลเดอร์ 'website' เป็น Static Folder เพื่อให้อ่านหน้าเว็บ HTML/CSS/JS ได้
app.use(express.static(path.join(__dirname, 'website')));

// 📊 API สำหรับส่งข้อมูลสถานะบอทไปให้หน้าเว็บแสดงผลแบบเรียลไทม์
app.get('/api/status', (async (req, res) => {
    try {
        if (!client.user) {
            return res.json({
                online: false,
                username: 'SHGOX BOT (กำลังเชื่อมต่อ...)',
                avatar: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
                guilds: 0,
                users: 0,
                uptime: 0,
                guildsList: []
            });
        }

        // ดึงรายชื่อเซิร์ฟเวอร์และสมาชิก
        const guildsData = client.guilds.cache.map(guild => ({
            name: guild.name,
            icon: guild.iconURL({ dynamic: true }) || 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
            memberCount: guild.memberCount || 0
        }));

        let totalUsers = 0;
        client.guilds.cache.forEach(guild => {
            totalUsers += guild.memberCount || 0;
        });

        res.json({
            online: true,
            username: client.user.username,
            avatar: client.user.displayAvatarURL({ dynamic: true }),
            guilds: client.guilds.cache.size,
            users: totalUsers,
            uptime: Math.floor(client.uptime / 1000), // แปลงเป็นวินาที
            guildsList: guildsData
        });
    } catch (error) {
        console.error('Error in /api/status:', error);
        res.status(500).json({ online: false, error: 'Internal Server Error' });
    }
}));

// 📊 [เพิ่มใหม่] API สำหรับส่งข้อมูลรายการคำสั่งทั้งหมดในโฟลเดอร์ commands ให้หน้าเว็บแสดงผล
app.get('/api/commands', (req, res) => {
    try {
        const commandsPath = path.join(__dirname, 'commands');
        if (!fs.existsSync(commandsPath)) {
            return res.json({ success: true, commands: [] });
        }

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commandsList = [];

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);
                
                if (command.data && command.data.name) {
                    commandsList.push({
                        name: command.data.name,
                        description: command.data.description || 'ไม่มีคำอธิบายสำหรับคำสั่งนี้'
                    });
                }
            } catch (err) {
                console.error(`Error loading command file ${file} for API:`, err);
            }
        }

        res.json({ success: true, commands: commandsList });
    } catch (error) {
        console.error('Error in /api/commands:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// เปิดใช้งานพอร์ตเซิร์ฟเวอร์เว็บ
app.listen(PORT, () => {
    console.log(`🌐 [WEB SERVER] Running on http://localhost:${PORT}`);
});

// 📌 สร้าง Collection สำหรับเก็บคำสั่งทั้งหมด
client.commands = new Collection();
const commandsArray = [];

// โหลดไฟล์คำสั่งจากโฟลเดอร์ commands อัตโนมัติ
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsArray.push(command.data.toJSON());
            console.log(`📦 [COMMAND LOADED] /${command.data.name}`);
        } else {
            console.log(`[WARNING] คำสั่งที่ไฟล์ ${file} ขาดคุณสมบัติ 'data' หรือ 'execute'`);
        }
    }
}

// ----------------------------------------------------
// ระบบ Log ตอนเปิดใช้งานบอท ( clientReady )
// ----------------------------------------------------
client.once('clientReady', async () => {
    console.clear();
    console.log('====================================================');
    console.log(` 🤖 BOT ONLINE: ${client.user.tag}`);
    console.log(` 📊 SERVERS    : ${client.guilds.cache.size} Servers`);
    console.log(` 👥 USERS      : ${client.users.cache.size} Users`);
    console.log(` ⏰ READY TIME : ${new Date().toLocaleString('th-TH')}`);
    console.log('====================================================\n');
    console.log('📜 [SYSTEM LOGS]');

    // ลงทะเบียน Slash Commands ทั้งหมดให้กับบอท (Global Commands)
    try {
        await client.application.commands.set(commandsArray);
        console.log('🚀 [SLASH COMMANDS] Successfully registered all commands globally!');
    } catch (error) {
        console.error('❌ [SLASH COMMANDS ERROR]:', error);
    }

    // เรียกใช้ระบบตั้งสถานะบอท
    setBotStatus(client);
    
    // เริ่มทำงานตัวลบข้อความอัตโนมัติ
    autoClearScheduler(client);
});

// ----------------------------------------------------
// ระบบแจ้งเตือนเมื่อเพิ่มบอทเข้าเซิร์ฟใหม่ (เรียกใช้ผ่าน handler/guildCreate.js)
// ----------------------------------------------------
client.on('guildCreate', (guild) => {
    handleGuildCreate(guild, client);
});

// ----------------------------------------------------
// ระบบ AI แชทอัตโนมัติ (SHGOX ค่าย บักก๊อต) ผ่าน Handler
// ----------------------------------------------------
client.on('messageCreate', (message) => {
    handleAI(message);
});

// ----------------------------------------------------
// ระบบรับและประมวลผล Interaction (Slash Commands, Modals, Buttons & Dropdowns)
// ----------------------------------------------------
client.on('interactionCreate', async (interaction) => {

    // 0.1 📩 จัดการระบบคำสั่ง /dm (Modal Submit และ Buttons พรีเมียม)
    if (interaction.isModalSubmit() || interaction.isButton()) {
        const dmCommand = client.commands.get('dm');
        if (dmCommand && dmCommand.handleInteraction) {
            const handled = await dmCommand.handleInteraction(interaction);
            if (handled) return;
        }
    }

    // 0.2 🎙️ จัดการระบบคำสั่ง /interview (Modal Submit และ Buttons ประกาศสัมภาษณ์)
    if (interaction.isModalSubmit() || interaction.isButton()) {
        const interviewCmd = client.commands.get('interview');
        if (interviewCmd && interviewCmd.handleInteraction) {
            const handled = await interviewCmd.handleInteraction(interaction);
            if (handled) return;
        }
    }

    // 0.3 🛡️ จัดการระบบคำสั่ง /changestaff (Modal Submit และ Buttons ประกาศเปลี่ยนสตาฟ)
    if (interaction.isModalSubmit() || interaction.isButton()) {
        const staffCmd = client.commands.get('changestaff');
        if (staffCmd && staffCmd.handleInteraction) {
            const handled = await staffCmd.handleInteraction(interaction);
            if (handled) return;
        }
    }

    // 0.4 👑 จัดการระบบคำสั่ง /reactionrole (Modal Submit และ Buttons กดรับยศ)
    if (interaction.isModalSubmit() || interaction.isButton()) {
        const roleCmd = client.commands.get('reactionrole');
        if (roleCmd && roleCmd.handleInteraction) {
            const handled = await roleCmd.handleInteraction(interaction);
            if (handled) return;
        }
    }

    // 0.5 🚨 จัดการระบบคำสั่ง /adminnotice (Modal Submit และ Buttons กระจายประกาศ) [เพิ่มใหม่เพื่อแก้บั๊ก DM]
    if (interaction.isModalSubmit() || interaction.isButton()) {
        const adminNoticeCmd = client.commands.get('adminnotice');
        if (adminNoticeCmd && adminNoticeCmd.handleInteraction) {
            const handled = await adminNoticeCmd.handleInteraction(interaction);
            if (handled) return; // หากเป็น interaction ของ adminnotice ให้จัดการจบตรงนี้ทันที
        }
    }

    // 1. จัดการระบบตั๋ว (ปุ่มกด Button & Dropdown Select Menu)
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        try {
            await handleTicket(interaction);
        } catch (error) {
            console.error('Error handling ticket interaction:', error);
        }
        return;
    }

    // 2. จัดการเมื่อมีการส่งข้อมูลผ่าน Modal (เช่น คำสั่ง /broadcast)
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('broadcast_modal_')) {
            const parts = interaction.customId.split('_');
            const serverId = parts[2];
            const channelId = parts[3];

            const titleText = interaction.fields.getTextInputValue('broadcast_title');
            const messageText = interaction.fields.getTextInputValue('broadcast_message');

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            try {
                const targetGuild = await client.guilds.fetch(serverId).catch(() => null);
                if (!targetGuild) {
                    return interaction.editReply('ไม่พบเซิร์ฟเวอร์ปลายทาง หรือบอทไม่ได้อยู่ในเซิร์ฟเวอร์นั้น');
                }

                const targetChannel = await targetGuild.channels.fetch(channelId).catch(() => null);
                if (!targetChannel || !targetChannel.isTextBased()) {
                    return interaction.editReply('ไม่พบห้องแชทปลายทาง หรือห้องนั้นไม่ใช่ห้องข้อความ');
                }

                const broadcastEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ 
                        name: 'ANNOUNCEMENT & BROADCAST', 
                        iconURL: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png' 
                    })
                    .setTitle(titleText)
                    .setDescription(messageText)
                    .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                    .setFooter({ 
                        text: `${interaction.client.user.username} | Official Broadcast`, 
                        iconURL: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png' 
                    })
                    .setTimestamp();

                await targetChannel.send({ embeds: [broadcastEmbed] });
                await interaction.editReply('ส่งข้อความประกาศไปยังเซิร์ฟเวอร์เป้าหมายสำเร็จเรียบร้อยแล้ว');

            } catch (error) {
                console.error('Error handling broadcast modal:', error);
                await interaction.editReply('เกิดข้อผิดพลาดในการส่งข้อความ (กรุณาตรวจสอบสิทธิ์ของบอทในเซิร์ฟเวอร์ปลายทาง)');
            }
        }
        return;
    }

    // 3. จัดการ Slash Command ปกติ
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    console.log(`[${new Date().toLocaleTimeString('th-TH')}] 💬 Command /${interaction.commandName} used by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const errorMessage = { content: 'เกิดข้อผิดพลาดบางประการขณะรันคำสั่งนี้!', flags: [MessageFlags.Ephemeral] };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// ล็อกอินบอท
client.login(process.env.DISCORD_TOKEN);