import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../services/api';

const FIXED_DEVICE_ID = 'device_aluno_3_1775738624986';

let redesAutorizadasCache = null;
let ultimaConsultaCache = null;
const TEMPO_CACHE = 5 * 60 * 1000;

// Controle de tentativas
let jaTentouRegistrar = false;
let jaMostrouPopUp = false;
let permissaoLocalizacaoConcedida = false;

export const getDeviceId = async () => {
    return FIXED_DEVICE_ID;
};

export const solicitarPermissaoLocalizacao = async () => {
    if (permissaoLocalizacaoConcedida) {
        return true;
    }
    
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissaoLocalizacaoConcedida = status === 'granted';
        console.log(`📍 Permissão de localização: ${permissaoLocalizacaoConcedida ? 'concedida' : 'negada'}`);
        return permissaoLocalizacaoConcedida;
    } catch (error) {
        console.log('📍 Erro ao obter permissão de localização');
        return false;
    }
};

export const getRedesAutorizadas = async (forceRefresh = false) => {
    try {
        const agora = Date.now();
        if (!forceRefresh && redesAutorizadasCache && (agora - ultimaConsultaCache) < TEMPO_CACHE) {
            console.log('📡 Usando cache de redes autorizadas:', redesAutorizadasCache.length);
            return redesAutorizadasCache;
        }
        console.log('📡 Buscando redes autorizadas no backend...');
        const redes = await api.getRedesAutorizadas();
        redesAutorizadasCache = redes;
        ultimaConsultaCache = agora;
        console.log(`✅ ${redes.length} rede(s) autorizada(s) carregada(s) do backend`);
        redes.forEach(rede => {
            console.log(`   - ${rede.ssid} (${rede.bssid}) - ${rede.predio}/${rede.sala}`);
        });
        return redes;
    } catch (error) {
        console.log('⚠️ Erro ao carregar redes autorizadas:', error);
        return redesAutorizadasCache || [];
    }
};

export const getWifiInfo = async () => {
    try {
        if (!permissaoLocalizacaoConcedida) {
            console.log('📡 Permissão de localização negada');
            return null;
        }
        
        const netInfo = await NetInfo.fetch();
        
        if (netInfo.type !== 'wifi' || !netInfo.isConnected) {
            console.log('📡 Sem conexão Wi-Fi');
            return null;
        }
        
        let ssid = netInfo.details?.ssid?.replace(/^"|"$/g, '') || null;
        let bssid = netInfo.details?.bssid || null;
        
        console.log(`📡 Wi-Fi detectado: SSID="${ssid}", BSSID="${bssid}"`);
        
        return {
            ssid: ssid,
            bssid: bssid,
            ip: netInfo.details?.ipAddress || null,
            isConnected: true
        };
    } catch (error) {
        console.log('⚠️ Erro ao ler Wi-Fi:', error);
        return null;
    }
};

// Validar rede atual contra as autorizadas do backend
export const validarRedeAtual = async (wifiInfo, redesAutorizadas) => {
    if (!wifiInfo || !wifiInfo.ssid) {
        return {
            valida: false,
            message: 'Não foi possível identificar a rede Wi-Fi',
            rede: null
        };
    }
    
    // Buscar por SSID ou BSSID (case insensitive)
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
    
    return {
        valida: false,
        message: '❌ Rede Wi-Fi não autorizada. Conecte-se à rede oficial da escola.',
        rede: null
    };
};

export const tentarRegistrarPresenca = async (callback) => {
    if (jaTentouRegistrar) {
        console.log('⏸️ Registro já foi tentado nesta sessão');
        return false;
    }
    
    jaTentouRegistrar = true;
    console.log('🔄 Verificando condições para registro de presença...');
    
    const wifiInfo = await getWifiInfo();
    if (!wifiInfo || !wifiInfo.ssid) {
        console.log('❌ Sem conexão Wi-Fi - registro não realizado');
        return false;
    }
    
    console.log(`📡 Conectado à rede: ${wifiInfo.ssid} (${wifiInfo.bssid})`);
    
    const redes = await getRedesAutorizadas();
    const validacao = await validarRedeAtual(wifiInfo, redes);
    
    if (!validacao.valida) {
        console.log('❌ Rede não autorizada - registro não realizado');
        if (callback && !jaMostrouPopUp) {
            jaMostrouPopUp = true;
            callback({ type: 'rede', message: validacao.message });
        }
        return false;
    }
    
    console.log('✅ Rede autorizada! Tentando registrar presença...');
    
    try {
        const result = await api.registrarPresencaAuto({
            mac_address: FIXED_DEVICE_ID,
            ssid: wifiInfo.ssid,
            bssid: wifiInfo.bssid,
            client_ip: wifiInfo.ip
        });
        
        if (result.status === 'registrado') {
            console.log('✅ Presença registrada com sucesso!');
            if (callback && !jaMostrouPopUp) {
                jaMostrouPopUp = true;
                callback({ type: 'success', message: '✅ Presença registrada com sucesso!' });
            }
        } else if (result.status === 'duplicado') {
            console.log('📝 Presença já registrada hoje');
            if (callback && !jaMostrouPopUp) {
                jaMostrouPopUp = true;
                callback({ type: 'info', message: '📝 Presença já registrada hoje' });
            }
        }
        return true;
    } catch (error) {
        if (error.message.includes('Fora do horário')) {
            console.log('⏰ Fora do horário de aula - registro não realizado');
            if (callback && !jaMostrouPopUp) {
                jaMostrouPopUp = true;
                callback({ type: 'horario', message: '⏰ Fora do horário de aula (08:00 às 12:00)' });
            }
        } else {
            console.log('⚠️ Erro ao registrar presença:', error.message);
            if (callback && !jaMostrouPopUp) {
                jaMostrouPopUp = true;
                callback({ type: 'error', message: 'Erro ao registrar presença. Tente novamente.' });
            }
        }
        return false;
    }
};

export const resetarTentativaDiaria = () => {
    console.log('🔄 Reset diário - novas tentativas liberadas');
    jaTentouRegistrar = false;
    jaMostrouPopUp = false;
};

export const verificarStatusRede = async () => {
    const wifiInfo = await getWifiInfo();
    if (!wifiInfo || !wifiInfo.ssid) {
        return { conectado: false, valida: false, message: 'Sem conexão Wi-Fi' };
    }
    const redes = await getRedesAutorizadas();
    const validacao = await validarRedeAtual(wifiInfo, redes);
    return {
        conectado: true,
        valida: validacao.valida,
        message: validacao.message,
        redeAtual: wifiInfo,
        rede: validacao.rede
    };
};

export const startWifiMonitoring = (callback, interval = 30000) => {
    let intervalId = null;
    const checkWifi = async () => {
        const status = await verificarStatusRede();
        if (callback) callback(status);
    };
    checkWifi();
    intervalId = setInterval(checkWifi, interval);
    return () => { if (intervalId) clearInterval(intervalId); };
};
