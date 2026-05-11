const fs = require('fs');

async function saveTranscript(channel, closedBy, guild) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    try {
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

        allMessages.reverse();

        // Group consecutive messages from same author
        const groupedMessages = [];
        let currentGroup = null;

        allMessages.forEach(m => {
            if (currentGroup && currentGroup.authorId === m.author.id &&
                m.createdTimestamp - currentGroup.lastTimestamp < 420000) {
                currentGroup.messages.push(m);
                currentGroup.lastTimestamp = m.createdTimestamp;
            } else {
                currentGroup = {
                    authorId: m.author.id,
                    authorName: m.author.username,
                    authorAvatar: m.author.displayAvatarURL({ format: 'png', size: 64 }),
                    authorBot: m.author.bot,
                    firstTimestamp: m.createdTimestamp,
                    lastTimestamp: m.createdTimestamp,
                    messages: [m],
                };
                groupedMessages.push(currentGroup);
            }
        });

        const messagesHTML = groupedMessages.map(group => {
            const time = new Date(group.firstTimestamp).toLocaleString('en-US', {
                month: 'numeric', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            });

            const botBadge = group.authorBot ? '<span class="bot-badge">APP</span>' : '';
            const usernameColor = group.authorBot ? '#5865f2' : getColorForUser(group.authorId);

            const msgsHTML = group.messages.map(m => {
                const content = m.content ? `<div class="text">${escapeHTML(m.content)}</div>` : '';

                const embedsHTML = m.embeds.map(embed => {
                    const color = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865f2';
                    const fieldsHTML = embed.fields.map(f => `
                        <div class="embed-field ${f.inline ? 'inline' : ''}">
                            <div class="embed-field-name">${escapeHTML(f.name)}</div>
                            <div class="embed-field-value">${escapeHTML(f.value)}</div>
                        </div>
                    `).join('');

                    return `
                        <div class="embed" style="border-left-color: ${color}">
                            ${embed.title ? `<div class="embed-title">${escapeHTML(embed.title)}</div>` : ''}
                            ${embed.description ? `<div class="embed-desc">${escapeHTML(embed.description)}</div>` : ''}
                            ${fieldsHTML ? `<div class="embed-fields">${fieldsHTML}</div>` : ''}
                            ${embed.footer ? `<div class="embed-footer">${escapeHTML(embed.footer.text)}</div>` : ''}
                        </div>
                    `;
                }).join('');

                const attachmentsHTML = Array.from(m.attachments.values()).map(a => {
                    if (a.contentType && a.contentType.startsWith('image/')) {
                        return `<div class="attachment"><img src="${a.url}" alt="${escapeHTML(a.name)}" /></div>`;
                    } else if (a.contentType && a.contentType.startsWith('video/')) {
                        return `<div class="attachment"><video controls><source src="${a.url}"></video></div>`;
                    }
                    return `<div class="attachment file"><a href="${a.url}" target="_blank">📎 ${escapeHTML(a.name)}</a></div>`;
                }).join('');

                return `${content}${embedsHTML}${attachmentsHTML}`;
            }).join('');

            return `
                <div class="message-group">
                    <img class="avatar" src="${group.authorAvatar}" alt="${escapeHTML(group.authorName)}" />
                    <div class="message-group-content">
                        <div class="message-header">
                            <span class="username" style="color: ${usernameColor}">${escapeHTML(group.authorName)}</span>
                            ${botBadge}
                            <span class="timestamp">${time}</span>
                        </div>
                        <div class="messages-content">${msgsHTML}</div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - #${channel.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background-color: #313338;
            color: #dcddde;
            font-family: 'gg sans', 'Noto Sans', Whitney, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.375;
        }

        /* HEADER */
        .header {
            background-color: #1e1f22;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 2px solid #5865f2;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-hash {
            color: #80848e;
            font-size: 24px;
            font-weight: 700;
        }
        .header-name {
            font-size: 16px;
            font-weight: 700;
            color: #f2f3f5;
        }
        .header-divider {
            color: #3f4147;
            margin: 0 8px;
        }
        .header-desc {
            font-size: 14px;
            color: #80848e;
        }

        /* TICKET INFO BANNER */
        .ticket-banner {
            background: linear-gradient(135deg, #2b2d31, #1e1f22);
            border-bottom: 1px solid #1a1b1e;
            padding: 20px 24px;
        }
        .ticket-banner h2 {
            font-size: 20px;
            font-weight: 700;
            color: #f2f3f5;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .ticket-stats {
            display: flex;
            gap: 32px;
            flex-wrap: wrap;
        }
        .ticket-stat {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .ticket-stat-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #80848e;
        }
        .ticket-stat-value {
            font-size: 15px;
            color: #f2f3f5;
            font-weight: 500;
        }

        /* DATE SEPARATOR */
        .date-separator {
            display: flex;
            align-items: center;
            padding: 16px 24px;
            gap: 12px;
        }
        .date-separator-line {
            flex: 1;
            height: 1px;
            background-color: #3f4147;
        }
        .date-separator-text {
            font-size: 12px;
            font-weight: 600;
            color: #80848e;
            white-space: nowrap;
        }

        /* MESSAGES */
        .messages-container {
            padding: 8px 0;
        }
        .message-group {
            display: flex;
            padding: 4px 24px;
            gap: 16px;
            margin-bottom: 2px;
        }
        .message-group:hover { background-color: #2e3035; }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-top: 2px;
            flex-shrink: 0;
            cursor: pointer;
        }
        .message-group-content { flex: 1; min-width: 0; }
        .message-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
            flex-wrap: wrap;
        }
        .username {
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
        }
        .username:hover { text-decoration: underline; }
        .bot-badge {
            background-color: #5865f2;
            color: white;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 3px;
            letter-spacing: 0.3px;
        }
        .timestamp {
            font-size: 11px;
            color: #80848e;
        }
        .text {
            color: #dcddde;
            font-size: 15px;
            word-wrap: break-word;
            line-height: 1.4;
            margin-bottom: 2px;
        }

        /* EMBEDS */
        .embed {
            border-left: 4px solid #5865f2;
            background-color: #2b2d31;
            border-radius: 4px;
            padding: 12px 16px;
            margin-top: 4px;
            max-width: 520px;
        }
        .embed-title {
            font-weight: 700;
            color: #f2f3f5;
            margin-bottom: 8px;
            font-size: 15px;
        }
        .embed-desc {
            color: #dcddde;
            font-size: 14px;
            line-height: 1.4;
            margin-bottom: 8px;
            white-space: pre-line;
        }
        .embed-fields {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }
        .embed-field {
            flex: 0 0 100%;
        }
        .embed-field.inline {
            flex: 0 0 calc(33% - 8px);
            min-width: 100px;
        }
        .embed-field-name {
            font-weight: 700;
            font-size: 13px;
            color: #f2f3f5;
            margin-bottom: 2px;
        }
        .embed-field-value {
            font-size: 14px;
            color: #dcddde;
        }
        .embed-footer {
            font-size: 12px;
            color: #80848e;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #3f4147;
        }

        /* ATTACHMENTS */
        .attachment { margin-top: 8px; }
        .attachment img {
            max-width: min(400px, 100%);
            max-height: 300px;
            border-radius: 4px;
            cursor: pointer;
        }
        .attachment video {
            max-width: min(400px, 100%);
            border-radius: 4px;
        }
        .attachment.file a {
            color: #00aff4;
            text-decoration: none;
            font-size: 14px;
        }
        .attachment.file a:hover { text-decoration: underline; }

        /* FOOTER */
        .footer {
            text-align: center;
            padding: 24px;
            color: #80848e;
            font-size: 12px;
            border-top: 1px solid #3f4147;
            margin-top: 16px;
            background-color: #2b2d31;
        }
        .footer strong { color: #f2f3f5; }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #2b2d31; }
        ::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #111214; }
    </style>
</head>
<body>
    <div class="header">
        <span class="header-hash">#</span>
        <span class="header-name">${channel.name}</span>
        <span class="header-divider">|</span>
        <span class="header-desc">Ticket Transcript</span>
    </div>

    <div class="ticket-banner">
        <h2>🎫 Ticket Information</h2>
        <div class="ticket-stats">
            <div class="ticket-stat">
                <span class="ticket-stat-label">Ticket</span>
                <span class="ticket-stat-value">#${channel.name}</span>
            </div>
            <div class="ticket-stat">
                <span class="ticket-stat-label">Closed By</span>
                <span class="ticket-stat-value">${escapeHTML(closedBy.tag)}</span>
            </div>
            <div class="ticket-stat">
                <span class="ticket-stat-label">Messages</span>
                <span class="ticket-stat-value">${allMessages.length}</span>
            </div>
            <div class="ticket-stat">
                <span class="ticket-stat-label">Date</span>
                <span class="ticket-stat-value">${new Date().toLocaleString()}</span>
            </div>
            <div class="ticket-stat">
                <span class="ticket-stat-label">Server</span>
                <span class="ticket-stat-value">Harlesh CODM Marketplace</span>
            </div>
        </div>
    </div>

    <div class="date-separator">
        <div class="date-separator-line"></div>
        <div class="date-separator-text">${new Date(allMessages[0]?.createdTimestamp || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        <div class="date-separator-line"></div>
    </div>

    <div class="messages-container">
        ${messagesHTML}
    </div>

    <div class="footer">
        <strong>Harlesh CODM Marketplace</strong> • Ticket System • Generated ${new Date().toLocaleString()}
    </div>
</body>
</html>`;

        const fileName = `transcript-${channel.name}-${Date.now()}.html`;
        fs.writeFileSync(fileName, html);

        const transcriptChannel = guild.channels.cache.get(settings.transcriptChannelId);
        if (transcriptChannel) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('📄 Ticket Transcript')
                .setDescription(`Transcript for **#${channel.name}** is attached below.\nOpen the HTML file in your browser for the full Discord-like view!`)
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

function getColorForUser(userId) {
    const colors = [
        '#f23f43', '#f0b132', '#23a55a', '#00aff4',
        '#5865f2', '#eb459e', '#fee75c', '#57f287',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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