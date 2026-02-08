const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yauzl = require('yauzl');

const PLUGINS_DIR = path.join(__dirname, '../../../plugins');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('Upload a Kyber plugin (.zip or .kbplugin)')
        .addAttachmentOption(option => 
            option.setName('file')
                .setDescription('The plugin file to upload')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Whether the plugin should be enabled upon upload (default: true)')
                .setRequired(false)
        ),
    async execute(interaction) {
        if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
            return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        }

        const attachment = interaction.options.getAttachment('file');
        const isEnabled = interaction.options.getBoolean('enabled') ?? true;
        const uploadName = attachment.name;
        
        // 1. Calculate Target Filename
        let baseName = uploadName;
        if (baseName.endsWith('.zip')) baseName = baseName.slice(0, -4);
        else if (baseName.endsWith('.kbplugin')) baseName = baseName.slice(0, -9);
        else if (baseName.endsWith('.kbplugin.disabled')) baseName = baseName.slice(0, -18);
        else {
            return interaction.reply({ content: `Invalid file type. Please upload a .zip, .kbplugin, or .kbplugin.disabled file.`, ephemeral: true });
        }

        const finalFileName = isEnabled ? `${baseName}.kbplugin` : `${baseName}.kbplugin.disabled`;

        if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
        
        // 2. Conflict Check (Match names regardless of extension/status)
        const existingFiles = fs.readdirSync(PLUGINS_DIR);
        const conflict = existingFiles.find(f => {
            let fBase = f;
            if (f.endsWith('.zip')) fBase = f.slice(0, -4);
            else if (f.endsWith('.kbplugin')) fBase = f.slice(0, -9);
            else if (f.endsWith('.kbplugin.disabled')) fBase = f.slice(0, -18);
            return fBase === baseName;
        });

        if (conflict) {
            const confirm = new ButtonBuilder()
                .setCustomId('confirm_overwrite')
                .setLabel('Overwrite (Danger)')
                .setStyle(ButtonStyle.Danger);
            
            const cancel = new ButtonBuilder()
                .setCustomId('cancel_upload')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirm, cancel);

            const response = await interaction.reply({
                content: `⚠️ **Conflict Detected**: A file named \`${conflict}\` already exists. Your upload will result in \`${finalFileName}\`.\nOverwrite the existing one?`,
                components: [row],
                ephemeral: true
            });

            try {
                const confirmation = await response.awaitMessageComponent({ 
                    filter: i => i.user.id === interaction.user.id, 
                    time: 60000 
                });

                if (confirmation.customId === 'cancel_upload') {
                    return await confirmation.update({ content: '❌ Upload cancelled.', components: [] });
                } else if (confirmation.customId === 'confirm_overwrite') {
                    fs.unlinkSync(path.join(PLUGINS_DIR, conflict));
                    await confirmation.update({ content: `🔄 Overwriting \`${conflict}\`... processing upload...`, components: [] });
                }
            } catch (e) {
                return await interaction.editReply({ content: '⌛ Confirmation timed out. Upload cancelled.', components: [] });
            }
        } else {
             await interaction.deferReply({ ephemeral: true });
        }

        // 3. Download, Validate, and Save
        try {
            const tempPath = path.join(PLUGINS_DIR, `temp_${Date.now()}_${uploadName}`);
            
            const writer = fs.createWriteStream(tempPath);
            const { data } = await axios({
                method: 'get',
                url: attachment.url,
                responseType: 'stream'
            });

            data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // 4. Validate Zip Contents
            const isValid = await validatePluginZip(tempPath);

            if (!isValid) {
                fs.unlinkSync(tempPath);
                return interaction.editReply({ content: '❌ **Invalid Plugin**: `plugin.json` was not found at the root of the file.' });
            }

            // 5. Success - Move to final path
            const finalPath = path.join(PLUGINS_DIR, finalFileName);
            fs.renameSync(tempPath, finalPath);

            await interaction.editReply({ content: `✅ Successfully uploaded \`${finalFileName}\`${isEnabled ? '' : ' (Disabled)'}.` });

        } catch (error) {
            console.error('[Upload] Error:', error);
            await interaction.editReply({ content: `❌ Upload failed: ${error.message}` });
        }
    }
};

function validatePluginZip(filePath) {
    return new Promise((resolve, reject) => {
        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
            if (err) return reject(err);
            
            let found = false;
            zipfile.readEntry();
            
            zipfile.on('entry', (entry) => {
                if (entry.fileName === 'plugin.json') {
                    found = true;
                    zipfile.close();
                    resolve(true);
                } else {
                    zipfile.readEntry();
                }
            });

            zipfile.on('end', () => {
                if (!found) resolve(false);
            });

            zipfile.on('error', (err) => reject(err));
        });
    });
}
