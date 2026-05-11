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

        // Reverse to get chronological order
        allMessages.reverse();

        // Build HTML messages
        const messagesHTML = allMessages.map(m => {
            const time = new Date(m.createdTimestamp).toLocaleString();
            const avatar = m.author.displayAvatarURL({ format: 'png', size: 32 });
            const content = m.content ? escapeHTML(m.content) : '';

            // Handle embeds
            const embedsHTML = m.embeds.map(embed => `
                <div class="embed">
                    ${embed.title ? `<div class="embed-title">${escapeHTML(embed.title)}</div>` : ''}
                    ${embed.description ? `<div class="embed-desc">${escapeHTML(embed.description)}</div>` : ''}
                    ${embed.fields.map(f => `
                        <div class="embed-field">
                            <div class="embed-field-name">${escapeHTML(f.name)}</div>
                            <div class="embed-field-value">${escapeHTML(f.value)}</div>
                        </div>
                    `).join('')}
                </div>
            `).join('');

            // Handle attachments
            const attachmentsHTML = m.attachments.map(a => {
                if (a.contentType && a.contentType.startsWith('image/')) {
                    return `<div class="attachment"><img src="${a.url}" alt="attachment" /></div>`;
                }
                return `<div class="attachment"><a href="${a.url}" target="_blank">📎 ${escapeHTML(a.name)}</a></div>`;
            }).join('');

            return `
                <div class="message">
                    <img class="avatar" src="${avatar}" alt="avatar" />
                    <div class="message-content">
                        <div class="message-header">
                            <span class="username">${escapeHTML(m.author.username)}</span>
                            <span class="timestamp">${time}</span>
                        </div>
                        ${content ? `<div class="text">${content}</div>` : ''}
                        ${embedsHTML}
                        ${attachmentsHTML}
                    </div>
                </div>
            `;
        }).join('');

        // Build full HTML
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Transcript - ${channel.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: #313338;
            color: #dcddde;
            font-family: 'gg sans', 'Noto Sans', Whitney, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.375;
        }
        .header {
            background-color: #1e1f22;
            padding: 16px 24px;
            border-bottom: 1px solid #1a1b1e;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header-icon { font-size: 24px; }
        .header-info h1 {
            font-size: 16px;
            font-weight: 600;
            color: #f2f3f5;
        }
        .header-info p {
            font-size: 12px;
            color: #949ba4;
        }
        .stats {
            background-color: #2b2d31;
            padding: 12px 24px;
            display: flex;
            gap: 24px;
            border-bottom: 1px solid #1a1b1e;
            flex-wrap: wrap;
        }
        .stat {
            display: flex;
            flex-direction: column;
        }
        .stat-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #949ba4;
            letter-spacing: 0.5px;
        }
        .stat-value {
            font-size: 14px;
            color: #f2f3f5;
            margin-top: 2px;
        }
        .messages {
            padding: 16px 0;
            max-width: 900px;
            margin: 0 auto;
        }
        .message {
            display: flex;
            padding: 4px 24px;
            gap: 16px;
            border-radius: 4px;
            margin-bottom: 4px;
        }
        .message:hover { background-color: #2e3035; }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-top: 2px;
            flex-shrink: 0;
        }
        .message-content { flex: 1; min-width: 0; }
        .message-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 4px;
        }
        .username {
            font-weight: 600;
            color: #f2f3f5;
            font-size: 15px;
        }
        .timestamp {
            font-size: 11px;
            color: #949ba4;
        }
        .text {
            color: #dcddde;
            font-size: 15px;
            word-wrap: break-word;
        }
        .embed {
            border-left: 4px solid #5865f2;
            background-color: #2b2d31;
            border-radius: 4px;
            padding: 12px 16px;
            margin-top: 8px;
            max-width: 520px;
        }
        .embed-title {
            font-weight: 600;
            color: #f2f3f5;
            margin-bottom: 8px;
            font-size: 15px;
        }
        .embed-desc {
            color: #dcddde;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .embed-field {
            margin-top: 8px;
        }
        .embed-field-name {
            font-weight: 600;
            font-size: 13px;
            color: #f2f3f5;
            margin-bottom: 2px;
        }
        .embed-field-value {
            font-size: 14px;
            color: #dcddde;
        }
        .attachment {
            margin-top: 8px;
        }
        .attachment img {
            max-width: 400px;
            max-height: 300px;
            border-radius: 4px;
            cursor: pointer;
        }
        .attachment a {
            color: #00aff4;
            text-decoration: none;
            font-size: 14px;
        }
        .attachment a:hover { text-decoration: underline; }
        .footer {
            text-align: center;
            padding: 24px;
            color: #949ba4;
            font-size: 12px;
            border-top: 1px solid #1a1b1e;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-icon">🎫</div>
        <div class="header-info">
            <h1>#${channel.name}</h1>
            <p>Ticket Transcript • Harlesh CODM Marketplace</p>
        </div>
    </div>
    <div class="stats">
        <div class="stat">
            <span class="stat-label">Ticket</span>
            <span class="stat-value">${channel.name}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Closed By</span>
            <span class="stat-value">${closedBy.tag}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Date</span>
            <span class="stat-value">${new Date().toLocaleString()}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Messages</span>
            <span class="stat-value">${allMessages.length}</span>
        </div>
    </div>
    <div class="messages">
        ${messagesHTML}
    </div>
    <div class="footer">
        Harlesh CODM Marketplace • Ticket System • ${new Date().toLocaleDateString()}
    </div>
</body>
</html>`;

        // Save HTML file
        const fileName = `transcript-${channel.name}-${Date.now()}.html`;
        fs.writeFileSync(fileName, html);

        // Send to transcript channel
        const transcriptChannel = guild.channels.cache.get(settings.transcriptChannelId);
        if (transcriptChannel) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('📄 Ticket Transcript')
                .addFields(
                    { name: '🎫 Ticket', value: channel.name, inline: true },
                    { name: '🔒 Closed By', value: closedBy.tag, inline: true },
                    { name: '💬 Messages', value: `${allMessages.length}`, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                )
                .setColor(0x5865F2)
                .setTimestamp();

            await transcriptChannel.send({
                embeds: [embed],
                files: [{ attachment: fileName, name: fileName }],
            });

            fs.unlinkSync(fileName);
        }

    } catch (error) {
        console.error('Transcript error:', error);
    }
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = { saveTranscript };