-- ==========================================
-- OPERAÇÕES POLICIAIS SINCRONIZADAS
-- ==========================================
Police = {}

-- Cadastrar novo policial na cidade
function Police.AddPolice(passport, rankGroup, unitGroup)
    passport = tonumber(passport)
    if not passport then return false, "Passaporte invalido." end

    -- 1. Adicionar grupo principal de polícia
    Groups.AddUserGroup(passport, Config.PoliceGroups.Main)

    -- 2. Adicionar grupo da patente
    if rankGroup then
        Groups.AddUserGroup(passport, rankGroup)
    end

    -- 3. Adicionar grupo da unidade
    if unitGroup then
        Groups.AddUserGroup(passport, unitGroup)
    end

    -- 4. Atualizar Painel Policial da cidade se existir
    Police.UpdatePanelStatus(passport, "ATIVO", rankGroup, unitGroup)

    return true, "Policial cadastrado e integrado com sucesso na cidade."
end

-- Promover ou rebaixar patente policial
function Police.SetRank(passport, oldRankGroup, newRankGroup)
    passport = tonumber(passport)
    if not passport or not newRankGroup then return false, "Parametros invalidos." end

    -- Remover patente anterior se fornecida
    if oldRankGroup and oldRankGroup ~= "" then
        Groups.RemoveUserGroup(passport, oldRankGroup)
    end

    -- Adicionar nova patente
    Groups.AddUserGroup(passport, newRankGroup)

    Police.UpdatePanelStatus(passport, "ATIVO", newRankGroup, nil)

    return true, "Patente policial atualizada no FiveM."
end

-- Transferir policial de unidade
function Police.SetUnit(passport, oldUnitGroup, newUnitGroup)
    passport = tonumber(passport)
    if not passport then return false, "Parametros invalidos." end

    if oldUnitGroup and oldUnitGroup ~= "" then
        Groups.RemoveUserGroup(passport, oldUnitGroup)
    end

    if newUnitGroup and newUnitGroup ~= "" then
        Groups.AddUserGroup(passport, newUnitGroup)
    end

    return true, "Unidade policial atualizada no FiveM."
end

-- Exonerar policial (remover todos os grupos e cargos)
function Police.Dismiss(passport, currentRankGroup, currentUnitGroup)
    passport = tonumber(passport)
    if not passport then return false, "Passaporte invalido." end

    -- Remover grupo principal
    Groups.RemoveUserGroup(passport, Config.PoliceGroups.Main)

    -- Remover patente
    if currentRankGroup then
        Groups.RemoveUserGroup(passport, currentRankGroup)
    end

    -- Remover unidade
    if currentUnitGroup then
        Groups.RemoveUserGroup(passport, currentUnitGroup)
    end

    -- Remover de patrulhas e viaturas se online
    local src = Players.GetSourceByPassport(passport)
    if src then
        TriggerClientEvent("security_bridge:onDismissed", src)
    end

    Police.UpdatePanelStatus(passport, "EXONERADO", nil, nil)

    return true, "Policial exonerado e desvinculado dos grupos da corporacao."
end

-- Atualizar registro no Painel Policial / MDT da cidade
function Police.UpdatePanelStatus(passport, status, rank, unit)
    -- Disparar evento para painéis policiais terceiros compatíveis
    TriggerEvent("police:updateOfficerRecord", passport, status, rank, unit)
end
