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

    const ticketButton = new ButtonBuilder()
        .setCustomId(`open_buy_listing_account_${interaction.user.id}`)
        .setLabel('Open a Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary);

    const editButton = new ButtonBuilder()
        .setCustomId(`edit_account_${interaction.user.id}`)
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
    const posterId = interaction.customId.replace('edit_account_', '');
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
        .setCustomId(`edit_account_modal_${interaction.message.id}`)
        .setTitle('✏️ Edit Account Listing');

    const accountTypeInput = new TextInputBuilder()
        .setCustomId('account_type')
        .setLabel('Account Type')
        .setValue(extractField('Account Type', description))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel('Price')
        .setValue(extractField('Price', description))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const linkedInput = new TextInputBuilder()
        .setCustomId('linked')
        .setLabel('What is linked to the account?')
        .setValue(extractField('Linked To', description))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const detailsInput = new TextInputBuilder()
        .setCustomId('details')
        .setLabel('Additional Details')
        .setValue(extractField('Details', description))
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

        const editButton = new ButtonBuilder()
            .setCustomId(`edit_account_${interaction.user.id}`)
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
    handlePostAccount,
    handlePostAccountModal,
    handleEditAccountListing,
    handleEditAccountModal,
};