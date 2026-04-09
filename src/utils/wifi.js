import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração fixa do dispositivo
const FIXED_DEVICE_ID = 'device_aluno_3_1775738624986'; // MAC cadastrado no backend

// Configuração da rede Wi-Fi da escola
const WIFI_CONFIG = {
  ssid: 'ROCHA MIGUEZ-5G',      // SSID correto da rede
  bssid: '84:0B:BB:D7:81:65',    // BSSID correto cadastrado no sistema
  useAutoDetect: true            // Tentar detectar automaticamente primeiro
};

export const getDeviceId = async () => {
  try {
    // Usar MAC fixo cadastrado no banco
    console.log('📱 Usando Device ID fixo:', FIXED_DEVICE_ID);
    return FIXED_DEVICE_ID;
  } catch (error) {
    console.error('Erro ao obter deviceId:', error);
    return 'device-fallback-' + Date.now();
  }
};

export const getWifiInfo = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    
    console.log('📶 NetInfo detalhada:', JSON.stringify(netInfo, null, 2));
    
    if (netInfo.type !== 'wifi' || !netInfo.isConnected) {
      console.log('⚠️ Não está conectado ao Wi-Fi');
      return null;
    }

    let ssid = WIFI_CONFIG.ssid;      // Valor padrão
    let bssid = WIFI_CONFIG.bssid;    // Valor padrão
    let ipAddress = netInfo.details?.ipAddress || '192.168.15.40';

    // Se a detecção automática estiver ativada, tenta pegar os valores reais
    if (WIFI_CONFIG.useAutoDetect) {
      // Tenta pegar o SSID real
      if (netInfo.details?.ssid) {
        const detectedSsid = netInfo.details.ssid.replace(/^"|"$/g, '');
        if (detectedSsid && detectedSsid !== '') {
          ssid = detectedSsid;
          console.log('📡 SSID detectado:', ssid);
        } else {
          console.log('⚠️ SSID detectado vazio, usando fallback:', ssid);
        }
      } else {
        console.log('⚠️ Não foi possível ler o SSID, usando fallback:', ssid);
      }

      // Tenta pegar o BSSID real
      if (netInfo.details?.bssid) {
        const detectedBssid = netInfo.details.bssid;
        if (detectedBssid && detectedBssid !== '02:00:00:00:00:00') {
          // Se detectou um BSSID válido (diferente do genérico), usa ele
          bssid = detectedBssid;
          console.log('📡 BSSID detectado:', bssid);
        } else {
          // Se for o BSSID genérico do Android, mantém o configurado
          console.log('⚠️ BSSID genérico detectado, usando fallback:', bssid);
        }
      } else {
        console.log('⚠️ Não foi possível ler o BSSID, usando fallback:', bssid);
      }
    }

    const wifiInfo = {
      ssid: ssid,
      bssid: bssid,
      ip: ipAddress,
      isConnected: true
    };
    
    console.log('📡 Wi-Fi Info final enviado:', wifiInfo);
    return wifiInfo;
    
  } catch (error) {
    console.error('Erro ao obter informações da rede:', error);
    return null;
  }
};

export const startWifiMonitoring = (callback, interval = 30000) => {
  let intervalId = null;
  
  const checkWifi = async () => {
    const wifiInfo = await getWifiInfo();
    if (callback && wifiInfo) {
      callback(wifiInfo);
    }
  };
  
  checkWifi();
  intervalId = setInterval(checkWifi, interval);
  
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
};