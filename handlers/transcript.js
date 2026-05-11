const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

async function saveTranscript(channel, closedBy, guild) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    try {
        // Fetch all messages
        let allMessages = [];
        let lastId;

        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            allMessages = allMessages.concat(Array.from(messages.values()));
            lastId = messages.last().id;

            if (messages.size < 100) break;
        }

        // Format messages
        allMessages.reverse();
        const transcript = allMessages
            .map(m => {
                const time = new Date(m.createdTimestamp).toLocaleString();
                const content = m.content || '';
                const embeds = m.embeds.length > 0 ? '[Embed]' : '';
                const attachments = m.attachments.size > 0 ? '[Attachment]' : '';
                return `[${time}] ${m.author.tag}: ${content} ${embeds} ${attachments}`.trim();
            })
            .join('\n');

        // Save transcript as .txt file
        const fileName = `transcript-${channel.name}-${Date.now()}.txt`;
        fs.writeFileSync(fileName, transcript);

        // Send to transcript channel
        const transcriptChannel = guild.channels.cache.get(settings.transcriptChannelId);
        if (transcriptChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📄 Ticket Transcript')
                .addFields(
                    { name: '🎫 Ticket', value: channel.name, inline: true },
                    { name: '🔒 Closed By', value: closedBy.tag, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                )
                .setColor(0xED4245)
                .setTimestamp();

            await transcriptChannel.send({
                embeds: [embed],
                files: [{ attachment: fileName, name: fileName }],
            });

            // Delete temp file
            fs.unlinkSync(fileName);
        }

    } catch (error) {
        console.error('Transcript error:', error);
    }
}

module.exports = { saveTranscript };