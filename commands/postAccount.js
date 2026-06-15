const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
} = require('discord.js');
const fs = require('fs');

const BANNER_URL = 'https://cdn.discordapp.com/attachments/1422924818554290327/1515239580528545883/2.jpg?ex=6a2e4853&is=6a2cf6d3&hm=fa97a0a6ef6d7aa47a0f19e694bdb498faf4c5fcebcd892a9ca4d87855db5d5b&';

async function handlePostAccount(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const isVendor = interaction.member.roles.cache.has(settings.vendorRoleId);
    const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);

    if (!isVendor && !isStaff) {
        return interaction.reply({
            content: '❌ Only vendors can post account listings.',
            flags: 64,
        });
    }

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

    const mediaInput = new TextInputBuilder()
        .setCustomId('media_link')
        .setLabel('Media Link (Discord Message Link)')
        .setPlaceholder('Right click message in video dump → Copy Message Link')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(accountTypeInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(linkedInput),
        new ActionRowBuilder().addComponents(detailsInput),
        new ActionRowBuilder().addComponents(mediaInput),
    );

    await interaction.showModal(modal);
}

async function handlePostAccountModal(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const accountType = interaction.fields.getTextInputValue('account_type');
    const price = interaction.fields.getTextInputValue('price');
    const linked = interaction.fields.getTextInputValue('linked');
    const details = interaction.fields.getTextInputValue('details') || 'N/A';
    const mediaLink = interaction.fields.getTextInputValue('media_link') || null;

    const vendorName = interaction.member.displayName || interaction.user.username;

    // Build public listing embed
    const listingEmbed = new EmbedBuilder()
        .setTitle('🛒 CODM Account For Sale')
        .setImage(BANNER_URL)
        .setDescription(
            `📊 **Account Type**\n**${accountType}**\n\n` +
            `💰 **Price**\n**${price}**\n\n` +
            `🔗 **Linked To**\n**${linked}**\n\n` +
            `📝 **Details**\n**${details}**`
        )
        .setColor(0x5865F2)
        .setFooter({ text: `Posted by ${vendorName} • Harlesh Marketplace Solutions` })
        .setTimestamp();

    // Public buttons — no edit, no mark as sold
    const ticketButton = new ButtonBuilder()
        .setCustomId(`open_buy_listing_account_${interaction.user.id}`)
        .setLabel('Open a Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary);

    const publicRow = new ActionRowBuilder().addComponents(ticketButton);

    if (mediaLink) {
        const mediaButton = new ButtonBuilder()
            .setLabel('View Media')
            .setEmoji('📂')
            .setStyle(ButtonStyle.Link)
            .setURL(mediaLink);
        publicRow.addComponents(mediaButton);
    }

    // Send to public display channel
    const displayChannel = interaction.guild.channels.cache.get(settings.accountDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Account display channel not found.',
            flags: 64,
        });
    }

    const publicMessage = await displayChannel.send({
        embeds: [listingEmbed],
        components: [publicRow],
    });

    // Find or create vendor thread in vendor chat
    const vendorChatChannel = interaction.guild.channels.cache.get(settings.vendorChatChannelId);
    if (vendorChatChannel) {
        try {
            // Check for existing vendor thread
            await vendorChatChannel.threads.fetchActive();
            let vendorThread = vendorChatChannel.threads.cache.find(
                t => t.name === `📋 ${vendorName} Controls`
            );

            // Create thread if it doesn't exist
            if (!vendorThread) {
                vendorThread = await vendorChatChannel.threads.create({
                    name: `📋 ${vendorName} Controls`,
                    type: ChannelType.PrivateThread,
                    reason: `Vendor controls thread for ${vendorName}`,
                });
                await vendorThread.members.add(interaction.user.id);

                // Welcome message
                await vendorThread.send({
                    content: `👋 Welcome ${interaction.user}! This is your private vendor control panel. All your listing controls will appear here.`,
                });
            }

            // Thread listing summary embed
            const threadEmbed = new EmbedBuilder()
                .setTitle('🛒 New Account Listing Posted!')
                .setDescription(
                    `📊 **Account Type:** ${accountType}\n` +
                    `💰 **Price:** ${price}\n` +
                    `🔗 **Linked To:** ${linked}\n` +
                    `📝 **Details:** ${details}`
                )
                .setColor(0x5865F2)
                .setFooter({ text: `Listing ID: ${publicMessage.id}` })
                .setTimestamp();

            // Vendor control buttons
            const editButton = new ButtonBuilder()
                .setCustomId(`edit_account_${interaction.user.id}_${publicMessage.id}`)
                .setLabel('Edit Listing')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Secondary);

            const soldButton = new ButtonBuilder()
                .setCustomId(`mark_sold_account_${publicMessage.id}`)
                .setLabel('Mark as Sold')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success);

            const vendorRow = new ActionRowBuilder().addComponents(editButton, soldButton);

            await vendorThread.send({
                embeds: [threadEmbed],
                components: [vendorRow],
            });

            // Photo upload prompt
            await vendorThread.send({
                content: `📸 **Want to add a product photo to this listing?**\nUpload your photo here and I'll add it to your listing automatically!`,
            });

        } catch (err) {
            console.error('Error creating vendor thread:', err);
        }
    }

    await interaction.reply({
        content: `✅ Your account listing has been posted in ${displayChannel}!`,
        flags: 64,
    });
}

