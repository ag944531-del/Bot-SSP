-- ==========================================
-- LOGS E AUDITORIA DA INTEGRAÇÃO
-- ==========================================
BridgeLogs = {}

function BridgeLogs.Info(msg)
    print("^2[SECURITY-BRIDGE]^7 " .. tostring(msg))
end

function BridgeLogs.Warn(msg)
    print("^3[SECURITY-BRIDGE WARN]^7 " .. tostring(msg))
end

function BridgeLogs.Error(msg)
    print("^1[SECURITY-BRIDGE ERROR]^7 " .. tostring(msg))
end
