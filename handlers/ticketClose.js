const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { saveTranscript } = require('./transcript');
const fs = require('fs');

const salesCategories = ['buy-codm', 'sell-codm', 'buy-device', 'sell-device'];

function isSalesTicket(channelName) {
    return salesCategories.some(prefix => channelName.startsWith(prefix));
}

function getTicketType(channelName) {
    if (channelName.startsWith('buy-codm')) return 'buy_codm';
    if (channelName.startsWith('sell-codm')) return 'sell_codm';
    if (channelName.startsWith('buy-device')) return 'buy_device';
    if (channelName.startsWith('sell-device')) return 'sell_device';
    if (channelName.startsWith('support')) return 'general_support';
    if (channelName.startsWith('report')) return 'report_vendor';
    return 'general_support';
}

function updateStats(ticketType, tradeData, claimedBy) {
    const stats = JSON.parse(fs.readFileSync('./stats.json', 'utf8'));

    // Update closed tickets
    stats.closedTickets = (stats.closedTickets || 0) + 1;

    // Update ticket type count
    if (stats.ticketTypes[ticketType] !== undefined) {
        stats.ticketTypes[ticketType] = (stats.ticketTypes[ticketType] || 0) + 1;
    }

    // Update trade data for sales tickets
    if (tradeData) {
        if (tradeData.tradeSuccess) {
            stats.successfulTrades = (stats.successfulTrades || 0) + 1;
        } else {
            stats.unsuccessfulTrades = (stats.unsuccessfulTrades || 0) + 1;
        }

        if (tradeData.commissionPaid) {
            stats.commissionPaid = (stats.commissionPaid || 0) + 1;
        } else {
            stats.commissionUnpaid = (stats.commissionUnpaid || 0) + 1;
        }
    }

    // Update vendor stats
    if (claimedBy) {
        if (!stats.vendorStats) stats.vendorStats = {};
        if (!stats.vendorStats[claimedBy]) {
            stats.vendorStats[claimedBy] = {
                closed: 0,
                successful: 0,
                unsuccessful: 0,
            };
        }
        stats.vendorStats[claimedBy].closed = (stats.vendorStats[claimedBy].closed || 0) + 1;
        if (tradeData) {
            if (tradeData.tradeSuccess) {
                stats.vendorStats[claimedBy].successful = (stats.vendorStats[claimedBy].successful || 0) + 1;
            } else {
                stats.vendorStats[claimedBy].unsuccessful = (stats.vendorStats[claimedBy].unsuccessful || 0) + 1;
            }
        }
    }

    fs.writeFileSync('./stats.json', JSON.stringify(stats, null, 4));
}

function incrementTotalTickets() {
    const stats = JSON.parse(fs.readFileSync('./stats.json', 'utf8'));
    stats.totalTickets = (stats.totalTickets || 0) + 1;
    fs.writeFileSync('./stats.json', JSON.stringify(stats, null, 4));
}

async function handleTicketClose(interaction) {
    await interaction.deferReply({ flags: 64 });
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);
    const isVendor = interaction.member.roles.cache.has(settings.vendorRoleId);
    const isDeviceVendor = interaction.member.roles.cache.has(settings.deviceVendorRoleId);

    if (!isStaff && !isVendor && !isDeviceVendor) {
        return interaction.editReply({
            content: '❌ Only staff or vendors can close tickets.',
        });
    }

    // Show trade outcome prompt for sales tickets
    if (isSalesTicket(interaction.channel.name)) {
        const promptEmbed = new EmbedBuilder()
            .setTitle('📊 Trade Summary')
            .setDescription('Before closing this ticket please provide the trade outcome.')
            .setColor(0x5865F2);

        const successButton = new ButtonBuilder()
            .setCustomId('trade_successful')
            .setLabel('Successful')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success);

        const unsuccessfulButton = new ButtonBuilder()
            .setCustomId('trade_unsuccessful')
            .setLabel('Unsuccessful')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(successButton, unsuccessfulButton);

        return interaction.editReply({
            content: '**Was the trade successful?**',
            embeds: [promptEmbed],
            components: [row],
        });
    }

    // Non-sales tickets — show normal confirm close
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🔒 Close Ticket')
        .setDescription('Are you sure you want to close this ticket?\nA transcript will be saved automatically.')
        .setColor(0xED4245);

    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_close_no_trade')
        .setLabel('Confirm Close')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_close')
        .setLabel('Cancel')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
}

