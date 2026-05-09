import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
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
import { colors, globalStyles } from '../styles/globalStyles';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import StatCard from '../components/StatCard';
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

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'historico', label: 'Histórico' },
    { key: 'configuracoes', label: 'Configurações' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadUserDataFromBackend();
      loadStats();
      loadHistorico();
      loadHorario();
      carregarRedesAutorizadas();
      iniciarMonitoramentoRede();
    }, [])
  );

  useEffect(() => {
    const init = async () => {
      await solicitarPermissaoLocalizacao();
      await carregarRedesAutorizadas();
      await verificarRegistroDiario();
      loadUserDataFromBackend();
      loadStats();
      loadHistorico();
      loadHorario();
      iniciarMonitoramentoRede();
      
      if (!tentativaRealizada.current) {
        tentativaRealizada.current = true;
        await tentarRegistrarPresenca((resultado) => {
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

  const loadUserDataFromBackend = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const perfil = await api.getPerfil();
      if (perfil && perfil.nome) {
        const userData = { id: perfil.id, nome: perfil.nome, email: perfil.email };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUserFullName(perfil.nome);
        setUserName(perfil.nome.split(' ')[0]);
        setUserEmail(perfil.email || '');
      } else {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setUserFullName(user.nome || 'Aluno');
          setUserName(user.nome ? user.nome.split(' ')[0] : 'Aluno');
          setUserEmail(user.email || '');
        }
      }
    } catch (error) {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserFullName(user.nome || 'Aluno');
        setUserName(user.nome ? user.nome.split(' ')[0] : 'Aluno');
        setUserEmail(user.email || '');
      }
    }
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
        <View style={globalStyles.infoCard}>
          <Text style={globalStyles.infoText}>🔍 Verificando conexão...</Text>
        </View>
      );
    }
    if (!statusRede.conectado) {
      return (
        <View style={[globalStyles.infoCard, globalStyles.statusWarning]}>
          <Text style={globalStyles.statusIcon}>📡</Text>
          <Text style={globalStyles.statusTitle}>Sem conexão Wi-Fi</Text>
          <Text style={globalStyles.statusMessage}>Conecte-se à rede Wi-Fi da escola</Text>
        </View>
      );
    }
    if (statusRede.valida) {
      return (
        <View style={[globalStyles.infoCard, globalStyles.statusSuccess]}>
          <Text style={globalStyles.statusIcon}>✅</Text>
          <Text style={globalStyles.statusTitle}>Rede Autorizada</Text>
          <Text style={globalStyles.statusMessage}>{statusRede.redeAtual?.ssid}</Text>
        </View>
      );
    }
    return (
      <View style={[globalStyles.infoCard, globalStyles.statusError]}>
        <Text style={globalStyles.statusIcon}>❌</Text>
        <Text style={globalStyles.statusTitle}>Rede não autorizada</Text>
        <Text style={globalStyles.statusMessage}>Conecte-se à rede oficial da escola</Text>
      </View>
    );
  };

  const renderDashboard = () => (
    <View>
      <View style={globalStyles.statsContainer}>
        <StatCard value={stats.presentes} label="PRESENÇAS" />
        <StatCard value={stats.faltas} label="FALTAS" />
      </View>
      <View style={globalStyles.statsContainer}>
        <StatCard value={`${calcularPercentual()}%`} label="FREQUÊNCIA" />
        <StatCard value={stats.totalDias} label="TOTAL DIAS" />
      </View>
      
      {renderStatusConexao()}
      
      {horario.nome && (
        <View style={globalStyles.infoCard}>
          <Text style={globalStyles.infoTitle}>📅 Horário da Turma</Text>
          <Text style={globalStyles.infoValue}>{horario.nome}</Text>
          <Text style={globalStyles.infoSubtext}>
            {formatTime(horario.horario_inicio)} às {formatTime(horario.horario_fim)}
          </Text>
        </View>
      )}
      
      <View style={globalStyles.infoCard}>
        <Text style={globalStyles.infoTitle}>📊 Seu Desempenho</Text>
        <Text style={globalStyles.infoText}>Frequência: {calcularPercentual()}% (Mínimo: 75%)</Text>
        {parseFloat(calcularPercentual()) >= 75 ? (
          <Text style={{ color: colors.success, marginTop: 8 }}>✅ Boa frequência! Continue assim!</Text>
        ) : (
          <Text style={{ color: colors.error, marginTop: 8 }}>⚠️ Frequência abaixo do ideal!</Text>
        )}
      </View>
    </View>
  );

  const renderHistorico = () => (
    <View>
      <Text style={globalStyles.sectionTitle}>📜 Histórico de Presenças</Text>
      {historico.length === 0 ? (
        <View style={globalStyles.emptyCard}>
          <Text style={globalStyles.emptyText}>Nenhum registro encontrado</Text>
        </View>
      ) : (
        historico.map((item, index) => (
          <View key={index} style={globalStyles.listItem}>
            <View style={globalStyles.listItemContent}>
              <Text style={globalStyles.listItemTitle}>{formatDate(item.data)}</Text>
              <Text style={globalStyles.listItemSub}>⏰ {formatTime(item.hora)}</Text>
              <Text style={globalStyles.listItemSub}>📍 {item.turma_nome || 'Turma não informada'}</Text>
            </View>
            <View style={[globalStyles.listItemBadge, { backgroundColor: item.status === 'presente' ? '#d4edda' : '#f8d7da' }]}>
              <Text style={{ color: item.status === 'presente' ? colors.success : colors.error }}>
                {item.status === 'presente' ? '✓ Presente' : '✗ Ausente'}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderConfiguracoes = () => (
    <View>
      <Text style={globalStyles.sectionTitle}>⚙️ Configurações</Text>
      <View style={globalStyles.configCard}>
        <Text style={globalStyles.configLabel}>Versão do App</Text>
        <Text style={globalStyles.configValue}>1.0.0</Text>
      </View>
      <View style={globalStyles.configCard}>
        <Text style={globalStyles.configLabel}>Aluno</Text>
        <Text style={globalStyles.configValue}>{userFullName}</Text>
      </View>
      <TouchableOpacity style={globalStyles.logoutButton} onPress={handleLogout}>
        <Text style={globalStyles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <Header 
        title="Frequentar" 
        subtitle={`Olá, ${userName}`}
        onLogout={handleLogout}
      />
      
      <TabBar tabs={tabs} activeTab={activeMenu} onTabPress={setActiveMenu} />
      
      <ScrollView 
        style={globalStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeMenu === 'dashboard' && renderDashboard()}
        {activeMenu === 'historico' && renderHistorico()}
        {activeMenu === 'configuracoes' && renderConfiguracoes()}
      </ScrollView>
    </SafeAreaView>
  );
}
