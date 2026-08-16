Config = {}

-- Chave secreta de autenticação compartilhada com o Bot (Definir também no .env do Bot: FIVEM_API_KEY)
Config.ApiKey = "CHAVE_SECRETA_INSTITUCIONAL_SSP_FIVEM_2026"

-- Framework da cidade: "vrp", "creative", "qbcore", "esx" ou "custom"
Config.Framework = "vrp"

-- Tempo máximo de validade da assinatura de requisição em segundos (Prevenção de Replay)
Config.RequestTimeoutSeconds = 30

-- Configuração de Tabelas e Colunas no Banco FiveM (vRP/Creative/Custom)
Config.Database = {
    UsersTable = "vrp_users",
    IdentitiesTable = "vrp_user_identities",
    UserDataTable = "vrp_user_data",
    VehiclesTable = "vrp_user_vehicles",
    PolicePanelTable = "police_records",
    
    -- Mapeamento de Colunas
    PassportColumn = "id",
    NameColumn = "name",
    FirstNameColumn = "firstname"
}

-- Grupos e Cargos Policiais Padrão (Fallback caso não mapeado dinamicamente)
Config.PoliceGroups = {
    Main = "Policia",
    Ranks = {
        [1] = "PoliciaSoldado",
        [2] = "PoliciaCabo",
        [3] = "PoliciaSargento",
        [4] = "PoliciaSubtenente",
        [5] = "PoliciaTenente",
        [6] = "PoliciaCapitao",
        [7] = "PoliciaMajor",
        [8] = "PoliciaTenenteCoronel",
        [9] = "PoliciaCoronel"
    },
    Units = {
        ["ROCAM"] = "PoliciaROCAM",
        ["ROTA"] = "PoliciaROTA",
        ["BAEP"] = "PoliciaBAEP",
        ["CHOQUE"] = "PoliciaChoque",
        ["FT"] = "PoliciaForcaTatica"
    }
}