async function handleTradeOutcome(interaction, tradeSuccess) {
    await interaction.deferUpdate();

    const commissionPaidButton = new ButtonBuilder()
        .setCustomId(`commission_paid_${tradeSuccess}`)
        .setLabel('Paid')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

    const commissionUnpaidButton = new ButtonBuilder()
        .setCustomId(`commission_unpaid_${tradeSuccess}`)
        .setLabel('Not Paid')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(commissionPaidButton, commissionUnpaidButton);

    await interaction.editReply({
        content: '**Was the commission paid?**',
        embeds: [],
        components: [row],
    });
}

async function handleCommissionOutcome(interaction, tradeSuccess, commissionPaid) {
    await interaction.deferUpdate();

    // Determine color based on outcome
    let color, statusText, commissionText;

    if (tradeSuccess && commissionPaid) {
        color = 0x57F287; // Green
        statusText = '✅ Successful';
        commissionText = '✅ Paid';
    } else if (tradeSuccess && !commissionPaid) {
        color = 0xFEE75C; // Yellow
        statusText = '✅ Successful';
        commissionText = '❌ Not Paid';
    } else {
        color = 0xED4245; // Red
        statusText = '❌ Unsuccessful';
        commissionText = commissionPaid ? '✅ Paid' : '❌ Not Paid';
    }

    // Get claimed by from channel topic
    const topic = interaction.channel.topic || '';
    const claimedMatch = topic.match(/Claimed by: (.+?) \(/);
    const claimedBy = claimedMatch ? claimedMatch[1] : null;

    // Get ticket type
    const ticketType = getTicketType(interaction.channel.name);

    // Update stats
    updateStats(ticketType, { tradeSuccess, commissionPaid }, claimedBy);

    // Show summary before closing
    const summaryEmbed = new EmbedBuilder()
        .setTitle('📊 Trade Summary')
        .addFields(
            { name: '📈 Trade Status', value: statusText, inline: true },
            { name: '💰 Commission', value: commissionText, inline: true },
        )
        .setColor(color)
        .setDescription('Closing ticket and saving transcript...')
        .setTimestamp();

    await interaction.editReply({
        content: '',
        embeds: [summaryEmbed],
        components: [],
    });

    // Save transcript with trade outcome
    await saveTranscript(interaction.channel, interaction.user, interaction.guild, {
        tradeSuccess,
        commissionPaid,
        color,
        statusText,
        commissionText,
    });

    const closeEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`This ticket has been closed by ${interaction.user}\nThis channel will be deleted in **5 seconds**.`)
        .setColor(color)
        .setTimestamp();

    await interaction.channel.send({ embeds: [closeEmbed] });

    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (err) {
            console.error('Error deleting channel:', err);
        }
    }, 5000);
}

async function handleConfirmClose(interaction) {
    await interaction.deferUpdate();
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);
    const isVendor = interaction.member.roles.cache.has(settings.vendorRoleId);
    const isDeviceVendor = interaction.member.roles.cache.has(settings.deviceVendorRoleId);

    if (!isStaff && !isVendor && !isDeviceVendor) {
        return interaction.editReply({
            content: '❌ Only staff or vendors can close tickets.',
            embeds: [],
            components: [],
        });
    }

    // Get ticket type and update stats
    const ticketType = getTicketType(interaction.channel.name);
    const topic = interaction.channel.topic || '';
    const claimedMatch = topic.match(/Claimed by: (.+?) \(/);
    const claimedBy = claimedMatch ? claimedMatch[1] : null;

    updateStats(ticketType, null, claimedBy);

    await interaction.editReply({
        content: '📄 Saving transcript and closing ticket...',
        embeds: [],
        components: [],
    });

    await saveTranscript(interaction.channel, interaction.user, interaction.guild, null);

    const closeEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`This ticket has been closed by ${interaction.user}\nThis channel will be deleted in **5 seconds**.`)
        .setColor(0xED4245)
        .setTimestamp();

    await interaction.channel.send({ embeds: [closeEmbed] });

    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (err) {
            console.error('Error deleting channel:', err);
        }
    }, 5000);
}

async function handleCancelClose(interaction) {
    await interaction.deferUpdate();
    const cancelEmbed = new EmbedBuilder()
        .setTitle('❌ Cancelled')
        .setDescription('Ticket close has been cancelled.')
        .setColor(0x57F287);

    await interaction.editReply({ embeds: [cancelEmbed], components: [] });
}

module.exports = {
    handleTicketClose,
    handleTradeOutcome,
    handleCommissionOutcome,
    handleConfirmClose,
    handleCancelClose,
    incrementTotalTickets,
};