const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

async function handleSetup(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    // Check if user is admin
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Only administrators can run setup.',
            flags: 64,
        });
    }

    const staffRole = interaction.options.getRole('staffrole');
    const vendorRole = interaction.options.getRole('vendorrole');
    const deviceVendorRole = interaction.options.getRole('devicevendorrole');
    const category = interaction.options.getChannel('category');
    const transcripts = interaction.options.getChannel('transcripts');

    // Validate category channel type
    if (category.type !== 4) {
        return interaction.reply({
            content: '❌ The category must be a **channel category**, not a regular channel.',
            flags: 64,
        });
    }

    // Validate transcript channel type
    if (transcripts.type !== 0) {
        return interaction.reply({
            content: '❌ The transcripts channel must be a regular **text channel**.',
            flags: 64,
        });
    }

    // Save settings
    settings.staffRoleId = staffRole.id;
    settings.vendorRoleId = vendorRole.id;
    settings.deviceVendorRoleId = deviceVendorRole.id;
    settings.ticketCategoryId = category.id;
    settings.transcriptChannelId = transcripts.id;

    fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 4));

    const embed = new EmbedBuilder()
        .setTitle('✅ Bot Setup Complete')
        .addFields(
            { name: '👮 Staff Role', value: `${staffRole}`, inline: true },
            { name: '🏪 Vendor Role', value: `${vendorRole}`, inline: true },
            { name: '📱 Device Vendor Role', value: `${deviceVendorRole}`, inline: true },
            { name: '📁 Ticket Category', value: `${category.name}`, inline: true },
            { name: '📄 Transcript Channel', value: `${transcripts}`, inline: true },
        )
        .setColor(0x57F287)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleAddVendor(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Only administrators can add vendors.',
            flags: 64,
        });
    }

    const user = interaction.options.getUser('user');
    const name = interaction.options.getString('name');

    // Check if vendor already exists
    const exists = settings.vendors.find(v => v.id === user.id);
    if (exists) {
        return interaction.reply({
            content: `❌ ${user} is already a registered vendor.`,
            flags: 64,
        });
    }

    // Add vendor
    settings.vendors.push({ id: user.id, name: name });
    fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 4));

    const embed = new EmbedBuilder()
        .setTitle('✅ Vendor Added')
        .addFields(
            { name: '👤 Vendor', value: `${user}`, inline: true },
            { name: '🏪 Display Name', value: name, inline: true },
        )
        .setColor(0x57F287)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemoveVendor(interaction) {
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));

    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Only administrators can remove vendors.',
            flags: 64,
        });
    }

    const user = interaction.options.getUser('user');

    const vendorIndex = settings.vendors.findIndex(v => v.id === user.id);
    if (vendorIndex === -1) {
        return interaction.reply({
            content: `❌ ${user} is not a registered vendor.`,
            flags: 64,
        });
    }

    settings.vendors.splice(vendorIndex, 1);
    fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 4));

    const embed = new EmbedBuilder()
        .setTitle('✅ Vendor Removed')
        .addFields(
            { name: '👤 Vendor', value: `${user}`, inline: true },
        )
        .setColor(0xED4245)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

module.exports = { handleSetup, handleAddVendor, handleRemoveVendor };