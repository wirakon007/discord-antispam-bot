const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // จำเป็นต้องเปิดใน Developer Portal
        GatewayIntentBits.GuildModeration, // จำเป็นสำหรับการเตะสมาชิก
    ],
});

// เก็บประวัติข้อความของผู้ใช้แต่ละคน { userId: [timestamps] }
const usersMap = new Collection();

// ค่ากำหนดการป้องกันสแปม
const LIMIT = 5;          // จำนวนข้อความสูงสุด
const TIME_WINDOW = 5000; // ภายในเวลา 5 วินาที

// ID ห้องประกาศที่คุณให้มา
const ANNOUNCEMENT_CHANNEL_ID = '1462415081110503533';

client.once('ready', () => {
    logWithTimestamp(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // ข้ามบอท หรือข้อความนอกเซิร์ฟเวอร์
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;

    if (!usersMap.has(userId)) {
        usersMap.set(userId, []);
    }

    const timestamps = usersMap.get(userId);
    const now = Date.now();

    // กรองข้อความที่อยู่ในช่วงเวลา 5 วินาทีล่าสุด
    const recentMessages = timestamps.filter(timestamp => now - timestamp < TIME_WINDOW);
    recentMessages.push(now);
    usersMap.set(userId, recentMessages);

    // ถ้าส่งข้อความเกินลิมิตในเวลาที่กำหนด
    if (recentMessages.length > LIMIT) {
        try {
            const member = message.guild.members.cache.get(userId);
            const channelWhereSpammed = message.channel;

            // เคลียร์ประวัติของคนนี้ เพื่อป้องกันไม่ให้แจ้งเตือนซ้ำรัวๆ ระหว่างกำลังเตะ
            usersMap.delete(userId);

            // 1. เตะผู้ใช้ออกจากเซิร์ฟเวอร์
            if (member && member.kickable) {
                await member.kick('สแปมข้อความในห้องแชทเกินกำหนด');
            } else {
                console.log(`ไม่สามารถเตะ ${message.author.tag} ได้ เนื่องจากติดปัญหาเรื่องยศหรือสิทธิ์ของบอท`);
                return;
            }

            // 2. ส่งข้อความแจ้งเตือนไปที่ห้องประกาศ
            const announcementChannel = message.guild.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);
            if (announcementChannel) {
                await announcementChannel.send(
                    `🚨 **แจ้งเตือนการลงโทษ:** ผู้ใช้ <@${userId}> (${message.author.tag}) ถูกเตะออกจากเซิร์ฟเวอร์เนื่องจากสแปมข้อความติดต่อกันที่ห้อง <#${channelWhereSpammed.id}>`
                );
            }

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการจัดการระบบสแปม:', error);
        }
    }
});

client.login(process.env.TOKEN);

function logWithTimestamp(message) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${message}`);
}