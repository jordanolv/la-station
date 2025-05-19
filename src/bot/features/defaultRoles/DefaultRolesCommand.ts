import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { DefaultRolesService } from '../../services/DefaultRolesService';

export const data = new SlashCommandBuilder()
    .setName('defaultroles')
    .setDescription('Configure les rôles par défaut pour les nouveaux membres')
    .addSubcommand(subcommand =>
        subcommand
            .setName('set')
            .setDescription('Définit les rôles par défaut')
            .addRoleOption(option =>
                option
                    .setName('role1')
                    .setDescription('Premier rôle à attribuer')
                    .setRequired(true)
            )
            .addRoleOption(option =>
                option
                    .setName('role2')
                    .setDescription('Deuxième rôle à attribuer')
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName('role3')
                    .setDescription('Troisième rôle à attribuer')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Active ou désactive l\'attribution automatique des rôles')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('view')
            .setDescription('Affiche la configuration actuelle des rôles par défaut')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction: CommandInteraction) {
    const service = DefaultRolesService.getInstance();
    const subcommand = interaction.options.getSubcommand();

    try {
        switch (subcommand) {
            case 'set': {
                const roles = [
                    interaction.options.getRole('role1'),
                    interaction.options.getRole('role2'),
                    interaction.options.getRole('role3')
                ].filter(role => role !== null).map(role => role!.id);

                await service.setConfig(interaction.guildId!, roles);
                await interaction.reply({
                    content: `✅ Configuration mise à jour ! Les nouveaux membres recevront les rôles suivants : ${roles.map(id => `<@&${id}>`).join(', ')}`,
                    ephemeral: true
                });
                break;
            }
            case 'toggle': {
                const config = await service.toggleConfig(interaction.guildId!);
                await interaction.reply({
                    content: `✅ L'attribution automatique des rôles est maintenant ${config.enabled ? 'activée' : 'désactivée'}`,
                    ephemeral: true
                });
                break;
            }
            case 'view': {
                const config = await service.getConfig(interaction.guildId!);
                if (!config) {
                    await interaction.reply({
                        content: '❌ Aucune configuration trouvée pour ce serveur.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.reply({
                    content: `📋 Configuration actuelle :\nRôles : ${config.roleIds.map(id => `<@&${id}>`).join(', ')}\nStatut : ${config.enabled ? 'Activé' : 'Désactivé'}`,
                    ephemeral: true
                });
                break;
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande defaultroles:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
            ephemeral: true
        });
    }
} 