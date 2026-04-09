import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { getDeviceId, startWifiMonitoring } from '../utils/wifi';

export default function AlunoScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState({});
  const [historico, setHistorico] = useState([]);
  const [horario, setHorario] = useState({});
  const [wifiStatus, setWifiStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadUserData();
    loadDashboard();
    loadHistorico();
    loadHorario();
    startMonitoring();
  }, []);

  const loadUserData = async () => {
    const usuario = await AsyncStorage.getItem('usuario');
    if (usuario) {
      const user = JSON.parse(usuario);
      setUserName(user.nome);
      setUserEmail(user.email);
    }
  };

  const loadDashboard = async () => {
    try {
      const data = await api.getAlunoStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    }
  };

  const loadHistorico = async () => {
    try {
      const data = await api.getAlunoHistorico();
      setHistorico(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const loadHorario = async () => {
    try {
      const data = await api.getAlunoHorario();
      setHorario(data);
    } catch (error) {
      console.error('Erro ao carregar horário:', error);
    }
  };

  const startMonitoring = async () => {
    const deviceId = await getDeviceId();
    
    startWifiMonitoring(async (wifiInfo) => {
      if (wifiInfo && wifiInfo.isConnected) {
        setWifiStatus({ connected: true, ssid: wifiInfo.ssid });
        
        try {
          const result = await api.registrarPresencaAuto({
            mac_address: deviceId,
            ssid: wifiInfo.ssid,
            bssid: wifiInfo.bssid,
            client_ip: wifiInfo.ip
          });
          
          if (result.status === 'registrado') {
            Alert.alert('✅ Presença Registrada', `Você está conectado à rede ${wifiInfo.ssid}`);
            await loadDashboard();
            await loadHistorico();
          }
        } catch (error) {
          if (!error.message.includes('já registrada')) {
            console.log('Erro no registro automático:', error.message);
          }
        }
      } else {
        setWifiStatus({ connected: false });
      }
    }, 30000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadHistorico(), loadHorario()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    navigation.replace('Login');
  };

  const percentualFrequencia = stats.totalDias > 0 ? Math.round((stats.presentes / stats.totalDias) * 100) : 0;

  const renderDashboard = () => (
    <View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.presentes || 0}</Text>
          <Text style={styles.statLabel}>Presenças</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.faltas || 0}</Text>
          <Text style={styles.statLabel}>Faltas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{percentualFrequencia}%</Text>
          <Text style={styles.statLabel}>Frequência</Text>
        </View>
      </View>

      <View style={[styles.wifiCard, wifiStatus?.connected ? styles.wifiConnected : styles.wifiDisconnected]}>
        <Text style={styles.wifiTitle}>📡 Status da Conexão</Text>
        {wifiStatus?.connected ? (
          <>
            <Text style={styles.wifiStatusText}>✅ Conectado</Text>
            <Text style={styles.wifiInfo}>Rede: {wifiStatus.ssid}</Text>
            <Text style={styles.wifiNote}>Presença será registrada automaticamente</Text>
          </>
        ) : (
          <>
            <Text style={styles.wifiStatusText}>❌ Desconectado</Text>
            <Text style={styles.wifiNote}>Conecte-se à rede Wi-Fi da escola</Text>
          </>
        )}
      </View>

      {horario.horario_inicio && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⏰ Horário da Turma</Text>
          <Text style={styles.infoText}>{horario.horario_inicio.substring(0,5)} às {horario.horario_fim?.substring(0,5)}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Seu Desempenho</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percentualFrequencia}%` }]} />
        </View>
        <Text style={styles.progressText}>Frequência: {percentualFrequencia}% (Mínimo: 75%)</Text>
        <Text style={[
          styles.statusText,
          percentualFrequencia >= 75 ? styles.statusGood : percentualFrequencia >= 50 ? styles.statusWarning : styles.statusDanger
        ]}>
          {percentualFrequencia >= 75 ? '✅ Boa frequência! Continue assim!' :
           percentualFrequencia >= 50 ? '⚠️ Atenção! Sua frequência está baixa.' :
           '❌ Risco de reprovação por falta!'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📜 Últimos Registros</Text>
        {historico.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.historicoItem}>
            <Text style={styles.historicoDate}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.historicoTime}>{item.hora || '-'}</Text>
            <Text style={styles.historicoStatus}>Presente</Text>
          </View>
        ))}
        {historico.length === 0 && <Text style={styles.emptyText}>Nenhum registro encontrado</Text>}
      </View>
    </View>
  );

  const renderHistorico = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📜 Histórico Completo</Text>
      {historico.map((item, index) => (
        <View key={index} style={styles.historicoItem}>
          <Text style={styles.historicoDate}>{new Date(item.data).toLocaleDateString('pt-BR')}</Text>
          <Text style={styles.historicoTime}>{item.hora || '-'}</Text>
          <Text style={styles.historicoStatus}>Presente</Text>
          <Text style={styles.historicoTurma}>{item.turma_nome || '-'}</Text>
        </View>
      ))}
      {historico.length === 0 && <Text style={styles.emptyText}>Nenhum registro encontrado</Text>}
    </View>
  );

  const renderConfig = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>⚙️ Configurações</Text>
      <Text style={styles.configText}>Nome: {userName}</Text>
      <Text style={styles.configText}>E-mail: {userEmail}</Text>
      <Text style={styles.configText}>Versão: 1.0.0</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2b4e" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Frequentar - Aluno</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logout}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]} onPress={() => setActiveTab('dashboard')}>
              <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'historico' && styles.tabActive]} onPress={() => setActiveTab('historico')}>
              <Text style={[styles.tabText, activeTab === 'historico' && styles.tabTextActive]}>Histórico</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'config' && styles.tabActive]} onPress={() => setActiveTab('config')}>
              <Text style={[styles.tabText, activeTab === 'config' && styles.tabTextActive]}>Configurações</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'historico' && renderHistorico()}
          {activeTab === 'config' && renderConfig()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a2b4e' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#0a2b4e' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  logout: { color: '#c5a028', fontSize: 16 },
  userInfo: { backgroundColor: 'white', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 4 },
  tabBar: { backgroundColor: 'white', elevation: 2, paddingVertical: 0 },
  tab: { paddingHorizontal: 20, paddingVertical: 15 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#c5a028' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#c5a028', fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2, marginHorizontal: 5 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#0a2b4e' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  wifiCard: { borderRadius: 12, padding: 15, marginBottom: 15 },
  wifiConnected: { backgroundColor: '#d1fae5' },
  wifiDisconnected: { backgroundColor: '#fee2e2' },
  wifiTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  wifiStatusText: { fontWeight: 'bold', marginBottom: 5 },
  wifiInfo: { fontSize: 14, marginBottom: 5 },
  wifiNote: { fontSize: 12, color: '#666' },
  infoCard: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 15, marginBottom: 15 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  infoText: { fontSize: 14, color: '#92400e' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  progressBar: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden', marginVertical: 10 },
  progressFill: { height: '100%', backgroundColor: '#c5a028', borderRadius: 5 },
  progressText: { fontSize: 12, color: '#666', marginTop: 5 },
  statusText: { fontSize: 14, marginTop: 10, textAlign: 'center' },
  statusGood: { color: '#10b981' },
  statusWarning: { color: '#f59e0b' },
  statusDanger: { color: '#ef4444' },
  historicoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  historicoDate: { fontSize: 14, color: '#333', flex: 2 },
  historicoTime: { fontSize: 14, color: '#666', flex: 1 },
  historicoStatus: { fontSize: 14, color: '#10b981', flex: 1 },
  historicoTurma: { fontSize: 12, color: '#666', flex: 2 },
  emptyText: { textAlign: 'center', color: '#999', padding: 20 },
  configText: { fontSize: 14, color: '#666', marginVertical: 5 }
});
