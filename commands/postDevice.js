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

    const editButton = new ButtonBuilder()
        .setCustomId(`edit_device_${interaction.user.id}`)
        .setLabel('Edit Listing')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(ticketButton, editButton);

    if (mediaLink) {
        const mediaButton = new ButtonBuilder()
            .setLabel('View Media')
            .setEmoji('📂')
            .setStyle(ButtonStyle.Link)
            .setURL(mediaLink);
        row.addComponents(mediaButton);
    }

    const displayChannel = interaction.guild.channels.cache.get(settings.deviceDisplayChannelId);
    if (!displayChannel) {
        return interaction.reply({
            content: '❌ Device display channel not found. Please check your settings.',
            flags: 64,
        });
    }

    await displayChannel.send({
        embeds: [listingEmbed],
        components: [row],
    });

    await interaction.reply({
        content: `✅ Your device listing has been posted in ${displayChannel}!`,
        flags: 64,
    });
}

async function handleEditDeviceListing(interaction) {
    const posterId = interaction.customId.replace('edit_device_', '');
    if (interaction.user.id !== posterId) {
        return interaction.reply({
            content: '❌ Only the vendor who posted this listing can edit it.',
            flags: 64,
        });
    }

    const currentEmbed = interaction.message.embeds[0];
    const description = currentEmbed?.description || '';

    function extractField(label, text) {
        const regex = new RegExp(`\\*\\*${label}\\*\\*\\n\\*\\*(.+?)\\*\\*`, 's');
        const match = text.match(regex);
        return match ? match[1] : '';
    }

    const modal = new ModalBuilder()
        .setCustomId(`edit_device_modal_${interaction.message.id}`)
        .setTitle('✏️ Edit Device Listing');

    const deviceNameInput = new TextInputBuilder()
        .setCustomId('device_name')
        .setLabel('Device Name')
        .setValue(extractField('Device', description))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const conditionInput = new TextInputBuilder()
        .setCustomId('condition')
        .setLabel('Condition')
        .setValue(extractField('Condition', description))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel('Price')
        .setValue(extractField('Price', description))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const specsInput = new TextInputBuilder()
        .setCustomId('specs')
        .setLabel('Storage/Specs')
        .setValue(extractField('Storage/Specs', description))
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

        const editButton = new ButtonBuilder()
            .setCustomId(`edit_device_${interaction.user.id}`)
            .setLabel('Edit Listing')
            .setEmoji('✏️')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(ticketButton, editButton);

        if (mediaLink) {
            const mediaButton = new ButtonBuilder()
                .setLabel('View Media')
                .setEmoji('📂')
                .setStyle(ButtonStyle.Link)
                .setURL(mediaLink);
            row.addComponents(mediaButton);
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
    handlePostDevice,
    handlePostDeviceModal,
    handleEditDeviceListing,
    handleEditDeviceModal,
};