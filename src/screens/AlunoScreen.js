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
  Alert,
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
  const [activeTab, setActiveTab] = useState('dashboard');

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
        
        if (result.status === 'registrado') {
          Alert.alert('Sucesso', 'Presença registrada automaticamente!');
          loadStats();
          loadHistorico();
        } else if (result.status === 'duplicado') {
          console.log('Presença já registrada hoje');
        }
      } catch (error) {
        console.error('Erro no registro automático:', error);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadHistorico(), loadHorario()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  };

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.presentes}</Text>
          <Text style={styles.statLabel}>Presentes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.faltas}</Text>
          <Text style={styles.statLabel}>Faltas</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.totalDias}</Text>
          <Text style={styles.statLabel}>Total Dias</Text>
        </View>
      </View>

      <View style={styles.horarioCard}>
        <Text style={styles.cardTitle}>📅 Horário da Turma</Text>
        <Text style={styles.turmaNome}>{horario.nome || 'Carregando...'}</Text>
        <Text style={styles.horarioTexto}>
          {formatTime(horario.horario_inicio)} - {formatTime(horario.horario_fim)}
        </Text>
      </View>
    </View>
  );

  const renderHistorico = () => (
    <View style={styles.historicoContainer}>
      <Text style={styles.sectionTitle}>📜 Histórico de Presenças</Text>
      {historico.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
      ) : (
        historico.map((item, index) => (
          <View key={index} style={styles.historicoItem}>
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
            {item.observacao && (
              <Text style={styles.historicoObs}>📝 {item.observacao}</Text>
            )}
          </View>
        ))
      )}
    </View>
  );

  const renderConfiguracoes = () => (
    <View style={styles.configContainer}>
      <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
      <View style={styles.configItem}>
        <Text style={styles.configLabel}>Versão do App</Text>
        <Text style={styles.configValue}>1.0.0</Text>
      </View>
      <View style={styles.configItem}>
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
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={styles.tabText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'historico' && styles.activeTab]}
          onPress={() => setActiveTab('historico')}
        >
          <Text style={styles.tabText}>Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'configuracoes' && styles.activeTab]}
          onPress={() => setActiveTab('configuracoes')}
        >
          <Text style={styles.tabText}>Configurações</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'historico' && renderHistorico()}
        {activeTab === 'configuracoes' && renderConfiguracoes()}
      </View>
    </ScrollView>
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
  },
  header: {
    backgroundColor: '#0a2b4e',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 5,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.7)',
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
    paddingVertical: 10,
    elevation: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a2b4e',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 15,
  },
  dashboardContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0a2b4e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  horarioCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  turmaNome: {
    fontSize: 16,
    color: '#0a2b4e',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  horarioTexto: {
    fontSize: 14,
    color: '#666',
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
  historicoItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
  },
  historicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historicoDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  historicoStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  historicoTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historicoTurma: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  historicoObs: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 30,
  },
  configContainer: {
    flex: 1,
  },
  configItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    borderRadius: 10,
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