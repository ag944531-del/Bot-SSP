-- ==========================================
-- API SERVER-SIDE HTTP HANDLER (FIVEM BRIDGE)
-- ==========================================

local function jsonResponse(res, statusCode, data)
    res.writeHead(statusCode, {
        ["Content-Type"] = "application/json",
        ["Access-Control-Allow-Origin"] = "*"
    })
    res.send(json.encode(data))
end

SetHttpHandler(function(req, res)
    local method = req.method
    local path = req.path

    -- Permitir CORS Preflight
    if method == "OPTIONS" then
        res.writeHead(204, {
            ["Access-Control-Allow-Origin"] = "*",
            ["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS",
            ["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Timestamp, X-Nonce, X-Operation-Id"
        })
        return res.send("")
    end

    -- 1. Validar Autenticação & Segurança da Requisição
    local isAuthorized, authError = Authentication.ValidateRequest(req.headers, req.body)
    if not isAuthorized then
        BridgeLogs.Warn("Tentativa de requisicao negada: " .. tostring(authError))
        return jsonResponse(res, 401, { success = false, error = authError })
    end

    -- 2. Status Geral do Servidor
    if method == "GET" and path == "/status" then
        local totalPlayers = GetNumPlayerIndices()
        return jsonResponse(res, 200, {
            success = true,
            online = true,
            framework = Config.Framework,
            onlinePlayers = totalPlayers,
            serverName = GetConvar("sv_hostname", "FiveM Server"),
            version = "1.0.0"
        })
    end

    -- 3. Consulta de Jogador por Passaporte: GET /player?passport=152
    if method == "GET" and (path == "/player" or string.find(path, "^/player")) then
        local passport = nil
        if req.params and req.params.passport then
            passport = req.params.passport
        end

        local char = Players.GetCharacter(passport)
        if not char then
            return jsonResponse(res, 404, { success = false, error = "Personagem nao localizado na base." })
        end

        return jsonResponse(res, 200, { success = true, character = char })
    end

    -- Ler corpo JSON para rotas POST
    local body = {}
    if req.body and req.body ~= "" then
        local status, parsed = pcall(json.decode, req.body)
        if status and parsed then
            body = parsed
        end
    end

    -- 4. Cadastrar Policial: POST /police/register
    if method == "POST" and path == "/police/register" then
        local passport = body.passport
        local rankGroup = body.rankGroup
        local unitGroup = body.unitGroup

        local success, msg = Police.AddPolice(passport, rankGroup, unitGroup)
        BridgeLogs.Info("Cadastro de policial [Passaporte: " .. tostring(passport) .. "] - " .. msg)
        return jsonResponse(res, success and 200 or 400, { success = success, message = msg })
    end

    -- 5. Promover / Rebaixar: POST /police/setrank
    if method == "POST" and (path == "/police/setrank" or path == "/police/promote" or path == "/police/demote") then
        local passport = body.passport
        local oldRank = body.oldRankGroup
        local newRank = body.newRankGroup

        local success, msg = Police.SetRank(passport, oldRank, newRank)
        BridgeLogs.Info("Alteracao de patente [Passaporte: " .. tostring(passport) .. "] - " .. msg)
        return jsonResponse(res, success and 200 or 400, { success = success, message = msg })
    end

    -- 6. Transferir Unidade: POST /police/transfer
    if method == "POST" and path == "/police/transfer" then
        local passport = body.passport
        local oldUnit = body.oldUnitGroup
        local newUnit = body.newUnitGroup

        local success, msg = Police.SetUnit(passport, oldUnit, newUnit)
        BridgeLogs.Info("Transferencia de unidade [Passaporte: " .. tostring(passport) .. "] - " .. msg)
        return jsonResponse(res, success and 200 or 400, { success = success, message = msg })
    end

    -- 7. Exonerar Policial: POST /police/dismiss
    if method == "POST" and path == "/police/dismiss" then
        local passport = body.passport
        local rankGroup = body.rankGroup
        local unitGroup = body.unitGroup

        local success, msg = Police.Dismiss(passport, rankGroup, unitGroup)
        BridgeLogs.Info("Exoneracao de policial [Passaporte: " .. tostring(passport) .. "] - " .. msg)
        return jsonResponse(res, success and 200 or 400, { success = success, message = msg })
    end

    -- Rota não encontrada
    return jsonResponse(res, 404, { success = false, error = "Endpoint do bridge nao encontrado." })
end)
