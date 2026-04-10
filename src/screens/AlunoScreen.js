import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
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
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState({ presentes: 0, faltas: 0, totalDias: 0 });
  const [historico, setHistorico] = useState([]);
  const [horario, setHorario] = useState({});
  const [statusRede, setStatusRede] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  const tentativaRealizada = useRef(false);

  // Buscar dados do usuário DIRETAMENTE do backend via API
  const loadUserDataFromBackend = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      console.log('📡 Buscando dados atualizados do usuário no backend...');
      
      // Buscar perfil atualizado do backend
      const perfil = await api.getPerfil();
      console.log('📥 Perfil recebido:', perfil);
      
      if (perfil && perfil.nome) {
        // Salvar no AsyncStorage para cache
        const userData = {
          id: perfil.id,
          nome: perfil.nome,
          email: perfil.email,
          matricula: perfil.matricula,
          perfil: perfil.perfil
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        // Atualizar estados
        setUserFullName(perfil.nome);
        const primeiroNome = perfil.nome.split(' ')[0];
        setUserName(primeiroNome);
        setUserEmail(perfil.email || '');
        
        console.log('✅ Nome atualizado:', { primeiroNome, nomeCompleto: perfil.nome });
      } else {
        // Fallback para dados do cache
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setUserFullName(user.nome || 'Aluno');
          setUserName(user.nome ? user.nome.split(' ')[0] : 'Aluno');
          setUserEmail(user.email || '');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      // Fallback para dados do cache
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserFullName(user.nome || 'Aluno');
        setUserName(user.nome ? user.nome.split(' ')[0] : 'Aluno');
        setUserEmail(user.email || '');
      }
    }
  };

  // Carregar estatísticas do backend
  const loadStats = async () => {
    try {
      const data = await api.getAlunoStats();
      setStats({
        presentes: data.presentes || 0,
        faltas: data.faltas || 0,
        totalDias: data.totalDias || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Carregar histórico do backend
  const loadHistorico = async () => {
    try {
      const data = await api.getAlunoHistorico();
      setHistorico(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  // Carregar horário do backend
  const loadHorario = async () => {
    try {
      const data = await api.getAlunoHorario();
      setHorario(data || {});
    } catch (error) {
      console.error('Erro ao carregar horário:', error);
    }
  };

  // Carregar TODOS os dados
  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadUserDataFromBackend(),
      loadStats(),
      loadHistorico(),
      loadHorario()
    ]);
    setLoading(false);
  };

  // Recarregar dados ao focar na tela (quando volta do admin)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Tela do aluno em foco - recarregando dados do backend...');
      loadAllData();
      return () => {};
    }, [])
  );

  // Carregar redes autorizadas
  const carregarRedesAutorizadas = async () => {
    try {
      await getRedesAutorizadas(true);
    } catch (error) {}
  };

  // Inicialização
  useEffect(() => {
    const init = async () => {
      console.log('🚀 Inicializando tela do aluno...');
      await solicitarPermissaoLocalizacao();
      await carregarRedesAutorizadas();
      await verificarRegistroDiario();
      await loadAllData();
      iniciarMonitoramentoRede();
      
      if (!tentativaRealizada.current) {
        tentativaRealizada.current = true;
        await tentarRegistrarPresenca((resultado) => {
          if (resultado.type === 'success') {
            Alert.alert('✅ Sucesso', resultado.message, [{ text: 'OK' }]);
            loadAllData();
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

  const iniciarMonitoramentoRede = () => {
    const stopMonitoring = startWifiMonitoring((status) => {
      setStatusRede(status);
    });
    return stopMonitoring;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    await carregarRedesAutorizadas();
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

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.presentes}</Text>
        <Text style={styles.statLabel}>PRESENÇAS</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.faltas}</Text>
        <Text style={styles.statLabel}>FALTAS</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{calcularPercentual()}%</Text>
        <Text style={styles.statLabel}>FREQUÊNCIA</Text>
      </View>
    </View>
  );

  const renderStatusConexao = () => {
    if (!statusRede) {
      return (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>🔍 Verificando conexão...</Text>
        </View>
      );
    }
    if (!statusRede.conectado) {
      return (
        <View style={[styles.infoCard, styles.warningCard]}>
          <Text style={styles.infoText}>📡 Sem conexão Wi-Fi</Text>
          <Text style={styles.infoSubtext}>Conecte-se à rede da escola</Text>
        </View>
      );
    }
    if (statusRede.valida) {
      return (
        <View style={[styles.infoCard, styles.successCard]}>
          <Text style={styles.infoText}>✅ Rede Autorizada</Text>
          <Text style={styles.infoSubtext}>{statusRede.redeAtual?.ssid}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.infoCard, styles.errorCard]}>
        <Text style={styles.infoText}>❌ Rede não autorizada</Text>
        <Text style={styles.infoSubtext}>Conecte-se à rede oficial da escola</Text>
      </View>
    );
  };

  const renderHorario = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>📅 Horário da Turma</Text>
      <Text style={styles.infoValue}>{horario.nome || 'Carregando...'}</Text>
      <Text style={styles.infoSubtext}>
        {formatTime(horario.horario_inicio)} às {formatTime(horario.horario_fim)}
      </Text>
    </View>
  );

  const renderDesempenho = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>📊 Seu Desempenho</Text>
      <Text style={styles.infoValue}>Frequência: {calcularPercentual()}%</Text>
      <Text style={styles.infoSubtext}>Mínimo necessário: 75%</Text>
      {parseFloat(calcularPercentual()) >= 75 ? (
        <Text style={styles.successText}>✅ Boa frequência! Continue assim!</Text>
      ) : (
        <Text style={styles.warningText}>⚠️ Frequência abaixo do ideal!</Text>
      )}
    </View>
  );

  const renderHistorico = () => (
    <View style={styles.historicoContainer}>
      <Text style={styles.sectionTitle}>📜 Histórico de Presenças</Text>
      {historico.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
        </View>
      ) : (
        historico.map((item, index) => (
          <View key={index} style={styles.historicoCard}>
            <View style={styles.historicoHeader}>
              <Text style={styles.historicoDate}>{formatDate(item.data)}</Text>
              <Text style={[
                styles.historicoStatus,
                { color: item.status === 'presente' ? '#4CAF50' : '#F44336' }
              ]}>
                {item.status === 'presente' ? '✓ Presente' : '✗ Ausente'}
              </Text>
            </View>
            <Text style={styles.historicoTime}>⏰ {formatTime(item.hora)}</Text>
            <Text style={styles.historicoTurma}>📍 {item.turma_nome || 'Turma não informada'}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderConfiguracoes = () => (
    <View style={styles.configContainer}>
      <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
      <View style={styles.configCard}>
        <Text style={styles.configLabel}>Versão do App</Text>
        <Text style={styles.configValue}>1.0.0</Text>
      </View>
      <View style={styles.configCard}>
        <Text style={styles.configLabel}>Aluno</Text>
        <Text style={styles.configValue}>{userFullName}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a2b4e" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2b4e" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Frequentar</Text>
          <Text style={styles.headerSubtitle}>Olá, {userName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
          <Text style={styles.logoutIconText}>🚪</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuBar}>
        <TouchableOpacity 
          style={[styles.menuItem, activeMenu === 'dashboard' && styles.activeMenuItem]}
          onPress={() => setActiveMenu('dashboard')}
        >
          <Text style={[styles.menuText, activeMenu === 'dashboard' && styles.activeMenuText]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.menuItem, activeMenu === 'historico' && styles.activeMenuItem]}
          onPress={() => setActiveMenu('historico')}
        >
          <Text style={[styles.menuText, activeMenu === 'historico' && styles.activeMenuText]}>Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.menuItem, activeMenu === 'configuracoes' && styles.activeMenuItem]}
          onPress={() => setActiveMenu('configuracoes')}
        >
          <Text style={[styles.menuText, activeMenu === 'configuracoes' && styles.activeMenuText]}>Configurações</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeMenu === 'dashboard' && (
          <View>
            {renderStatsCards()}
            {renderStatusConexao()}
            {renderHorario()}
            {renderDesempenho()}
          </View>
        )}
        {activeMenu === 'historico' && renderHistorico()}
        {activeMenu === 'configuracoes' && renderConfiguracoes()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#0a2b4e', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutIcon: { padding: 8 },
  logoutIconText: { fontSize: 24 },
  menuBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, elevation: 2 },
  menuItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  activeMenuItem: { borderBottomWidth: 2, borderBottomColor: '#0a2b4e' },
  menuText: { fontSize: 14, color: '#666' },
  activeMenuText: { color: '#0a2b4e', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 4, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#0a2b4e' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4, fontWeight: '500' },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
  warningCard: { backgroundColor: '#fff3cd', borderLeftWidth: 4, borderLeftColor: '#ffc107' },
  successCard: { backgroundColor: '#d4edda', borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  errorCard: { backgroundColor: '#f8d7da', borderLeftWidth: 4, borderLeftColor: '#F44336' },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  infoValue: { fontSize: 16, color: '#0a2b4e', fontWeight: '500', marginBottom: 4 },
  infoText: { fontSize: 14, color: '#555', marginBottom: 4 },
  infoSubtext: { fontSize: 12, color: '#666' },
  successText: { fontSize: 13, color: '#4CAF50', marginTop: 8, fontWeight: '500' },
  warningText: { fontSize: 13, color: '#F44336', marginTop: 8, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  historicoContainer: { flex: 1 },
  historicoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1 },
  historicoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historicoDate: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  historicoStatus: { fontSize: 14, fontWeight: 'bold' },
  historicoTime: { fontSize: 12, color: '#666', marginBottom: 4 },
  historicoTurma: { fontSize: 12, color: '#666' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999' },
  configContainer: { flex: 1 },
  configCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  configLabel: { fontSize: 14, color: '#666' },
  configValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  logoutButton: { backgroundColor: '#F44336', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
