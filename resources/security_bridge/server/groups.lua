-- ==========================================
-- GESTÃO DE GRUPOS E CARGOS NO FRAMEWORK
-- ==========================================
Groups = {}

-- Adiciona um grupo ao jogador (em memória se online e no banco se offline)
function Groups.AddUserGroup(passport, groupName)
    passport = tonumber(passport)
    if not passport or not groupName then return false, "Parametros invalidos" end

    local src = Players.GetSourceByPassport(passport)

    if Config.Framework == "vrp" or Config.Framework == "creative" then
        if vRP and vRP.addUserGroup then
            vRP.addUserGroup(passport, groupName)
            return true, "Grupo adicionado no vRP com sucesso."
        end
    elseif Config.Framework == "qbcore" then
        if src and QBCore then
            local Player = QBCore.Functions.GetPlayer(src)
            if Player then
                Player.Functions.SetJob(groupName, 1)
                return true, "Job definido no QBCore."
            end
        end
    end

    return true, "Comando de grupo processado."
end

-- Remove um grupo do jogador
function Groups.RemoveUserGroup(passport, groupName)
    passport = tonumber(passport)
    if not passport or not groupName then return false, "Parametros invalidos" end

    if Config.Framework == "vrp" or Config.Framework == "creative" then
        if vRP and vRP.removeUserGroup then
            vRP.removeUserGroup(passport, groupName)
            return true, "Grupo removido no vRP."
        end
    end

    return true, "Comando de remocao de grupo processado."
end

-- Verifica se o jogador possui determinado grupo
function Groups.HasUserGroup(passport, groupName)
    passport = tonumber(passport)
    if not passport or not groupName then return false end

    if Config.Framework == "vrp" or Config.Framework == "creative" then
        if vRP and vRP.hasGroup then
            return vRP.hasGroup(passport, groupName)
        end
    end

    return false
end
