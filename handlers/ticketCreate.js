const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
} = require('discord.js');
const fs = require('fs');

// ---- SHOW BUY PANEL SELECTOR ----
async function showBuySelector(interaction, listingData = null) {
    await interaction.deferReply({ flags: 64 });
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_category')
        .setPlaceholder('What are you looking to buy?')
        .addOptions([
            {
                label: 'Buy a CODM Account',
                description: 'Purchase a CODM account from a vendor',
                value: 'buy_codm',
                emoji: '🛒',
            },
            {
                label: 'Buy a Device',
                description: 'Purchase a mobile device',
                value: 'buy_device',
                emoji: '📱',
            },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.editReply({
        content: '🛒 What are you looking to buy?',
        components: [row],
    });
}

// ---- SHOW SELL PANEL SELECTOR ----
async function showSellSelector(interaction) {
    await interaction.deferReply({ flags: 64 });
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('sell_category')
        .setPlaceholder('What are you looking to sell?')
        .addOptions([
            {
                label: 'Sell a CODM Account',
                description: 'List your CODM account for sale',
                value: 'sell_codm',
                emoji: '💰',
            },
            {
                label: 'Sell a Device',
                description: 'List your device for sale',
                value: 'sell_device',
                emoji: '📱',
            },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.editReply({
        content: '💰 What are you looking to sell?',
        components: [row],
    });
}

// ---- SHOW SUPPORT SELECTOR ----
async function showSupportSelector(interaction) {
    await interaction.deferReply({ flags: 64 });
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('support_category')
        .setPlaceholder('Select a support category...')
        .addOptions([
            {
                label: 'General Support',
                description: 'General questions and help',
                value: 'general_support',
                emoji: '❓',
            },
            {
                label: 'Report a Vendor',
                description: 'Report a scam or bad deal',
                value: 'report_vendor',
                emoji: '🚨',
            },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.editReply({
        content: '❓ What do you need help with?',
        components: [row],
    });
}

// ---- SHOW BUY SELECTOR FROM LISTING ----
async function showBuySelectorFromListing(interaction, listingType, vendorId) {
    await interaction.deferReply({ flags: 64 });

    // Store listing info in a temp way using customId
    const category = listingType === 'account' ? 'buy_codm' : 'buy_device';

    // Get listing embed details
    const listingEmbed = interaction.message.embeds[0];
    const description = listingEmbed?.description || '';
    const vendorName = listingEmbed?.footer?.text?.split('Posted by ')[1]?.split(' •')[0] || 'Unknown Vendor';
    const listingTitle = listingEmbed?.title || 'Listing';
    const messageId = interaction.message.id;
    const channelId = interaction.channelId;

    // Store in a select menu with listing reference
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`buy_from_listing_${listingType}_${vendorId}_${messageId}_${channelId}`)
        .setPlaceholder('Confirm your ticket type...')
        .addOptions([
            {
                label: listingType === 'account' ? 'Buy this CODM Account' : 'Buy this Device',
                description: `Open a ticket for this listing by ${vendorName}`,
                value: category,
                emoji: listingType === 'account' ? '🛒' : '📱',
            },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.editReply({
        content: `📋 Opening a ticket for **${listingTitle}** by **${vendorName}**`,
        components: [row],
    });
}

// ---- SHOW MODAL BASED ON CATEGORY ----
async function showTicketModal(interaction, category) {
    const modals = {
        buy_codm: {
            title: '🛒 Buy a CODM Account',
            fields: [
                { id: 'account_type', label: 'Stacked account or Mid account?', placeholder: 'Stacked / Mid' },
                { id: 'budget', label: 'Budget?', placeholder: 'e.g. N50,000' },
                { id: 'details', label: 'Any additional details?', placeholder: 'Optional extra info' },
            ],
        },
        sell_codm: {
            title: '💰 Sell a CODM Account',
            fields: [
                { id: 'uid', label: 'What is your UID?', placeholder: 'Enter your CODM UID' },
                { id: 'account_type', label: 'Stacked account or Mid account?', placeholder: 'Stacked / Mid' },
                { id: 'price', label: 'Selling Price?', placeholder: 'e.g. N50,000' },
                { id: 'linked', label: 'What is linked to the account?', placeholder: 'e.g. Google, Facebook, Activision' },
                { id: 'logs', label: 'Do you have all logs access?', placeholder: 'Yes / No' },
            ],
        },
        buy_device: {
            title: '📱 Buy a Device',
            fields: [
                { id: 'device', label: 'What device are you looking for?', placeholder: 'e.g. iPhone 13, Samsung S22' },
                { id: 'budget', label: 'What is your budget?', placeholder: 'e.g. N200,000' },
                { id: 'condition', label: 'Preferred condition?', placeholder: 'New / Used / Any' },
                { id: 'location', label: 'What is your location?', placeholder: 'e.g. Lagos, Nigeria' },
                { id: 'details', label: 'Any additional details?', placeholder: 'Optional extra info' },
            ],
        },
        sell_device: {
            title: '📱 Sell a Device',
            fields: [
                { id: 'device', label: 'What device are you selling?', placeholder: 'e.g. iPhone 13, Samsung S22' },
                { id: 'condition', label: 'What is the condition?', placeholder: 'New / Used' },
                { id: 'price', label: 'What is your price?', placeholder: 'e.g. N200,000' },
                { id: 'location', label: 'What is your location?', placeholder: 'e.g. Lagos, Nigeria' },
                { id: 'details', label: 'Any additional details?', placeholder: 'Optional extra info' },
            ],
        },
        general_support: {
            title: '❓ General Support',
            fields: [
                { id: 'issue', label: 'What do you need help with?', placeholder: 'Describe your issue' },
                { id: 'urgency', label: 'How urgent is this?', placeholder: 'Low / Medium / High' },
                { id: 'tried', label: 'Have you tried resolving this yourself?', placeholder: 'Yes / No' },
                { id: 'username', label: 'Your in-game username?', placeholder: 'Enter your username' },
                { id: 'details', label: 'Any additional details?', placeholder: 'Optional extra info' },
            ],
        },
        report_vendor: {
            title: '🚨 Report a Vendor',
            fields: [
                { id: 'vendor_name', label: 'Who are you reporting?', placeholder: 'Vendor name or UID' },
                { id: 'what_happened', label: 'What happened?', placeholder: 'Describe the incident' },
                { id: 'amount', label: 'How much were you scammed?', placeholder: 'e.g. N50,000 or N/A' },
                { id: 'evidence', label: 'Do you have evidence?', placeholder: 'Yes / No - describe evidence' },
                { id: 'date', label: 'When did this happen?', placeholder: 'e.g. Today, Yesterday' },
            ],
        },
    };

    const modalData = modals[category];
    const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${category}`)
        .setTitle(modalData.title);

    modalData.fields.forEach(field => {
        const input = new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setPlaceholder(field.placeholder)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
    });

    await interaction.showModal(modal);
}

// ---- SHOW MODAL FROM LISTING ----
async function showTicketModalFromListing(interaction, category, listingType, vendorId, messageId, channelId) {
    const modals = {
        buy_codm: {
            title: '🛒 Buy a CODM Account',
            fields: [
                { id: 'account_type', label: 'Stacked account or Mid account?', placeholder: 'Stacked / Mid' },
                { id: 'budget', label: 'Budget?', placeholder: 'e.g. N50,000' },
                { id: 'details', label: 'Any additional details?', placeholder: 'Optional extra info' },
            ],
        },
        buy_device: {
            title: '📱 Buy a Device',
            fields: [
                { id: 'device', label: 'What device are you looking for?', placeholder: 'e.g. iPhone 13, Samsung S22' },
                { id: 'budget', label: 'What is your budget?', placeholder: 'e.g. N200,000' },
                { id: 'condition', label: 'Preferred condition?', placeholder: 'New / Used / Any' },
                { id: 'location', label: 'What is your location?', placeholder: 'e.g. Lagos, Nigeria' },
                { id: 'details', label: 'Any additional details?', placeholder: 'Optional extra info' },
            ],
        },
    };

    const modalData = modals[category];
    const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_listing_${category}_${listingType}_${vendorId}_${messageId}_${channelId}`)
        .setTitle(modalData.title);

    modalData.fields.forEach(field => {
        const input = new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setPlaceholder(field.placeholder)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
    });

    await interaction.showModal(modal);
}

// ---- CREATE TICKET CHANNEL ----
async function createTicketChannel(interaction, category, fields, listingReference = null) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const categoryConfig = {
        buy_codm: {
            prefix: 'buy-codm',
            title: '🛒 Buy CODM Account',
            color: 0x5865F2,
            pingRole: settings.vendorRoleId,
        },
        sell_codm: {
            prefix: 'sell-codm',
            title: '💰 Sell CODM Account',
            color: 0x5865F2,
            pingRole: settings.vendorRoleId,
        },
        buy_device: {
            prefix: 'buy-device',
            title: '📱 Buy Device',
            color: 0xFEE75C,
            pingRole: settings.deviceVendorRoleId,
        },
        sell_device: {
            prefix: 'sell-device',
            title: '📱 Sell Device',
            color: 0xFEE75C,
            pingRole: settings.deviceVendorRoleId,
        },
        general_support: {
            prefix: 'support',
            title: '❓ General Support',
            color: 0x57F287,
            pingRole: settings.staffRoleId,
        },
        report_vendor: {
            prefix: 'report',
            title: '🚨 Report a Vendor',
            color: 0xED4245,
            pingRole: settings.staffRoleId,
        },
    };

    const config = categoryConfig[category];
    const channelName = `${config.prefix}-${interaction.user.username.toLowerCase().replace(/\s+/g, '-')}`;

    // Check for existing ticket
    const existing = interaction.guild.channels.cache.find(c => c.name === channelName);
    if (existing) {
        return interaction.reply({
            content: `❌ You already have an open ticket: ${existing}`,
            flags: 64,
        });
    }

    // Permission overwrites
    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            id: interaction.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
            ],
        },
        {
            id: settings.staffRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
            ],
        },
        {
            id: config.pingRole,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
            ],
        },
    ];

    // Add vendor to ticket permissions if from listing
    if (listingReference?.vendorId) {
        permissionOverwrites.push({
            id: listingReference.vendorId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
            ],
        });
    }

    // Create channel
    const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: settings.ticketCategoryId,
        permissionOverwrites,
    });

    // Build fields for embed
    const fieldEntries = Object.entries(fields).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: value || 'N/A',
        inline: true,
    }));

    const ticketEmbed = new EmbedBuilder()
        .setTitle(config.title)
        .setDescription(`Ticket opened by ${interaction.user}\nOur team will be with you shortly!`)
        .addFields(fieldEntries)
        .setColor(config.color)
        .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
        .setTimestamp();

    // Safety warning embed for sales tickets
    const salesCategories = ['buy_codm', 'sell_codm', 'buy_device', 'sell_device'];
    const safetyEmbed = salesCategories.includes(category) ? new EmbedBuilder()
        .setTitle('🔒 Safety & Transaction Policy')
        .setDescription(
            'All transactions, payments and deals must be conducted **within this ticket only.**\n\n' +
            '⚠️ Do not share payment details, send money or finalize any deal outside of this ticket channel.\n\n' +
            '📌 Harlesh Marketplace staff will **never** ask you to pay outside of a ticket.\n\n' +
            '❌ Any losses from deals conducted outside of tickets are **not covered** by our protection policy.'
        )
        .setColor(0xED4245)
        : null;

    // Referenced listing embed
    let referencedEmbed = null;
    if (listingReference) {
        const jumpUrl = `https://discord.com/channels/${interaction.guild.id}/${listingReference.channelId}/${listingReference.messageId}`;
        referencedEmbed = new EmbedBuilder()
            .setTitle('📋 Referenced Listing')
            .setDescription(listingReference.description)
            .addFields(
                { name: '🏪 Posted By', value: listingReference.vendorName, inline: true },
                { name: '🔗 Original Post', value: `[Click to view](${jumpUrl})`, inline: true },
            )
            .setColor(0x2B2D31);
    }

    // Buttons
    const claimButton = new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('Claim Ticket')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success);

    const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

    const pingMessage = listingReference?.vendorId
        ? `${interaction.user} <@&${config.pingRole}> <@${listingReference.vendorId}>`
        : `${interaction.user} <@&${config.pingRole}>`;

    // Build embeds array in order
    const embeds = [];
    if (referencedEmbed) embeds.push(referencedEmbed);
    embeds.push(ticketEmbed);
    if (safetyEmbed) embeds.push(safetyEmbed);

    await ticketChannel.send({
        content: pingMessage,
        embeds,
        components: [row],
    });

    await interaction.reply({
        content: `✅ Your ticket has been created: ${ticketChannel}`,
        flags: 64,
    });
}

module.exports = {
    showBuySelector,
    showSellSelector,
    showSupportSelector,
    showBuySelectorFromListing,
    showTicketModal,
    showTicketModalFromListing,
    createTicketChannel,
};