const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

async function handleStats(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
    const stats = JSON.parse(fs.readFileSync('./stats.json', 'utf8'));

    // Check if staff
    if (!interaction.member.roles.cache.has(settings.staffRoleId)) {
        return interaction.reply({
            content: '❌ Only staff can view stats.',
            flags: 64,
        });
    }

    // Calculate success rate
    const totalTrades = stats.successfulTrades + stats.unsuccessfulTrades;
    const successRate = totalTrades > 0 ? ((stats.successfulTrades / totalTrades) * 100).toFixed(1) : '0.0';

    // Build ticket types breakdown
    const ticketTypes = [
        { name: '🛒 Buy CODM Account', value: stats.ticketTypes.buy_codm || 0 },
        { name: '💰 Sell CODM Account', value: stats.ticketTypes.sell_codm || 0 },
        { name: '📱 Buy Device', value: stats.ticketTypes.buy_device || 0 },
        { name: '📱 Sell Device', value: stats.ticketTypes.sell_device || 0 },
        { name: '❓ General Support', value: stats.ticketTypes.general_support || 0 },
        { name: '🚨 Report a Vendor', value: stats.ticketTypes.report_vendor || 0 },
    ].sort((a, b) => b.value - a.value);

    const ticketTypesText = ticketTypes
        .map(t => `${t.name}: **${t.value}**`)
        .join('\n');

    // Build vendor performance
    const vendorEntries = Object.entries(stats.vendorStats || {});
    let vendorText = 'No vendor data yet.';

    if (vendorEntries.length > 0) {
        const sortedVendors = vendorEntries
            .sort((a, b) => (b[1].closed || 0) - (a[1].closed || 0))
            .slice(0, 5);

        vendorText = sortedVendors.map(([ username, data ], index) => {
            const vendorTotal = (data.successful || 0) + (data.unsuccessful || 0);
            const vendorRate = vendorTotal > 0 ? (((data.successful || 0) / vendorTotal) * 100).toFixed(1) : '0.0';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▪️';
            return `${medal} **${username}** — ${data.closed || 0} tickets closed | ${vendorRate}% success`;
        }).join('\n');
    }

    // Overall stats embed
    const overallEmbed = new EmbedBuilder()
        .setTitle('📊 Harlesh Marketplace Dashboard')
        .setDescription('Live statistics for the Harlesh CODM Marketplace')
        .addFields(
            { name: '🎫 Total Tickets Opened', value: `**${stats.totalTickets}**`, inline: true },
            { name: '🔒 Total Tickets Closed', value: `**${stats.closedTickets}**`, inline: true },
            { name: '📈 Trade Success Rate', value: `**${successRate}%**`, inline: true },
            { name: '✅ Successful Trades', value: `**${stats.successfulTrades}**`, inline: true },
            { name: '❌ Unsuccessful Trades', value: `**${stats.unsuccessfulTrades}**`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },
            { name: '💰 Commission Paid', value: `**${stats.commissionPaid}**`, inline: true },
            { name: '❌ Commission Unpaid', value: `**${stats.commissionUnpaid}**`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },
        )
        .setColor(0x5865F2)
        .setTimestamp()
        .setFooter({ text: 'Harlesh CODM Marketplace • Live Stats' });

    // Ticket types embed
    const ticketTypesEmbed = new EmbedBuilder()
        .setTitle('🎫 Most Active Ticket Types')
        .setDescription(ticketTypesText)
        .setColor(0xFEE75C)
        .setTimestamp();

    // Vendor performance embed
    const vendorEmbed = new EmbedBuilder()
        .setTitle('🏪 Vendor Performance')
        .setDescription(vendorText)
        .setColor(0x57F287)
        .setTimestamp();

    await interaction.reply({
        embeds: [overallEmbed, ticketTypesEmbed, vendorEmbed],
    });
}

module.exports = { handleStats };