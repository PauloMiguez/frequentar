import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { 
  getRedesAutorizadas, 
  verificarStatusRede, 
  startWifiMonitoring,
  tentarRegistrarPresenca,
  solicitarPermissaoLocalizacao,
  resetarTentativaDiaria
} from '../utils/wifi';

export default function AlunoScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState({ presentes: 0, faltas: 0, totalDias: 0 });
  const [historico, setHistorico] = useState([]);
  const [horario, setHorario] = useState({});
  const [statusRede, setStatusRede] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const tentativaRealizada = useRef(false);

  useEffect(() => {
    const init = async () => {
      console.log('🚀 Inicializando...');
      await solicitarPermissaoLocalizacao();
      await carregarRedesAutorizadas();
      await verificarRegistroDiario();
      loadUserData();
      loadStats();
      loadHistorico();
      loadHorario();
      iniciarMonitoramentoRede();
      
      // ÚNICA tentativa de registro
      if (!tentativaRealizada.current) {
        tentativaRealizada.current = true;
        await tentarRegistrarPresenca((resultado) => {
          // Apenas UM pop-up
          if (resultado.type === 'success') {
            Alert.alert('✅ Sucesso', resultado.message, [{ text: 'OK' }]);
            loadStats();
            loadHistorico();
          } else if (resultado.type === 'horario') {
            Alert.alert('⏰ Fora do Horário', resultado.message, [{ text: 'OK' }]);
          } else if (resultado.type === 'rede') {
            Alert.alert('📡 Rede não Autorizada', resultado.message, [{ text: 'OK' }]);
          } else if (resultado.type === 'info') {
            Alert.alert('ℹ️ Informação', resultado.message, [{ text: 'OK' }]);
          }
        });
      }
    };
    init();
  }, []);

  const verificarRegistroDiario = async () => {
    const ultimoReset = await AsyncStorage.getItem('ultimoResetData');
    const hoje = new Date().toISOString().split('T')[0];
    if (ultimoReset !== hoje) {
      resetarTentativaDiaria();
      await AsyncStorage.setItem('ultimoResetData', hoje);
      tentativaRealizada.current = false;
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.nome || 'Aluno');
        setUserEmail(user.email || '');
      }
    } catch (error) {}
  };

  const loadStats = async () => {
    try {
      const data = await api.getAlunoStats();
      setStats({
        presentes: data.presentes || 0,
        faltas: data.faltas || 0,
        totalDias: data.totalDias || 0
      });
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  const loadHistorico = async () => {
    try {
      const data = await api.getAlunoHistorico();
      setHistorico(data || []);
    } catch (error) {}
  };

  const loadHorario = async () => {
    try {
      const data = await api.getAlunoHorario();
      setHorario(data || {});
    } catch (error) {}
  };

  const carregarRedesAutorizadas = async () => {
    try {
      await getRedesAutorizadas(true);
    } catch (error) {}
  };

  const iniciarMonitoramentoRede = () => {
    const stopMonitoring = startWifiMonitoring((status) => {
      setStatusRede(status);
    });
    return stopMonitoring;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadHistorico(), loadHorario(), carregarRedesAutorizadas()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        navigation.replace('Login');
      }}
    ]);
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');
  const formatTime = (timeString) => timeString?.substring(0, 5) || '--:--';
  const calcularPercentual = () => stats.totalDias === 0 ? 0 : ((stats.presentes / stats.totalDias) * 100).toFixed(1);

  const renderStatusConexao = () => {
    if (!statusRede) {
      return (
        <View style={styles.statusCard}>
          <ActivityIndicator size="small" color="#0a2b4e" />
          <Text style={styles.statusMessage}>Verificando conexão...</Text>
        </View>
      );
    }
    if (!statusRede.conectado) {
      return (
        <View style={[styles.statusCard, styles.statusWarning]}>
          <Text style={styles.statusIcon}>📡</Text>
          <Text style={styles.statusTitle}>Sem conexão Wi-Fi</Text>
          <Text style={styles.statusMessage}>Conecte-se à rede Wi-Fi da escola</Text>
        </View>
      );
    }
    if (statusRede.valida) {
      return (
        <View style={[styles.statusCard, styles.statusSuccess]}>
          <Text style={styles.statusIcon}>✅</Text>
          <Text style={styles.statusTitle}>Rede Autorizada</Text>
          <Text style={styles.statusMessage}>{statusRede.message}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusCard, styles.statusError]}>
        <Text style={styles.statusIcon}>❌</Text>
        <Text style={styles.statusTitle}>Rede não autorizada</Text>
        <Text style={styles.statusMessage}>Conecte-se à rede oficial da escola</Text>
      </View>
    );
  };

  const renderDashboard = () => (
    <View>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}><Text style={styles.statNumber}>{stats.presentes}</Text><Text style={styles.statLabel}>Presenças</Text></View>
        <View style={styles.statBox}><Text style={styles.statNumber}>{stats.faltas}</Text><Text style={styles.statLabel}>Faltas</Text></View>
        <View style={styles.statBox}><Text style={styles.statNumber}>{calcularPercentual()}%</Text><Text style={styles.statLabel}>Frequência</Text></View>
      </View>
      {renderStatusConexao()}
      {horario.nome && (
        <View style={styles.horarioCard}>
          <Text style={styles.cardTitle}>📅 Horário da Turma</Text>
          <Text style={styles.turmaNome}>{horario.nome}</Text>
          <Text style={styles.horarioTexto}>{formatTime(horario.horario_inicio)} às {formatTime(horario.horario_fim)}</Text>
        </View>
      )}
      <View style={styles.desempenhoCard}>
        <Text style={styles.cardTitle}>📊 Seu Desempenho</Text>
        <Text style={styles.desempenhoTexto}>Frequência: {calcularPercentual()}% (Mínimo: 75%)</Text>
        {parseFloat(calcularPercentual()) >= 75 ? (
          <Text style={styles.desempenhoSucesso}>✅ Boa frequência! Continue assim!</Text>
        ) : (
          <Text style={styles.desempenhoAlerta}>⚠️ Frequência abaixo do ideal!</Text>
        )}
      </View>
    </View>
  );

  const renderHistorico = () => (
    <View>
      <Text style={styles.sectionTitle}>📜 Histórico Completo</Text>
      {historico.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
      ) : (
        historico.map((item, index) => (
          <View key={index} style={styles.historicoItem}>
            <View style={styles.historicoHeader}>
              <Text style={styles.historicoDate}>{formatDate(item.data)}</Text>
              <Text style={styles.historicoTime}>{formatTime(item.hora)}</Text>
              <Text style={[styles.historicoStatus, { color: item.status === 'presente' ? '#4CAF50' : '#F44336' }]}>
                {item.status === 'presente' ? 'Presente' : 'Ausente'}
              </Text>
            </View>
            <Text style={styles.historicoTurma}>📍 {item.turma_nome || 'Turma não informada'}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderConfiguracoes = () => (
    <View>
      <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
      <View style={styles.configItem}><Text style={styles.configLabel}>Versão</Text><Text style={styles.configValue}>1.0.0</Text></View>
      <View style={styles.configItem}><Text style={styles.configLabel}>Aluno</Text><Text style={styles.configValue}>{userName}</Text></View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a2b4e" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2b4e" />
      <View style={styles.header}>
        <View><Text style={styles.welcomeText}>Olá,</Text><Text style={styles.userName}>{userName}</Text><Text style={styles.userEmail}>{userEmail}</Text></View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}><Text style={styles.logoutIconText}>🚪</Text></TouchableOpacity>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]} onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'historico' && styles.activeTab]} onPress={() => setActiveTab('historico')}>
          <Text style={[styles.tabText, activeTab === 'historico' && styles.activeTabText]}>Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'configuracoes' && styles.activeTab]} onPress={() => setActiveTab('configuracoes')}>
          <Text style={[styles.tabText, activeTab === 'configuracoes' && styles.activeTabText]}>Config</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'historico' && renderHistorico()}
        {activeTab === 'configuracoes' && renderConfiguracoes()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#0a2b4e', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  userName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  userEmail: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  logoutIcon: { padding: 10 },
  logoutIconText: { fontSize: 24 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, elevation: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#0a2b4e' },
  tabText: { fontSize: 14, color: '#666' },
  activeTabText: { color: '#0a2b4e', fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 15, marginHorizontal: 5, alignItems: 'center', elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#0a2b4e' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  statusCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, alignItems: 'center', elevation: 2 },
  statusSuccess: { backgroundColor: '#d4edda', borderWidth: 1, borderColor: '#c3e6cb' },
  statusWarning: { backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffeeba' },
  statusError: { backgroundColor: '#f8d7da', borderWidth: 1, borderColor: '#f5c6cb' },
  statusIcon: { fontSize: 32, marginBottom: 8 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  statusMessage: { fontSize: 14, textAlign: 'center', color: '#555' },
  horarioCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  turmaNome: { fontSize: 16, color: '#0a2b4e', fontWeight: 'bold', marginBottom: 5 },
  horarioTexto: { fontSize: 14, color: '#666' },
  desempenhoCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2 },
  desempenhoTexto: { fontSize: 14, color: '#555', marginBottom: 8 },
  desempenhoSucesso: { fontSize: 14, color: '#4CAF50', fontWeight: 'bold' },
  desempenhoAlerta: { fontSize: 14, color: '#F44336', fontWeight: 'bold' },
  historicoItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  historicoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historicoDate: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  historicoTime: { fontSize: 12, color: '#666' },
  historicoStatus: { fontSize: 14, fontWeight: 'bold' },
  historicoTurma: { fontSize: 12, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30 },
  configItem: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  configLabel: { fontSize: 14, color: '#666' },
  configValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  logoutButton: { backgroundColor: '#F44336', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 20 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
