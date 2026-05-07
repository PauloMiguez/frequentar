import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';

// Telas
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfessorScreen from './src/screens/ProfessorScreen';
import AlunoScreen from './src/screens/AlunoScreen';

const Stack = createStackNavigator();

export default function App() {
  // Sempre iniciar na tela de login
  // O token será gerenciado pelo LoginScreen
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a2b4e" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Professor" component={ProfessorScreen} />
          <Stack.Screen name="Aluno" component={AlunoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