async function handleEditAccountListing(interaction) {
    // Extract vendor ID and message ID from customId
    const parts = interaction.customId.replace('edit_account_', '').split('_');
    const posterId = parts[0];
    const messageId = parts[1];

    if (interaction.user.id !== posterId) {
        return interaction.reply({
            content: '❌ Only the vendor who posted this listing can edit it.',
            flags: 64,
        });
    }

    // Fetch current listing to pre-fill form
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
    const displayChannel = interaction.guild.channels.cache.get(settings.accountDisplayChannelId);

    let currentDescription = '';
    try {
        const message = await displayChannel.messages.fetch(messageId);
        currentDescription = message.embeds[0]?.description || '';
    } catch (err) {
        console.error('Error fetching listing:', err);
    }

    function extractField(label, text) {
        const regex = new RegExp(`\\*\\*${label}\\*\\*\\n\\*\\*(.+?)\\*\\*`, 's');
        const match = text.match(regex);
        return match ? match[1] : '';
    }

    const modal = new ModalBuilder()
        .setCustomId(`edit_account_modal_${messageId}`)
        .setTitle('✏️ Edit Account Listing');

    const accountTypeInput = new TextInputBuilder()
        .setCustomId('account_type')
        .setLabel('Account Type')
        .setValue(extractField('Account Type', currentDescription))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel('Price')
        .setValue(extractField('Price', currentDescription))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const linkedInput = new TextInputBuilder()
        .setCustomId('linked')
        .setLabel('What is linked to the account?')
        .setValue(extractField('Linked To', currentDescription))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const detailsInput = new TextInputBuilder()
        .setCustomId('details')
        .setLabel('Additional Details')
        .setValue(extractField('Details', currentDescription))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const mediaInput = new TextInputBuilder()
        .setCustomId('media_link')
        .setLabel('Media Link (Discord Message Link)')
        .setPlaceholder('Right click message in video dump → Copy Message Link')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(accountTypeInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(linkedInput),
        new ActionRowBuilder().addComponents(detailsInput),
        new ActionRowBuilder().addComponents(mediaInput),
    );

    await interaction.showModal(modal);
}

