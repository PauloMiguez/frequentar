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

// Solicitar permissão apenas uma vez
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
            return redesAutorizadasCache;
        }
        console.log('📡 Carregando redes autorizadas...');
        const redes = await api.getRedesAutorizadas();
        redesAutorizadasCache = redes;
        ultimaConsultaCache = agora;
        console.log(`✅ ${redes.length} rede(s) autorizada(s) carregada(s)`);
        return redes;
    } catch (error) {
        console.log('⚠️ Erro ao carregar redes autorizadas');
        return redesAutorizadasCache || [];
    }
};

export const getWifiInfo = async () => {
    try {
        // Verifica permissão sem solicitar novamente
        if (!permissaoLocalizacaoConcedida) {
            console.log('📡 Permissão de localização negada - não é possível ler Wi-Fi');
            return null;
        }
        
        const netInfo = await NetInfo.fetch();
        
        if (netInfo.type !== 'wifi' || !netInfo.isConnected) {
            console.log('📡 Sem conexão Wi-Fi');
            return null;
        }
        
        return {
            ssid: netInfo.details?.ssid?.replace(/^"|"$/g, '') || null,
            bssid: netInfo.details?.bssid?.toLowerCase() || null,
            ip: netInfo.details?.ipAddress || null,
            isConnected: true
        };
    } catch (error) {
        console.log('⚠️ Erro ao ler informações do Wi-Fi');
        return null;
    }
};

// ÚNICA tentativa de registro
export const tentarRegistrarPresenca = async (callback) => {
    if (jaTentouRegistrar) {
        console.log('⏸️ Registro já foi tentado nesta sessão');
        return false;
    }
    
    jaTentouRegistrar = true;
    console.log('🔄 Verificando condições para registro de presença...');
    
    const wifiInfo = await getWifiInfo();
    if (!wifiInfo || !wifiInfo.bssid) {
        console.log('❌ Sem conexão Wi-Fi - registro não realizado');
        return false;
    }
    
    console.log(`📡 Conectado à rede: ${wifiInfo.ssid}`);
    
    const redes = await getRedesAutorizadas();
    const redeValida = redes.some(r => r.bssid?.toLowerCase() === wifiInfo.bssid?.toLowerCase());
    
    if (!redeValida) {
        console.log('❌ Rede não autorizada - registro não realizado');
        if (callback && !jaMostrouPopUp) {
            jaMostrouPopUp = true;
            callback({ type: 'rede', message: 'Rede Wi-Fi não autorizada. Conecte-se à rede da escola.' });
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
            console.log('⚠️ Erro ao registrar presença');
            if (callback && !jaMostrouPopUp) {
                jaMostrouPopUp = true;
                callback({ type: 'error', message: 'Erro ao registrar presença. Tente novamente.' });
            }
        }
        return false;
    }
};

// Reset diário
export const resetarTentativaDiaria = () => {
    console.log('🔄 Reset diário - novas tentativas liberadas');
    jaTentouRegistrar = false;
    jaMostrouPopUp = false;
};

// Verificar status da rede (apenas visual)
export const verificarStatusRede = async () => {
    const wifiInfo = await getWifiInfo();
    if (!wifiInfo || !wifiInfo.bssid) {
        return { conectado: false, valida: false, message: 'Sem conexão Wi-Fi' };
    }
    const redes = await getRedesAutorizadas();
    const redeValida = redes.some(r => r.bssid?.toLowerCase() === wifiInfo.bssid?.toLowerCase());
    return {
        conectado: true,
        valida: redeValida,
        message: redeValida ? '✅ Conectado à rede autorizada' : '❌ Rede não autorizada',
        redeAtual: wifiInfo
    };
};

// Monitoramento apenas visual
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
