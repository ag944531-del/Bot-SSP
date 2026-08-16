-- ==========================================
-- AUTENTICAÇÃO E SEGURANÇA DA INTEGRAÇÃO
-- ==========================================
Authentication = {}

local processedNonces = {}

-- Limpeza de nonces antigos a cada 10 minutos
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(600000)
        local now = os.time()
        for nonce, timestamp in pairs(processedNonces) do
            if (now - timestamp) > 300 then
                processedNonces[nonce] = nil
            end
        end
    end
end)

function Authentication.ValidateRequest(headers, body)
    if not headers then return false, "Headers ausentes." end

    local authHeader = headers["Authorization"] or headers["authorization"]
    local timestampHeader = tonumber(headers["X-Timestamp"] or headers["x-timestamp"] or 0)
    local nonce = headers["X-Nonce"] or headers["x-nonce"]

    -- 1. Validar Token de Autenticação Secreto
    if not authHeader or authHeader ~= "Bearer " .. Config.ApiKey then
        return false, "Autenticacao invalida ou Bearer token incorreto."
    end

    -- 2. Prevenção de Replay por Timestamp (Janela de 30 segundos)
    local now = os.time()
    if timestampHeader == 0 or math.abs(now - timestampHeader) > Config.RequestTimeoutSeconds then
        return false, "Requisicao expirada ou timestamp fora da janela de seguranca."
    end

    -- 3. Prevenção de Replay por Nonce
    if nonce then
        if processedNonces[nonce] then
            return false, "Requisicao duplicada detectada (Replay Attack)."
        end
        processedNonces[nonce] = now
    end

    return true, "Autorizado"
end
