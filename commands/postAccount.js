const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const fs = require('fs');

async function handlePostAccount(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    // Check if user is a vendor
    const isVendor = interaction.member.roles.cache.has(settings.vendorRoleId);
    const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);

    if (!isVendor && !isStaff) {
        return interaction.reply({
            content: '❌ Only vendors can post account listings.',
            flags: 64,
        });
    }

    // Show modal
    const modal = new ModalBuilder()
        .setCustomId('post_account_modal')
        .setTitle('📋 Post a CODM Account');

    const accountTypeInput = new TextInputBuilder()
        .setCustomId('account_type')
        .setLabel('Account Type')
        .setPlaceholder('Stacked / Mid')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel('Price')
        .setPlaceholder('e.g. N50,000')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const linkedInput = new TextInputBuilder()
        .setCustomId('linked')
        .setLabel('What is linked to the account?')
        .setPlaceholder('e.g. Google, Facebook, Activision')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const detailsInput = new TextInputBuilder()
        .setCustomId('details')
        .setLabel('Additional Details')
        .setPlaceholder('Any extra info about the account')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const videoInput = new TextInputBuilder()
        .setCustomId('video_url')
        .setLabel('Video URL')
        .setPlaceholder('Paste Discord CDN or video link here')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(accountTypeInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(linkedInput),
        new ActionRowBuilder().addComponents(detailsInput),
        new ActionRowBuilder().addComponents(videoInput),
    );

    await interaction.showModal(modal);
}

async function handlePostAccountModal(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const accountType = interaction.fields.getTextInputValue('account_type');
    const price = interaction.fields.getTextInputValue('price');
    const linked = interaction.fields.getTextInputValue('linked');
    const details = interaction.fields.getTextInputValue('details') || 'N/A';
    const videoUrl = interaction.fields.getTextInputValue('video_url') || null;

    const vendorName = interaction.member.displayName || interaction.user.username;

    const listingEmbed = new EmbedBuilder()
        .setTitle('🛒 CODM Account For Sale')
        .addFields(
            { name: '📊 Account Type', value: accountType, inline: true },
            { name: '💰 Price', value: price, inline: true },
            { name: '🔗 Linked To', value: linked, inline: true },
            { name: '📝 Details', value: details, inline: false },
        )
        .setColor(0x5865F2)
        .setFooter({ text: `Posted by ${vendorName} • Harlesh Marketplace Solutions` })
        .setTimestamp();

    // Buttons
    const ticketButton = new ButtonBuilder()
        .setCustomId('open_buy')
        .setLabel('Open a Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary);

    const editButton = new ButtonBuilder()
        .setCustomId(`edit_account_${interaction.user.id}`)
        .setLabel('Edit Listing')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(ticketButton, editButton);

    // Add video button if URL provided
    if (videoUrl) {
        const videoButton = new ButtonBuilder()
            .setLabel('View Video')
            .setEmoji('🎥')
            .setStyle(ButtonStyle.Link)
            .setURL(videoUrl);

        row.addComponents(videoButton);
    }

    // Send to account display channel
    const displayChannel = interaction.guild.channels.cache.get(settings.accountDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Account display channel not found. Please check your settings.',
            flags: 64,
        });
    }

    await displayChannel.send({
        embeds: [listingEmbed],
        components: [row],
    });

    await interaction.reply({
        content: `✅ Your account listing has been posted in ${displayChannel}!`,
        flags: 64,
    });
}

async function handleEditAccountListing(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    // Check if the user is the one who posted
    const posterId = interaction.customId.replace('edit_account_', '');
    if (interaction.user.id !== posterId) {
        return interaction.reply({
            content: '❌ Only the vendor who posted this listing can edit it.',
            flags: 64,
        });
    }

    // Get current embed values
    const currentEmbed = interaction.message.embeds[0];
    const currentFields = currentEmbed?.fields || [];

    const getField = (name) => currentFields.find(f => f.name === name)?.value || '';

    // Show edit modal with current values
    const modal = new ModalBuilder()
        .setCustomId(`edit_account_modal_${interaction.message.id}`)
        .setTitle('✏️ Edit Account Listing');

    const accountTypeInput = new TextInputBuilder()
        .setCustomId('account_type')
        .setLabel('Account Type')
        .setValue(getField('📊 Account Type'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel('Price')
        .setValue(getField('💰 Price'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const linkedInput = new TextInputBuilder()
        .setCustomId('linked')
        .setLabel('What is linked to the account?')
        .setValue(getField('🔗 Linked To'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const detailsInput = new TextInputBuilder()
        .setCustomId('details')
        .setLabel('Additional Details')
        .setValue(getField('📝 Details'))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const videoInput = new TextInputBuilder()
        .setCustomId('video_url')
        .setLabel('Video URL')
        .setPlaceholder('Paste Discord CDN or video link here')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(accountTypeInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(linkedInput),
        new ActionRowBuilder().addComponents(detailsInput),
        new ActionRowBuilder().addComponents(videoInput),
    );

    await interaction.showModal(modal);
}

async function handleEditAccountModal(interaction, messageId) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const accountType = interaction.fields.getTextInputValue('account_type');
    const price = interaction.fields.getTextInputValue('price');
    const linked = interaction.fields.getTextInputValue('linked');
    const details = interaction.fields.getTextInputValue('details') || 'N/A';
    const videoUrl = interaction.fields.getTextInputValue('video_url') || null;

    const vendorName = interaction.member.displayName || interaction.user.username;

    // Find and edit the original message
    const displayChannel = interaction.guild.channels.cache.get(settings.accountDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Account display channel not found.',
            flags: 64,
        });
    }

    try {
        const message = await displayChannel.messages.fetch(messageId);

        const updatedEmbed = new EmbedBuilder()
            .setTitle('🛒 CODM Account For Sale')
            .addFields(
                { name: '📊 Account Type', value: accountType, inline: true },
                { name: '💰 Price', value: price, inline: true },
                { name: '🔗 Linked To', value: linked, inline: true },
                { name: '📝 Details', value: details, inline: false },
            )
            .setColor(0x5865F2)
            .setFooter({ text: `Posted by ${vendorName} • Harlesh Marketplace Solutions • Edited` })
            .setTimestamp();

        const ticketButton = new ButtonBuilder()
            .setCustomId('open_buy')
            .setLabel('Open a Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary);

        const editButton = new ButtonBuilder()
            .setCustomId(`edit_account_${interaction.user.id}`)
            .setLabel('Edit Listing')
            .setEmoji('✏️')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(ticketButton, editButton);

        if (videoUrl) {
            const videoButton = new ButtonBuilder()
                .setLabel('View Video')
                .setEmoji('🎥')
                .setStyle(ButtonStyle.Link)
                .setURL(videoUrl);

            row.addComponents(videoButton);
        }

        await message.edit({ embeds: [updatedEmbed], components: [row] });

        await interaction.reply({
            content: '✅ Your listing has been updated!',
            flags: 64,
        });

    } catch (err) {
        console.error('Error editing listing:', err);
        await interaction.reply({
            content: '❌ Could not find the original listing to edit.',
            flags: 64,
        });
    }
}

module.exports = {
    handlePostAccount,
    handlePostAccountModal,
    handleEditAccountListing,
    handleEditAccountModal,
};