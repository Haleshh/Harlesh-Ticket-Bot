const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { saveTranscript } = require('./transcript');
const fs = require('fs');

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

    const confirmEmbed = new EmbedBuilder()
        .setTitle('🔒 Close Ticket')
        .setDescription('Are you sure you want to close this ticket?\nA transcript will be saved automatically.')
        .setColor(0xED4245);

    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_close')
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

    await saveTranscript(interaction.channel, interaction.user, interaction.guild);

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

module.exports = { handleTicketClose, handleConfirmClose, handleCancelClose };