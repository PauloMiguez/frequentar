import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const API_URL = 'http://192.168.15.13:3000/api';

const generateUniqueId = () => {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [wifiConfig, setWifiConfig] = useState({ ssid: '', password: '' });
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [manualReg, setManualReg] = useState({ nome_aluno: '', matricula: '', motivo: '', mac_address: '' });
  const [loginData, setLoginData] = useState({ username: 'admin', password: 'admin123' });
  const [deviceId, setDeviceId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [history, setHistory] = useState([]);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);

  useEffect(() => {
    console.log('Ì∫Ä App iniciado');
    checkAutoLogin();
    getDeviceId();
    startWifiMonitoring();
  }, []);

  const getDeviceId = async () => {
    try {
      let id = await AsyncStorage.getItem('deviceId');
      if (!id) {
        id = generateUniqueId();
        await AsyncStorage.setItem('deviceId', id);
        console.log('Ì∂ï Novo Device ID gerado:', id);
      } else {
        console.log('Ì≥± Device ID existente:', id);
      }
      setDeviceId(id);
      return id;
    } catch (error) {
      console.error('‚ùå Erro ao obter device ID:', error);
      return 'fallback-' + Date.now();
    }
  };

  const checkAutoLogin = async () => {
    const savedToken = await AsyncStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      loadAdminData();
      console.log('‚úÖ Auto login realizado');
    }
  };

  const startWifiMonitoring = () => {
    console.log('Ì¥ç Iniciando monitoramento de Wi-Fi...');
    
    const unsubscribe = NetInfo.addEventListener(async state => {
      console.log('Ì≥° Estado da rede:', { type: state.type, isConnected: state.isConnected });
      
      if (state.isConnected && state.type === 'wifi') {
        console.log('‚úÖ Conectado ao Wi-Fi!');
        const deviceId_local = await getDeviceId();
        console.log('Ì≥± Device ID atual:', deviceId_local);
        if (deviceId_local) {
          await registerPresenceByWifi(deviceId_local);
        }
      }
    });
    
    return () => unsubscribe();
  };

  const registerPresenceByWifi = async (deviceIdentifier) => {
    try {
      console.log('Ì≥§ Enviando requisi√ß√£o para:', `${API_URL}/presenca/wifi`);
      console.log('Ì≥± Device ID:', deviceIdentifier);
      
      const response = await fetch(`${API_URL}/presenca/wifi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac_address: deviceIdentifier, tempo_conectado: 0 })
      });
      
      const data = await response.json();
      console.log('Ì≥• Resposta do servidor:', data);
      
      if (data.status === 'registrado') {
        console.log('‚úÖ Presen√ßa registrada com sucesso!');
        Alert.alert('Sucesso', 'Presen√ßa registrada automaticamente!');
        loadStats();
        loadHistory();
      } else if (data.status === 'duplicado') {
        console.log('‚ö†Ô∏è Presen√ßa j√° registrada hoje');
      } else if (data.error === 'Dispositivo n√£o cadastrado') {
        console.log('‚ùå Device ID n√£o cadastrado no sistema:', deviceIdentifier);
      } else {
        console.log('‚ùå Falha no registro:', data);
      }
    } catch (error) {
      console.error('‚ùå Erro ao registrar presen√ßa:', error);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        setToken(data.token);
        setIsLoggedIn(true);
        loadAdminData();
        Alert.alert('Sucesso', 'Login realizado!');
      } else {
        Alert.alert('Erro', 'Credenciais inv√°lidas');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na conex√£o');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    await loadWifiConfig();
    await loadDevices();
    await loadStats();
    await loadHistory();
  };

  const loadWifiConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/wifi/config`);
      const data = await response.json();
      setWifiConfig(data);
      if (data.ssid) {
        await AsyncStorage.setItem('wifiConfig', JSON.stringify(data));
        console.log('‚úÖ Configura√ß√£o Wi-Fi carregada:', data.ssid);
      }
    } catch (error) {
      console.error('Erro ao carregar config Wi-Fi:', error);
    }
  };

  const saveWifiConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/wifi/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(wifiConfig)
      });
      if (response.ok) {
        await AsyncStorage.setItem('wifiConfig', JSON.stringify(wifiConfig));
        Alert.alert('Sucesso', 'Configura√ß√£o salva!');
        console.log('‚úÖ Configura√ß√£o salva:', wifiConfig);
      } else {
        Alert.alert('Erro', 'Falha ao salvar');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na conex√£o');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch(`${API_URL}/dispositivos`);
      const data = await response.json();
      setDevices(data);
      console.log('Ì≥± Dispositivos carregados:', data.length);
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
    }
  };

  const addDevice = async () => {
    if (!manualReg.nome_aluno || !manualReg.matricula) {
      Alert.alert('Erro', 'Preencha nome e matr√≠cula');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/dispositivos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          nome_aluno: manualReg.nome_aluno,
          matricula: manualReg.matricula,
          mac_address: manualReg.mac_address || generateUniqueId()
        })
      });
      if (response.ok) {
        Alert.alert('Sucesso', 'Dispositivo cadastrado!');
        setManualReg({ nome_aluno: '', matricula: '', motivo: '', mac_address: '' });
        loadDevices();
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na conex√£o');
    } finally {
      setLoading(false);
    }
  };

  const updateDevice = async () => {
    if (!editDevice) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/dispositivos/${editDevice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          nome_aluno: editDevice.nome_aluno,
          matricula: editDevice.matricula,
          mac_address: editDevice.mac_address
        })
      });
      if (response.ok) {
        Alert.alert('Sucesso', 'Dispositivo atualizado!');
        setEditModalVisible(false);
        loadDevices();
      } else {
        Alert.alert('Erro', 'Falha ao atualizar');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na conex√£o');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteDevice = (device) => {
    setDeviceToDelete(device);
    setDeleteConfirmVisible(true);
  };

  const deleteDevice = async () => {
    if (!deviceToDelete) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/dispositivos/${deviceToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (response.ok) {
        Alert.alert('Sucesso', 'Dispositivo exclu√≠do!');
        setDeleteConfirmVisible(false);
        setDeviceToDelete(null);
        loadDevices();
      } else {
        Alert.alert('Erro', 'Falha ao excluir');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na conex√£o');
    } finally {
      setLoading(false);
    }
  };

  const registerManual = async () => {
    if (!manualReg.nome_aluno || !manualReg.matricula) {
      Alert.alert('Erro', 'Preencha nome e matr√≠cula');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/presenca/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          nome_aluno: manualReg.nome_aluno,
          matricula: manualReg.matricula,
          motivo: manualReg.motivo || 'Registro manual'
        })
      });
      if (response.ok) {
        Alert.alert('Sucesso', 'Presen√ßa registrada!');
        setManualReg({ nome_aluno: '', matricula: '', motivo: '', mac_address: '' });
        loadStats();
        loadHistory();
      } else {
        Alert.alert('Erro', 'Falha ao registrar');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na conex√£o');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`);
      const data = await response.json();
      setStats(data);
      console.log('Ì≥ä Stats atualizados:', data);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/relatorio/presencas`);
      const data = await response.json();
      setHistory(data);
      console.log('Ì≥ú Hist√≥rico carregado:', data.length);
    } catch (error) {
      console.error('Erro ao carregar hist√≥rico:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    await loadStats();
    await loadHistory();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    setIsLoggedIn(false);
    setToken('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyName}>{item.nome_aluno}</Text>
      <Text style={styles.historyInfo}>Matr√≠cula: {item.matricula}</Text>
      <Text style={styles.historyInfo}>Data: {formatDate(item.data_conexao)}</Text>
      <Text style={styles.historyInfo}>Hor√°rio: {item.hora_conexao}</Text>
      <Text style={styles.historyInfo}>Tempo: {item.tempo_conectado || 0} min</Text>
    </View>
  );

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.loginCard}>
          <Text style={styles.title}>Sistema de Presen√ßa Wi-Fi</Text>
          <TextInput
            style={styles.input}
            placeholder="Usu√°rio"
            value={loginData.username}
            onChangeText={(text) => setLoginData({ ...loginData, username: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            secureTextEntry
            value={loginData.password}
            onChangeText={(text) => setLoginData({ ...loginData, password: text })}
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Carregando...' : 'Entrar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.adminContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Presen√ßa Wi-Fi</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]} onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'devices' && styles.tabActive]} onPress={() => setActiveTab('devices')}>
          <Text style={[styles.tabText, activeTab === 'devices' && styles.tabTextActive]}>Dispositivos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.tabActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Hist√≥rico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'settings' && styles.tabActive]} onPress={() => setActiveTab('settings')}>
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Config</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'dashboard' && (
          <View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total_dispositivos || 0}</Text>
                <Text style={styles.statLabel}>Dispositivos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.presentes_hoje || 0}</Text>
                <Text style={styles.statLabel}>Presentes Hoje</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.registros_manuais_hoje || 0}</Text>
                <Text style={styles.statLabel}>Registros Manuais</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rede Configurada</Text>
              <Text style={styles.wifiInfo}>SSID: {wifiConfig.ssid || 'N√£o configurado'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seu Device ID</Text>
              <Text style={styles.deviceIdText}>{deviceId}</Text>
              <Text style={styles.deviceIdHint}>Cadastre este ID no sistema</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Registro R√°pido</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do Aluno"
                value={manualReg.nome_aluno}
                onChangeText={(text) => setManualReg({ ...manualReg, nome_aluno: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Matr√≠cula"
                value={manualReg.matricula}
                onChangeText={(text) => setManualReg({ ...manualReg, matricula: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Motivo (opcional)"
                value={manualReg.motivo}
                onChangeText={(text) => setManualReg({ ...manualReg, motivo: text })}
              />
              <TouchableOpacity style={styles.manualButton} onPress={registerManual} disabled={loading}>
                <Text style={styles.buttonText}>Registrar Manual</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'devices' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cadastrar Novo</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do Aluno"
                value={manualReg.nome_aluno}
                onChangeText={(text) => setManualReg({ ...manualReg, nome_aluno: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Matr√≠cula"
                value={manualReg.matricula}
                onChangeText={(text) => setManualReg({ ...manualReg, matricula: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Device ID / MAC"
                value={manualReg.mac_address}
                onChangeText={(text) => setManualReg({ ...manualReg, mac_address: text })}
              />
              <TouchableOpacity style={styles.button} onPress={addDevice} disabled={loading}>
                <Text style={styles.buttonText}>Cadastrar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dispositivos ({devices.length})</Text>
              {devices.map((device) => (
                <View key={device.id} style={styles.deviceCard}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.nome_aluno}</Text>
                    <Text style={styles.deviceDetail}>Matr√≠cula: {device.matricula}</Text>
                    <Text style={styles.deviceDetail}>ID: {device.mac_address}</Text>
                  </View>
                  <View style={styles.deviceActions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => {
                      setEditDevice(device);
                      setEditModalVisible(true);
                    }}>
                      <Text style={styles.actionButtonText}>‚úèÔ∏è</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteDevice(device)}>
                      <Text style={styles.actionButtonText}>Ì∑ëÔ∏è</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hist√≥rico de Presen√ßas</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderHistoryItem}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {activeTab === 'settings' && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configura√ß√£o da Rede</Text>
              <TextInput
                style={styles.input}
                placeholder="SSID da Rede"
                value={wifiConfig.ssid}
                onChangeText={(text) => setWifiConfig({ ...wifiConfig, ssid: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Senha (opcional)"
                value={wifiConfig.password}
                onChangeText={(text) => setWifiConfig({ ...wifiConfig, password: text })}
                secureTextEntry
              />
              <TouchableOpacity style={styles.button} onPress={saveWifiConfig} disabled={loading}>
                <Text style={styles.buttonText}>Salvar Configura√ß√£o</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre</Text>
              <Text style={styles.aboutText}>Vers√£o: 2.0.0</Text>
              <Text style={styles.aboutText}>Device ID: {deviceId}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Dispositivo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={editDevice?.nome_aluno}
              onChangeText={(text) => setEditDevice({ ...editDevice, nome_aluno: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Matr√≠cula"
              value={editDevice?.matricula}
              onChangeText={(text) => setEditDevice({ ...editDevice, matricula: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="ID/MAC"
              value={editDevice?.mac_address}
              onChangeText={(text) => setEditDevice({ ...editDevice, mac_address: text })}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={updateDevice}>
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteConfirmVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Exclus√£o</Text>
            <Text style={styles.confirmText}>Tem certeza que deseja excluir "{deviceToDelete?.nome_aluno}"?</Text>
            <Text style={styles.confirmWarning}>Esta a√ß√£o n√£o pode ser desfeita!</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setDeleteConfirmVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.dangerButton]} onPress={deleteDevice}>
                <Text style={styles.buttonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  loginCard: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '100%', maxWidth: 400, elevation: 3 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  manualButton: { backgroundColor: '#FF9800', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  dangerButton: { backgroundColor: '#f44336', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  adminContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#4CAF50' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  logout: { color: 'white', fontSize: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#4CAF50' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#4CAF50', fontWeight: 'bold' },
  tabContent: { flex: 1, padding: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 10, marginHorizontal: 5, alignItems: 'center', elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5, textAlign: 'center' },
  section: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  wifiInfo: { fontSize: 14, color: '#666', marginBottom: 10 },
  deviceIdText: { fontSize: 16, fontWeight: 'bold', color: '#2196F3', textAlign: 'center', marginVertical: 10 },
  deviceIdHint: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 10 },
  deviceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  deviceDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  deviceActions: { flexDirection: 'row', gap: 10 },
  editButton: { padding: 8, backgroundColor: '#2196F3', borderRadius: 8, marginHorizontal: 4 },
  deleteButton: { padding: 8, backgroundColor: '#f44336', borderRadius: 8, marginHorizontal: 4 },
  actionButtonText: { fontSize: 16 },
  historyItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  historyName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  historyInfo: { fontSize: 12, color: '#666', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', padding: 20 },
  aboutText: { fontSize: 14, color: '#666', marginBottom: 5 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 10, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10, flex: 1, marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#999' },
  modalButtons: { flexDirection: 'row', marginTop: 10 },
  confirmText: { fontSize: 16, textAlign: 'center', marginBottom: 10 },
  confirmWarning: { fontSize: 14, color: '#f44336', textAlign: 'center', marginBottom: 20 },
});

export default App;
