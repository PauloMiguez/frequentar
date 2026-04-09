import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Configuração fixa do dispositivo
const FIXED_DEVICE_ID = 'device_aluno_3_1775738624986';

// Cache das redes autorizadas
let redesAutorizadasCache = null;
let ultimaConsultaCache = null;
const TEMPO_CACHE = 5 * 60 * 1000; // 5 minutos

export const getDeviceId = async () => {
    try {
        console.log('📱 Usando Device ID fixo:', FIXED_DEVICE_ID);
        return FIXED_DEVICE_ID;
    } catch (error) {
        console.error('Erro ao obter deviceId:', error);
        return 'device-fallback-' + Date.now();
    }
};

// Buscar redes autorizadas do backend
export const getRedesAutorizadas = async (forceRefresh = false) => {
    try {
        const agora = Date.now();
        
        // Usar cache se válido
        if (!forceRefresh && redesAutorizadasCache && (agora - ultimaConsultaCache) < TEMPO_CACHE) {
            console.log('📡 Usando cache de redes autorizadas:', redesAutorizadasCache.length, 'redes');
            return redesAutorizadasCache;
        }
        
        console.log('📡 Buscando redes autorizadas no backend...');
        const redes = await api.getRedesAutorizadas();
        redesAutorizadasCache = redes;
        ultimaConsultaCache = agora;
        
        console.log('✅ Redes autorizadas carregadas:', redes.length);
        redes.forEach(rede => {
            console.log(`   - ${rede.ssid} (${rede.bssid}) - ${rede.predio}/${rede.sala}`);
        });
        
        return redes;
    } catch (error) {
        console.error('❌ Erro ao buscar redes autorizadas:', error);
        return redesAutorizadasCache || [];
    }
};

// Validar rede atual contra as autorizadas
export const validarRedeAtual = async (wifiInfo, redesAutorizadas) => {
    if (!wifiInfo || !wifiInfo.ssid) {
        return {
            valida: false,
            message: 'Não conectado a nenhuma rede Wi-Fi',
            rede: null
        };
    }
    
    // Buscar rede correspondente (ignorando case)
    const redeAutorizada = redesAutorizadas.find(rede => 
        rede.ssid?.toLowerCase() === wifiInfo.ssid?.toLowerCase() ||
        rede.bssid?.toLowerCase() === wifiInfo.bssid?.toLowerCase()
    );
    
    if (redeAutorizada) {
        return {
            valida: true,
            message: `✅ Rede autorizada: ${redeAutorizada.ssid} (${redeAutorizada.predio} - ${redeAutorizada.sala})`,
            rede: redeAutorizada
        };
    }
    
    // Verificar se existe alguma rede próxima (por SSID)
    const redesProximas = redesAutorizadas.filter(rede => 
        rede.ssid?.toLowerCase().includes(wifiInfo.ssid?.toLowerCase()) ||
        wifiInfo.ssid?.toLowerCase().includes(rede.ssid?.toLowerCase())
    );
    
    if (redesProximas.length > 0) {
        return {
            valida: false,
            message: `⚠️ Rede não autorizada. Conecte-se a: ${redesProximas.map(r => r.ssid).join(', ')}`,
            rede: null,
            sugestoes: redesProximas
        };
    }
    
    return {
        valida: false,
        message: '❌ Rede Wi-Fi não autorizada. Conecte-se à rede oficial da escola.',
        rede: null
    };
};

// Obter informações da rede atual (sem hardcoded)
export const getWifiInfo = async () => {
    try {
        const netInfo = await NetInfo.fetch();
        
        if (netInfo.type !== 'wifi' || !netInfo.isConnected) {
            console.log('⚠️ Não está conectado ao Wi-Fi');
            return null;
        }

        let ssid = null;
        let bssid = null;
        let ipAddress = netInfo.details?.ipAddress || null;

        if (netInfo.details?.ssid) {
            ssid = netInfo.details.ssid.replace(/^"|"$/g, '');
        }

        if (netInfo.details?.bssid) {
            bssid = netInfo.details.bssid;
        }

        const wifiInfo = {
            ssid: ssid,
            bssid: bssid,
            ip: ipAddress,
            isConnected: true
        };
        
        console.log('📡 Wi-Fi detectado:', wifiInfo);
        return wifiInfo;
        
    } catch (error) {
        console.error('Erro ao obter informações da rede:', error);
        return null;
    }
};

// Verificar rede e retornar status completo
export const verificarStatusRede = async () => {
    try {
        const wifiInfo = await getWifiInfo();
        
        if (!wifiInfo) {
            return {
                conectado: false,
                valida: false,
                message: '📡 Conecte-se à rede Wi-Fi da escola para registrar presença',
                rede: null
            };
        }
        
        const redesAutorizadas = await getRedesAutorizadas();
        const validacao = await validarRedeAtual(wifiInfo, redesAutorizadas);
        
        return {
            conectado: true,
            ...validacao,
            redeAtual: wifiInfo
        };
        
    } catch (error) {
        console.error('Erro ao verificar status da rede:', error);
        return {
            conectado: false,
            valida: false,
            message: 'Erro ao verificar conexão',
            rede: null
        };
    }
};

// Iniciar monitoramento com validação dinâmica
export const startWifiMonitoring = (callback, interval = 30000) => {
    let intervalId = null;
    let isMonitoring = true;
    
    const checkWifi = async () => {
        if (!isMonitoring) return;
        
        const status = await verificarStatusRede();
        
        if (callback) {
            callback(status);
        }
        
        if (status.valida && status.conectado) {
            console.log('✅ Rede válida, tentando registrar presença...');
            const deviceId = await getDeviceId();
            
            try {
                const result = await api.registrarPresencaAuto({
                    mac_address: deviceId,
                    ssid: status.redeAtual.ssid,
                    bssid: status.redeAtual.bssid,
                    client_ip: status.redeAtual.ip
                });
                
                if (callback) {
                    callback({ ...status, registro: result });
                }
            } catch (error) {
                console.error('❌ Erro ao registrar presença:', error);
            }
        }
    };
    
    checkWifi();
    intervalId = setInterval(checkWifi, interval);
    
    return () => {
        isMonitoring = false;
        if (intervalId) clearInterval(intervalId);
    };
};
