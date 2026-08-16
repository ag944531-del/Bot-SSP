fx_version 'cerulean'
game 'gta5'

author 'Antigravity Institutional'
description 'Security Bridge - Integração Nativa entre Bot de Segurança Pública Discord e Servidor FiveM'
version '1.0.0'

server_scripts {
    'config.lua',
    'server/authentication.lua',
    'server/players.lua',
    'server/groups.lua',
    'server/permissions.lua',
    'server/police.lua',
    'server/vehicles.lua',
    'server/occurrences.lua',
    'server/logs.lua',
    'server/api.lua',
    'server/main.lua'
}

lua54 'yes'
