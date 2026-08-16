-- ==========================================
-- GESTÃO DE PERMISSÕES SERVER-SIDE
-- ==========================================
Permissions = {}

function Permissions.HasPermission(passport, permission)
    passport = tonumber(passport)
    if not passport or not permission then return false end

    if Config.Framework == "vrp" or Config.Framework == "creative" then
        if vRP and vRP.hasPermission then
            return vRP.hasPermission(passport, permission)
        end
    end

    return false
end
