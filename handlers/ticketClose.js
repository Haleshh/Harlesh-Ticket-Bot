const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { saveTranscript } = require('./transcript');
const fs = require('fs');

const salesCategories = ['buy-codm', 'sell-codm', 'buy-device', 'sell-device'];

function isSalesTicket(channelName) {
    return salesCategories.some(prefix => channelName.startsWith(prefix));
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
};