import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { getDeviceId } from '../utils/wifi';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('admin@escola.com');
  const [password, setPassword] = useState('admin123');
  const [perfil, setPerfil] = useState('admin');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
        Alert.alert('Erro', 'Preencha todos os campos');
        return;
    }

    setLoading(true);
    try {
        const deviceId = await getDeviceId();
        const response = await api.login(email, password, perfil, deviceId);
        
        if (response.token) {
            await AsyncStorage.setItem('token', response.token);
            await AsyncStorage.setItem('user', JSON.stringify(response.usuario));
            
            if (perfil === 'admin') {
                navigation.replace('Admin');
            } else if (perfil === 'professor') {
                navigation.replace('Professor');
            } else {
                navigation.replace('Aluno');
            }
        }
    } catch (error) {
        Alert.alert('Erro', error.message || 'Falha no login');
    } finally {
        setLoading(false);
    }
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>📱</Text>
            <Text style={styles.title}>Frequentar</Text>
            <Text style={styles.subtitle}>Sistema de Presença por Wi-Fi</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.perfilContainer}>
              {['admin', 'professor', 'aluno'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.perfilButton, perfil === p && styles.perfilButtonActive]}
                  onPress={() => setPerfil(p)}
                >
                  <Text style={[styles.perfilText, perfil === p && styles.perfilTextActive]}>
                    {p === 'admin' ? 'Admin' : p === 'professor' ? 'Professor' : 'Aluno'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Admin: admin@escola.com / admin123
              </Text>
              <Text style={styles.footerText}>
                Professor: professor@escola.com / prof123
              </Text>
              <Text style={styles.footerText}>
                Aluno: aluno@escola.com / aluno123
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a2b4e' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 5 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logoIcon: { fontSize: 48, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0a2b4e' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  form: { gap: 15 },
  perfilContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  perfilButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center' },
  perfilButtonActive: { backgroundColor: '#0a2b4e' },
  perfilText: { fontSize: 14, color: '#333' },
  perfilTextActive: { color: '#fff', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  button: { backgroundColor: '#c5a028', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footer: { marginTop: 20, alignItems: 'center' },
  footerText: { fontSize: 11, color: '#999', marginTop: 3 }
});