async function handleEditAccountModal(interaction, messageId) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const accountType = interaction.fields.getTextInputValue('account_type');
    const price = interaction.fields.getTextInputValue('price');
    const linked = interaction.fields.getTextInputValue('linked');
    const details = interaction.fields.getTextInputValue('details') || 'N/A';
    const mediaLink = interaction.fields.getTextInputValue('media_link') || null;

    const vendorName = interaction.member.displayName || interaction.user.username;

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
            .setImage(BANNER_URL)
            .setDescription(
                `📊 **Account Type**\n**${accountType}**\n\n` +
                `💰 **Price**\n**${price}**\n\n` +
                `🔗 **Linked To**\n**${linked}**\n\n` +
                `📝 **Details**\n**${details}**`
            )
            .setColor(0x5865F2)
            .setFooter({ text: `Posted by ${vendorName} • Harlesh Marketplace Solutions • Edited` })
            .setTimestamp();

        const ticketButton = new ButtonBuilder()
            .setCustomId(`open_buy_listing_account_${interaction.user.id}`)
            .setLabel('Open a Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary);

        const publicRow = new ActionRowBuilder().addComponents(ticketButton);

        if (mediaLink) {
            const mediaButton = new ButtonBuilder()
                .setLabel('View Media')
                .setEmoji('📂')
                .setStyle(ButtonStyle.Link)
                .setURL(mediaLink);
            publicRow.addComponents(mediaButton);
        }

        await message.edit({ embeds: [updatedEmbed], components: [publicRow] });

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

async function handleMarkSoldAccount(interaction, messageId) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const displayChannel = interaction.guild.channels.cache.get(settings.accountDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Account display channel not found.',
            flags: 64,
        });
    }

    try {
        const message = await displayChannel.messages.fetch(messageId);
        const currentEmbed = message.embeds[0];

        // Update embed to show SOLD
        const soldEmbed = new EmbedBuilder()
            .setTitle('🔴 SOLD — CODM Account')
            .setImage(BANNER_URL)
            .setDescription(currentEmbed.description)
            .setColor(0xED4245)
            .setFooter({ text: currentEmbed.footer?.text || 'Harlesh Marketplace Solutions' })
            .setTimestamp();

        // Remove ticket button, keep media if exists
        const soldRow = new ActionRowBuilder();

        const soldButton = new ButtonBuilder()
            .setCustomId('listing_sold')
            .setLabel('This listing has been sold')
            .setEmoji('🔴')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true);

        soldRow.addComponents(soldButton);

        // Keep media button if it exists
        const mediaButton = message.components[0]?.components?.find(c => c.label === 'View Media');
        if (mediaButton) {
            const newMediaButton = new ButtonBuilder()
                .setLabel('View Media')
                .setEmoji('📂')
                .setStyle(ButtonStyle.Link)
                .setURL(mediaButton.url);
            soldRow.addComponents(newMediaButton);
        }

        await message.edit({ embeds: [soldEmbed], components: [soldRow] });

        // Update thread message
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('✅ Listing Marked as Sold!')
                    .setDescription('Your listing has been marked as sold and updated in the marketplace.')
                    .setColor(0x57F287)
                    .setTimestamp()
            ],
            components: [],
        });

    } catch (err) {
        console.error('Error marking as sold:', err);
        await interaction.reply({
            content: '❌ Could not find the original listing.',
            flags: 64,
        });
    }
}

async function handlePhotoUpload(message, settings) {
    // Check if message is in a vendor thread
    if (!message.channel.isThread()) return;
    if (!message.attachments.size) return;

    const threadName = message.channel.name;
    if (!threadName.includes('Controls')) return;

    // Check if attachment is an image
    const imageAttachment = message.attachments.find(a =>
        a.contentType && a.contentType.startsWith('image/')
    );
    if (!imageAttachment) return;

    // Find the most recent listing message in the thread
    const threadMessages = await message.channel.messages.fetch({ limit: 20 });
    const listingMessage = threadMessages.find(m =>
        m.embeds.length > 0 &&
        m.embeds[0]?.footer?.text?.includes('Listing ID:')
    );

    if (!listingMessage) return;

    const listingId = listingMessage.embeds[0].footer.text.replace('Listing ID: ', '');

    // Find listing in display channel
    const displayChannel = message.guild.channels.cache.get(settings.accountDisplayChannelId);
    if (!displayChannel) return;

    try {
        const publicMessage = await displayChannel.messages.fetch(listingId);
        const currentEmbed = publicMessage.embeds[0];

        const updatedEmbed = EmbedBuilder.from(currentEmbed)
            .setThumbnail(imageAttachment.url);

        await publicMessage.edit({ embeds: [updatedEmbed] });

        await message.reply({
            content: '✅ Photo added to your listing successfully!',
        });

    } catch (err) {
        console.error('Error adding photo:', err);
    }
}

module.exports = {
    handlePostAccount,
    handlePostAccountModal,
    handleEditAccountListing,
    handleEditAccountModal,
    handleMarkSoldAccount,
    handlePhotoUpload,
};