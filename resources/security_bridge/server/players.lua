-- ==========================================
-- GESTÃO E CONSULTA DE JOGADORES (FIVEM)
-- ==========================================
Players = {}

-- Obtém o source (ID na sessão) de um jogador pelo passaporte
function Players.GetSourceByPassport(passport)
    passport = tonumber(passport)
    if not passport then return nil end

    if Config.Framework == "vrp" then
        if vRP and vRP.getUserSource then
            return vRP.getUserSource(passport)
        end
    elseif Config.Framework == "creative" then
        if vRP and vRP.userSource then
            return vRP.userSource(passport)
        end
    elseif Config.Framework == "qbcore" then
        if QBCore then
            local players = QBCore.Functions.GetPlayers()
            for _, src in ipairs(players) do
                local player = QBCore.Functions.GetPlayer(src)
                if player and player.PlayerData.citizenid == tostring(passport) then
                    return src
                end
            end
        end
    elseif Config.Framework == "esx" then
        if ESX then
            local xPlayer = ESX.GetPlayerFromId(passport)
            if xPlayer then return xPlayer.source end
        end
    end

    return nil
end

-- Verifica se o jogador está online
function Players.IsOnline(passport)
    local src = Players.GetSourceByPassport(passport)
    return src ~= nil and src > 0
end

-- Consulta os dados de identidade do personagem
function Players.GetCharacter(passport)
    passport = tonumber(passport)
    if not passport then return nil end

    local isOnline = Players.IsOnline(passport)
    local name = "Desconhecido"
    local firstname = ""
    local phone = "N/A"

    if Config.Framework == "vrp" or Config.Framework == "creative" then
        if vRP and vRP.getUserIdentity then
            local identity = vRP.getUserIdentity(passport)
            if identity then
                name = identity.name or identity.nome or name
                firstname = identity.firstname or identity.sobrenome or firstname
                phone = identity.phone or identity.telefone or phone
            end
        end
    end

    return {
        passport = passport,
        name = name .. (firstname ~= "" and (" " .. firstname) or ""),
        firstname = firstname,
        phone = phone,
        isOnline = isOnline,
        source = Players.GetSourceByPassport(passport)
    }
end
