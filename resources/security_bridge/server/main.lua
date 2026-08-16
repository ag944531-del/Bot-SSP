-- ==========================================
-- SECURITY BRIDGE - INICIALIZAÇÃO
-- ==========================================

Citizen.CreateThread(function()
    print("^4========================================================^7")
    print("^2  [SECURITY BRIDGE] Integração SSP ↔ FiveM Ativa!^7")
    print("^2  Framework configurado: ^3" .. tostring(Config.Framework) .. "^7")
    print("^2  Autenticação: ^3HMAC SHA-256 + Token Ativo^7")
    print("^4========================================================^7")
end)

-- Evento de cliente para remoção de armamentos/viaturas na exoneração em tempo real
RegisterNetEvent("security_bridge:onDismissed", function()
    local src = source
    -- Notificar cliente e fechar rádios/painéis policiais se abertos
    TriggerClientEvent("Notify", src, "negado", "Você foi exonerado da corporação.")
end)
