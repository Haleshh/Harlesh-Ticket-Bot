const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./configs');

const commands = [
    {
        name: 'setup',
        description: 'Configure the ticket bot settings',
        options: [
            {
                name: 'staffrole',
                description: 'The role for staff/admin team',
                type: 8,
                required: true,
            },
            {
                name: 'vendorrole',
                description: 'The role for CODM account vendors',
                type: 8,
                required: true,
            },
            {
                name: 'devicevendorrole',
                description: 'The role for device vendors',
                type: 8,
                required: true,
            },
            {
                name: 'category',
                description: 'The category where ticket channels will be created',
                type: 7,
                required: true,
            },
            {
                name: 'transcripts',
                description: 'The channel where ticket transcripts will be saved',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'panel',
        description: 'Send the appropriate ticket panel to this channel',
        options: [
            {
                name: 'type',
                description: 'Which panel to send?',
                type: 3,
                required: true,
                choices: [
                    { name: '🛒 Buy an Account', value: 'buy' },
                    { name: '💰 Sell an Account', value: 'sell' },
                    { name: '❓ General Support', value: 'support' },
                ],
            },
        ],
    },
    {
        name: 'add-vendor',
        description: 'Add a vendor to the vendor list',
        options: [
            {
                name: 'user',
                description: 'The vendor to add',
                type: 6,
                required: true,
            },
            {
                name: 'name',
                description: 'Display name for the vendor',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'remove-vendor',
        description: 'Remove a vendor from the vendor list',
        options: [
            {
                name: 'user',
                description: 'The vendor to remove',
                type: 6,
                required: true,
            },
        ],
    },
    {
        name: 'add-user',
        description: 'Add a user to the current ticket',
        options: [
            {
                name: 'user',
                description: 'The user to add',
                type: 6,
                required: true,
            },
        ],
    },
    {
        name: 'remove-user',
        description: 'Remove a user from the current ticket',
        options: [
            {
                name: 'user',
                description: 'The user to remove',
                type: 6,
                required: true,
            },
        ],
    },
    {
        name: 'stats',
        description: 'View the Harlesh Marketplace dashboard and statistics',
    },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error(error);
    }
})();