const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');

async function handleTicketClaim(interaction) {
    await interaction.deferReply({ flags: 64 });
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);
    const isVendor = interaction.member.roles.cache.has(settings.vendorRoleId);
    const isDeviceVendor = interaction.member.roles.cache.has(settings.deviceVendorRoleId);

    const channelName = interaction.channel.name;
    const isCODMTicket = channelName.startsWith('buy-codm') || channelName.startsWith('sell-codm');
    const isDeviceTicket = channelName.startsWith('buy-device') || channelName.startsWith('sell-device');
    const isGeneralTicket = channelName.startsWith('support') || channelName.startsWith('report');

    if (isCODMTicket && !isVendor && !isStaff) {
        return interaction.editReply({
            content: '❌ Only CODM Vendors or Staff can claim this ticket.',
        });
    }

    if (isDeviceTicket && !isDeviceVendor && !isStaff) {
        return interaction.editReply({
            content: '❌ Only Device Vendors or Staff can claim this ticket.',
        });
    }

    if (isGeneralTicket && !isStaff) {
        return interaction.editReply({
            content: '❌ Only Staff can claim this ticket.',
        });
    }

    const topic = interaction.channel.topic;
    if (topic && topic.includes('Claimed by:')) {
        return interaction.editReply({
            content: '❌ This ticket has already been claimed.',
        });
    }

    await interaction.channel.setTopic(`Claimed by: ${interaction.user.tag} (${interaction.user.id})`);

    const claimEmbed = new EmbedBuilder()
        .setTitle('✅ Ticket Claimed')
        .setDescription(`This ticket has been claimed by ${interaction.user}\nThey will assist you shortly!`)
        .setColor(0x57F287)
        .setTimestamp();

    const claimButton = new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel(`Claimed by ${interaction.user.username}`)
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);

    const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

    await interaction.editReply({ embeds: [claimEmbed] });

    try {
        const messages = await interaction.channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(m => m.author.bot && m.components.length > 0);
        if (botMessage) {
            await botMessage.edit({ components: [row] });
        }
    } catch (err) {
        console.error('Error updating buttons:', err);
    }
}

module.exports = { handleTicketClaim };