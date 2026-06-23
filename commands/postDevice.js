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

async function handlePostDevice(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const isDeviceVendor = interaction.member.roles.cache.has(settings.deviceVendorRoleId);
    const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);

    if (!isDeviceVendor && !isStaff) {
        return interaction.reply({
            content: '❌ Only device vendors can post device listings.',
            flags: 64,
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('post_device_modal')
        .setTitle('📋 Post a Device');

    const deviceNameInput = new TextInputBuilder()
        .setCustomId('device_name')
        .setLabel('Device Name')
        .setPlaceholder('e.g. iPhone 13, Samsung S22')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const conditionInput = new TextInputBuilder()
        .setCustomId('condition')
        .setLabel('Condition')
        .setPlaceholder('New / Used')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel('Price')
        .setPlaceholder('e.g. N200,000')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const specsInput = new TextInputBuilder()
        .setCustomId('specs')
        .setLabel('Storage/Specs')
        .setPlaceholder('e.g. 128GB, 8GB RAM, iOS 16')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const mediaInput = new TextInputBuilder()
        .setCustomId('media_link')
        .setLabel('Media Link (Discord Message Link)')
        .setPlaceholder('Right click message in video dump → Copy Message Link')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(deviceNameInput),
        new ActionRowBuilder().addComponents(conditionInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(specsInput),
        new ActionRowBuilder().addComponents(mediaInput),
    );

    await interaction.showModal(modal);
}

async function handlePostDeviceModal(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const deviceName = interaction.fields.getTextInputValue('device_name');
    const condition = interaction.fields.getTextInputValue('condition');
    const price = interaction.fields.getTextInputValue('price');
    const specs = interaction.fields.getTextInputValue('specs');
    const mediaLink = interaction.fields.getTextInputValue('media_link') || null;

    const vendorName = interaction.member.displayName || interaction.user.username;

    const listingEmbed = new EmbedBuilder()
        .setTitle('📱 Device For Sale')
        .setImage(BANNER_URL)
        .setDescription(
            `📱 **Device**\n**${deviceName}**\n\n` +
            `✨ **Condition**\n**${condition}**\n\n` +
            `💰 **Price**\n**${price}**\n\n` +
            `⚙️ **Storage/Specs**\n**${specs}**`
        )
        .setColor(0xFEE75C)
        .setFooter({ text: `Posted by ${vendorName} • Harlesh Marketplace Solutions` })
        .setTimestamp();

    const ticketButton = new ButtonBuilder()
        .setCustomId(`open_buy_listing_device_${interaction.user.id}`)
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

    const displayChannel = interaction.guild.channels.cache.get(settings.deviceDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Device display channel not found.',
            flags: 64,
        });
    }

    // Send ping first then listing
    await displayChannel.send({
        content: `<@&${settings.deviceBuyerRoleId}> 📱 New Device listing just dropped!`,
    });

    const publicMessage = await displayChannel.send({
        embeds: [listingEmbed],
        components: [publicRow],
    });

    // Find or create vendor thread
    const vendorChatChannel = interaction.guild.channels.cache.get(settings.vendorChatChannelId);
    if (vendorChatChannel) {
        try {
            await vendorChatChannel.threads.fetchActive();
            let vendorThread = vendorChatChannel.threads.cache.find(
                t => t.name === `📋 ${vendorName} Controls`
            );

            if (!vendorThread) {
                vendorThread = await vendorChatChannel.threads.create({
                    name: `📋 ${vendorName} Controls`,
                    type: ChannelType.PrivateThread,
                    reason: `Vendor controls thread for ${vendorName}`,
                });
                await vendorThread.members.add(interaction.user.id);
                await vendorThread.send({
                    content: `👋 Welcome ${interaction.user}! This is your private vendor control panel. All your listing controls will appear here.`,
                });
            }

            const threadEmbed = new EmbedBuilder()
                .setTitle('📱 New Device Listing Posted!')
                .setDescription(
                    `📱 **Device:** ${deviceName}\n` +
                    `✨ **Condition:** ${condition}\n` +
                    `💰 **Price:** ${price}\n` +
                    `⚙️ **Specs:** ${specs}`
                )
                .setColor(0xFEE75C)
                .setFooter({ text: `Listing ID: ${publicMessage.id}` })
                .setTimestamp();

            const editButton = new ButtonBuilder()
                .setCustomId(`edit_device_${interaction.user.id}_${publicMessage.id}`)
                .setLabel('Edit Listing')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Secondary);

            const soldButton = new ButtonBuilder()
                .setCustomId(`mark_sold_device_${publicMessage.id}`)
                .setLabel('Mark as Sold')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success);

            const vendorRow = new ActionRowBuilder().addComponents(editButton, soldButton);

            await vendorThread.send({
                embeds: [threadEmbed],
                components: [vendorRow],
            });

            await vendorThread.send({
                content: `📸 **Want to add a product photo to this listing?**\nUpload your photo here and I'll add it to your listing automatically!`,
            });

        } catch (err) {
            console.error('Error creating vendor thread:', err);
        }
    }

    await interaction.reply({
        content: `✅ Your device listing has been posted in ${displayChannel}!`,
        flags: 64,
    });
}

