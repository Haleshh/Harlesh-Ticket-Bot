const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} = require('discord.js');
const { token } = require('./configs');
const { handleSetup, handleAddVendor, handleRemoveVendor } = require('./commands/setup');
const { handleStats } = require('./commands/stats');
const {
    handlePostAccount,
    handlePostAccountModal,
    handleEditAccountListing,
    handleEditAccountModal,
} = require('./commands/postAccount');
const {
    handlePostDevice,
    handlePostDeviceModal,
    handleEditDeviceListing,
    handleEditDeviceModal,
} = require('./commands/postDevice');
const {
    showBuySelector,
    showSellSelector,
    showSupportSelector,
    showTicketModal,
    createTicketChannel,
} = require('./handlers/ticketCreate');
const { handleTicketClaim } = require('./handlers/ticketClaim');
const {
    handleTicketClose,
    handleTradeOutcome,
    handleCommissionOutcome,
    handleConfirmClose,
    handleCancelClose,
    incrementTotalTickets,
} = require('./handlers/ticketClose');
const fs = require('fs');

const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running!');
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// ---- BOT READY ----
client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('🎫 Managing Tickets', { type: 3 });
});

// ---- INTERACTIONS ----
client.on('interactionCreate', async (interaction) => {
    try {

        // ---- SLASH COMMANDS ----
        if (interaction.isChatInputCommand()) {

            // SETUP
            if (interaction.commandName === 'setup') {
                return handleSetup(interaction);
            }

            // STATS
            if (interaction.commandName === 'stats') {
                return handleStats(interaction);
            }

            // POST ACCOUNT
            if (interaction.commandName === 'post-account') {
                return handlePostAccount(interaction);
            }

            // POST DEVICE
            if (interaction.commandName === 'post-device') {
                return handlePostDevice(interaction);
            }

            // PANEL
            if (interaction.commandName === 'panel') {
                const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

                if (!interaction.member.permissions.has('Administrator')) {
                    return interaction.reply({
                        content: '❌ Only administrators can send the panel.',
                        flags: 64,
                    });
                }

                if (!settings.staffRoleId || !settings.vendorRoleId || !settings.deviceVendorRoleId || !settings.ticketCategoryId || !settings.transcriptChannelId) {
                    return interaction.reply({
                        content: '❌ Please run `/setup` first before sending the panel.',
                        flags: 64,
                    });
                }

                const panelType = interaction.options.getString('type');

                const panels = {
                    buy: {
                        title: '🛒 Buy on the Marketplace',
                        description: 'Looking to buy a CODM account or device?\nClick the button below to open a ticket and a vendor will assist you!',
                        color: 0x5865F2,
                        buttonId: 'open_buy',
                        buttonLabel: 'Open a Buy Ticket',
                        buttonEmoji: '🛒',
                    },
                    sell: {
                        title: '💰 Sell on the Marketplace',
                        description: 'Looking to sell your CODM account or device?\nClick the button below to open a ticket and get started!',
                        color: 0x57F287,
                        buttonId: 'open_sell',
                        buttonLabel: 'Open a Sell Ticket',
                        buttonEmoji: '💰',
                    },
                    support: {
                        title: '❓ Support & Reports',
                        description: 'Need help or want to report a vendor?\nClick the button below and our staff will assist you!',
                        color: 0xED4245,
                        buttonId: 'open_support',
                        buttonLabel: 'Open a Support Ticket',
                        buttonEmoji: '❓',
                    },
                };

                const panel = panels[panelType];

                const panelEmbed = new EmbedBuilder()
                    .setTitle(panel.title)
                    .setDescription(panel.description)
                    .setColor(panel.color)
                    .setFooter({ text: 'Harlesh CODM Marketplace • Ticket System' })
                    .setTimestamp();

                const openButton = new ButtonBuilder()
                    .setCustomId(panel.buttonId)
                    .setLabel(panel.buttonLabel)
                    .setEmoji(panel.buttonEmoji)
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(openButton);

                await interaction.reply({ content: '✅ Panel sent!', flags: 64 });
                await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
            }

            // ADD VENDOR
            if (interaction.commandName === 'add-vendor') {
                return handleAddVendor(interaction);
            }

            // REMOVE VENDOR
            if (interaction.commandName === 'remove-vendor') {
                return handleRemoveVendor(interaction);
            }

            // ADD USER
            if (interaction.commandName === 'add-user') {
                const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
                const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);
                const isVendor = interaction.member.roles.cache.has(settings.vendorRoleId);
                const isDeviceVendor = interaction.member.roles.cache.has(settings.deviceVendorRoleId);

                if (!isStaff && !isVendor && !isDeviceVendor) {
                    return interaction.reply({ content: '❌ Only staff or vendors can use this.', flags: 64 });
                }
                const user = interaction.options.getUser('user');
                await interaction.channel.permissionOverwrites.edit(user, {
                    ViewChannel: true,
                    SendMessages: true,
                    AttachFiles: true,
                });
                const embed = new EmbedBuilder()
                    .setDescription(`✅ ${user} has been added to the ticket.`)
                    .setColor(0x57F287);
                return interaction.reply({ embeds: [embed] });
            }

            // REMOVE USER
            if (interaction.commandName === 'remove-user') {
                const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
                const isStaff = interaction.member.roles.cache.has(settings.staffRoleId);
                const isVendor = interaction.member.roles.cache.has(settings.vendorRoleId);
                const isDeviceVendor = interaction.member.roles.cache.has(settings.deviceVendorRoleId);

                if (!isStaff && !isVendor && !isDeviceVendor) {
                    return interaction.reply({ content: '❌ Only staff or vendors can use this.', flags: 64 });
                }
                const user = interaction.options.getUser('user');
                await interaction.channel.permissionOverwrites.edit(user, {
                    ViewChannel: false,
                    SendMessages: false,
                });
                const embed = new EmbedBuilder()
                    .setDescription(`✅ ${user} has been removed from the ticket.`)
                    .setColor(0xED4245);
                return interaction.reply({ embeds: [embed] });
            }
        }

        // ---- BUTTONS ----
        if (interaction.isButton()) {

            // OPEN BUY TICKET
            if (interaction.customId === 'open_buy') {
                incrementTotalTickets();
                return showBuySelector(interaction);
            }

            // OPEN SELL TICKET
            if (interaction.customId === 'open_sell') {
                incrementTotalTickets();
                return showSellSelector(interaction);
            }

            // OPEN SUPPORT TICKET
            if (interaction.customId === 'open_support') {
                incrementTotalTickets();
                return showSupportSelector(interaction);
            }

            // CLAIM TICKET
            if (interaction.customId === 'claim_ticket') {
                return handleTicketClaim(interaction);
            }

            // CLOSE TICKET
            if (interaction.customId === 'close_ticket') {
                return handleTicketClose(interaction);
            }

            // TRADE OUTCOME BUTTONS
            if (interaction.customId === 'trade_successful') {
                return handleTradeOutcome(interaction, true);
            }

            if (interaction.customId === 'trade_unsuccessful') {
                return handleTradeOutcome(interaction, false);
            }

            // COMMISSION OUTCOME BUTTONS
            if (interaction.customId.startsWith('commission_paid_')) {
                const tradeSuccess = interaction.customId === 'commission_paid_true';
                return handleCommissionOutcome(interaction, tradeSuccess, true);
            }

            if (interaction.customId.startsWith('commission_unpaid_')) {
                const tradeSuccess = interaction.customId === 'commission_unpaid_true';
                return handleCommissionOutcome(interaction, tradeSuccess, false);
            }

            // CONFIRM CLOSE (non-sales tickets)
            if (interaction.customId === 'confirm_close_no_trade') {
                return handleConfirmClose(interaction);
            }

            // CANCEL CLOSE
            if (interaction.customId === 'cancel_close') {
                return handleCancelClose(interaction);
            }

            // EDIT ACCOUNT LISTING
            if (interaction.customId.startsWith('edit_account_')) {
                return handleEditAccountListing(interaction);
            }

            // EDIT DEVICE LISTING
            if (interaction.customId.startsWith('edit_device_')) {
                return handleEditDeviceListing(interaction);
            }
        }

        // ---- SELECT MENUS ----
        if (interaction.isStringSelectMenu()) {

            // BUY CATEGORY
            if (interaction.customId === 'buy_category') {
                const category = interaction.values[0];
                return showTicketModal(interaction, category);
            }

            // SELL CATEGORY
            if (interaction.customId === 'sell_category') {
                const category = interaction.values[0];
                return showTicketModal(interaction, category);
            }

            // SUPPORT CATEGORY
            if (interaction.customId === 'support_category') {
                const category = interaction.values[0];
                return showTicketModal(interaction, category);
            }
        }

        // ---- MODALS ----
        if (interaction.isModalSubmit()) {
            const customId = interaction.customId;

            // POST ACCOUNT MODAL
            if (customId === 'post_account_modal') {
                return handlePostAccountModal(interaction);
            }

            // POST DEVICE MODAL
            if (customId === 'post_device_modal') {
                return handlePostDeviceModal(interaction);
            }

            // EDIT ACCOUNT MODAL
            if (customId.startsWith('edit_account_modal_')) {
                const messageId = customId.replace('edit_account_modal_', '');
                return handleEditAccountModal(interaction, messageId);
            }

            // EDIT DEVICE MODAL
            if (customId.startsWith('edit_device_modal_')) {
                const messageId = customId.replace('edit_device_modal_', '');
                return handleEditDeviceModal(interaction, messageId);
            }

            // TICKET MODALS
            if (customId.startsWith('ticket_modal_')) {
                const category = customId.replace('ticket_modal_', '');
                const fields = {};
                interaction.fields.fields.forEach((field) => {
                    fields[field.customId] = field.value;
                });
                return createTicketChannel(interaction, category, fields);
            }
        }

    } catch (error) {
        console.error('Interaction error:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred. Please try again.',
                    flags: 64,
                });
            }
        } catch (e) {
            console.error('Error reply failed:', e);
        }
    }
});

client.login(token);