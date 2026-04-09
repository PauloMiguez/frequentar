// src/screens/AlunoScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { getWifiInfo, getDeviceId, startWifiMonitoring } from '../utils/wifi';

export default function AlunoScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ presentes: 0, faltas: 0, totalDias: 0 });
  const [historico, setHistorico] = useState([]);
  const [horario, setHorario] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, historico, configuracoes
  const [presencaStatus, setPresencaStatus] = useState(null);

  useEffect(() => {
    loadUserData();
    loadStats();
    loadHistorico();
    loadHorario();
    startAutoPresenca();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getAlunoStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
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

  const startAutoPresenca = async () => {
    const deviceId = await getDeviceId();
    const wifiInfo = await getWifiInfo();
    
    if (wifiInfo && wifiInfo.isConnected) {
      try {
        const result = await api.registrarPresencaAuto({
          mac_address: deviceId,
          ssid: wifiInfo.ssid,
          bssid: wifiInfo.bssid,
          client_ip: wifiInfo.ip
        });
        setPresencaStatus(result);
        
        if (result.status === 'registrado') {
          loadStats();
          loadHistorico();
        }
      } catch (error) {
        console.error('Erro no registro automático:', error);
        setPresencaStatus({ error: error.message });
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadHistorico(), loadHorario()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    navigation.replace('Login');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  };

  const getStatusColor = (status) => {
    return status === 'presente' ? '#4CAF50' : '#F44336';
  };

  const getStatusIcon = (status) => {
    return status === 'presente' ? '✅' : '❌';
  };

  const getStatusText = (status) => {
    return status === 'presente' ? 'Presente' : 'Ausente';
  };

  const calcularPercentual = () => {
    if (stats.totalDias === 0) return 0;
    return ((stats.presentes / stats.totalDias) * 100).toFixed(1);
  };

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      {/* Cards de Estatísticas */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.presentCard]}>
          <Text style={styles.statNumber}>{stats.presentes}</Text>
          <Text style={styles.statLabel}>Presentes</Text>
        </View>
        
        <View style={[styles.statCard, styles.absentCard]}>
          <Text style={styles.statNumber}>{stats.faltas}</Text>
          <Text style={styles.statLabel}>Faltas</Text>
        </View>
        
        <View style={[styles.statCard, styles.totalCard]}>
          <Text style={styles.statNumber}>{stats.totalDias}</Text>
          <Text style={styles.statLabel}>Total Dias</Text>
        </View>
      </View>

      {/* Barra de Progresso */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Frequência Total</Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${calcularPercentual()}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {calcularPercentual()}% de presença
        </Text>
      </View>

      {/* Informações da Turma */}
      {horario.nome && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📚 Minha Turma</Text>
          <Text style={styles.infoText}>{horario.nome}</Text>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>Horário:</Text>
            <Text style={styles.scheduleValue}>
              {formatTime(horario.horario_inicio)} - {formatTime(horario.horario_fim)}
            </Text>
          </View>
        </View>
      )}

      {/* Status do Registro */}
      {presencaStatus && (
        <View style={[
          styles.statusCard,
          presencaStatus.status === 'registrado' ? styles.successCard : styles.infoCard
        ]}>
          <Text style={styles.statusText}>
            {presencaStatus.status === 'registrado' 
              ? '✅ Presença registrada hoje!' 
              : presencaStatus.status === 'duplicado'
              ? '📝 Presença já registrada hoje'
              : presencaStatus.error?.includes('horário')
              ? '⏰ Fora do horário de aula'
              : '⚠️ ' + (presencaStatus.error || 'Aguardando conexão Wi-Fi')}
          </Text>
        </View>
      )}
    </View>
  );

  const renderHistorico = () => (
    <View style={styles.historicoContainer}>
      <Text style={styles.sectionTitle}>📜 Histórico de Presenças</Text>
      
      {historico.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
        </View>
      ) : (
        <ScrollView style={styles.historicoList}>
          {historico.map((item, index) => (
            <View key={index} style={styles.historicoItem}>
              <View style={styles.historicoHeader}>
                <View style={styles.dateContainer}>
                  <Text style={styles.historicoDate}>{formatDate(item.data)}</Text>
                  <Text style={styles.historicoTime}>{formatTime(item.hora)}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {getStatusIcon(item.status)} {getStatusText(item.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.historicoBody}>
                <Text style={styles.historicoTurma}>
                  📍 {item.turma_nome || 'Turma não informada'}
                </Text>
                {item.tipo && (
                  <Text style={styles.historicoTipo}>
                    {item.tipo === 'wifi' ? '📡 Registro automático' : '✏️ Registro manual'}
                  </Text>
                )}
                {item.observacao && (
                  <Text style={styles.historicoObs}>📝 {item.observacao}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
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
        <Text style={styles.configLabel}>Dispositivo</Text>
        <Text style={styles.configValue}>ID: {user?.id}</Text>
      </View>
      
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
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Olá,</Text>
          <Text style={styles.userName}>{user?.nome || 'Aluno'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
          <Text style={styles.logoutIconText}>🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            📊 Dashboard
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'historico' && styles.activeTab]}
          onPress={() => setActiveTab('historico')}
        >
          <Text style={[styles.tabText, activeTab === 'historico' && styles.activeTabText]}>
            📜 Histórico
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'configuracoes' && styles.activeTab]}
          onPress={() => setActiveTab('configuracoes')}
        >
          <Text style={[styles.tabText, activeTab === 'configuracoes' && styles.activeTabText]}>
            ⚙️ Config
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'historico' && renderHistorico()}
        {activeTab === 'configuracoes' && renderConfiguracoes()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#0a2b4e',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  userEmail: {
    color: '#rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  logoutIcon: {
    padding: 10,
  },
  logoutIconText: {
    fontSize: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#0a2b4e',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#0a2b4e',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  dashboardContainer: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  presentCard: {
    borderTopColor: '#4CAF50',
    borderTopWidth: 3,
  },
  absentCard: {
    borderTopColor: '#F44336',
    borderTopWidth: 3,
  },
  totalCard: {
    borderTopColor: '#2196F3',
    borderTopWidth: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#666',
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a2b4e',
  },
  statusCard: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    color: '#155724',
  },
  historicoContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  historicoList: {
    flex: 1,
  },
  historicoItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  historicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'column',
  },
  historicoDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historicoTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historicoBody: {
    padding: 12,
  },
  historicoTurma: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  historicoTipo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  historicoObs: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  configContainer: {
    flex: 1,
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 14,
    color: '#666',
  },
  configValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});