async function handleEditDeviceListing(interaction) {
    const parts = interaction.customId.replace('edit_device_', '').split('_');
    const posterId = parts[0];
    const messageId = parts[1];

    if (interaction.user.id !== posterId) {
        return interaction.reply({
            content: '❌ Only the vendor who posted this listing can edit it.',
            flags: 64,
        });
    }

    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
    const displayChannel = interaction.guild.channels.cache.get(settings.deviceDisplayChannelId);

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
        .setCustomId(`edit_device_modal_${messageId}`)
        .setTitle('✏️ Edit Device Listing');

    const deviceNameInput = new TextInputBuilder()
        .setCustomId('device_name')
        .setLabel('Device Name')
        .setValue(extractField('Device', currentDescription))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const conditionInput = new TextInputBuilder()
        .setCustomId('condition')
        .setLabel('Condition')
        .setValue(extractField('Condition', currentDescription))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel('Price')
        .setValue(extractField('Price', currentDescription))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const specsInput = new TextInputBuilder()
        .setCustomId('specs')
        .setLabel('Storage/Specs')
        .setValue(extractField('Storage/Specs', currentDescription))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const mediaInput = new TextInputBuilder()
        .setCustomId('media_link')
        .setLabel('Media Link (Discord Message Link)')
        .setPlaceholder('Right click message in video dump → Copy Message Link')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(deviceNameInput),
        new ActionRowBuilder().addComponents(conditionInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(specsInput),
        new ActionRowBuilder().addComponents(mediaInput),
    );

    await interaction.showModal(modal);
}

async function handleEditDeviceModal(interaction, messageId) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const deviceName = interaction.fields.getTextInputValue('device_name');
    const condition = interaction.fields.getTextInputValue('condition');
    const price = interaction.fields.getTextInputValue('price');
    const specs = interaction.fields.getTextInputValue('specs');
    const mediaLink = interaction.fields.getTextInputValue('media_link') || null;

    const vendorName = interaction.member.displayName || interaction.user.username;

    const displayChannel = interaction.guild.channels.cache.get(settings.deviceDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Device display channel not found.',
            flags: 64,
        });
    }

    try {
        const message = await displayChannel.messages.fetch(messageId);

        const updatedEmbed = new EmbedBuilder()
            .setTitle('📱 Device For Sale')
            .setImage(BANNER_URL)
            .setDescription(
                `📱 **Device**\n**${deviceName}**\n\n` +
                `✨ **Condition**\n**${condition}**\n\n` +
                `💰 **Price**\n**${price}**\n\n` +
                `⚙️ **Storage/Specs**\n**${specs}**`
            )
            .setColor(0xFEE75C)
            .setFooter({ text: `Posted by ${vendorName} • Harlesh Marketplace Solutions • Edited` })
            .setTimestamp();

        const ticketButton = new ButtonBuilder()
            .setCustomId(`open_buy_listing_device_${interaction.user.id}`)
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

async function handleMarkSoldDevice(interaction, messageId) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    const displayChannel = interaction.guild.channels.cache.get(settings.deviceDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Device display channel not found.',
            flags: 64,
        });
    }

    try {
        const message = await displayChannel.messages.fetch(messageId);
        const currentEmbed = message.embeds[0];

        const soldEmbed = new EmbedBuilder()
            .setTitle('🔴 SOLD — Device')
            .setImage(BANNER_URL)
            .setDescription(currentEmbed.description)
            .setColor(0xED4245)
            .setFooter({ text: currentEmbed.footer?.text || 'Harlesh Marketplace Solutions' })
            .setTimestamp();

        const soldRow = new ActionRowBuilder();

        const soldButton = new ButtonBuilder()
            .setCustomId('listing_sold')
            .setLabel('This listing has been sold')
            .setEmoji('🔴')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true);

        soldRow.addComponents(soldButton);

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

async function handlePhotoUploadDevice(message, settings) {
    if (!message.channel.isThread()) return;
    if (!message.attachments.size) return;

    const threadName = message.channel.name;
    if (!threadName.includes('Controls')) return;

    const imageAttachment = message.attachments.find(a =>
        a.contentType && a.contentType.startsWith('image/')
    );
    if (!imageAttachment) return;

    const threadMessages = await message.channel.messages.fetch({ limit: 20 });
    const listingMessage = threadMessages.find(m =>
        m.embeds.length > 0 &&
        m.embeds[0]?.title?.includes('Device') &&
        m.embeds[0]?.footer?.text?.includes('Listing ID:')
    );

    if (!listingMessage) return;

    const listingId = listingMessage.embeds[0].footer.text.replace('Listing ID: ', '');

    const displayChannel = message.guild.channels.cache.get(settings.deviceDisplayChannelId);
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
    handlePostDevice,
    handlePostDeviceModal,
    handleEditDeviceListing,
    handleEditDeviceModal,
    handleMarkSoldDevice,
    handlePhotoUploadDevice,
};