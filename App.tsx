import React from 'react';
import { ActivityIndicator, Alert, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { colors } from './src/theme/colors';
import { SessionProvider } from './src/store/SessionContext';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import CajaScreen from './src/screens/CajaScreen';
import MesaScreen from './src/screens/MesaScreen';
import RelojScreen from './src/screens/RelojScreen';

enableScreens();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.gold,
  },
};

const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

function UserButton() {
  const { user, logout } = useAuth();
  return (
    <TouchableOpacity
      style={{ paddingHorizontal: 14 }}
      onPress={() =>
        Alert.alert('Cerrar sesión', `¿Salir de la cuenta "${user}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: logout },
        ])
      }>
      <Text style={{ color: colors.gold, fontWeight: '800' }}>👤 {user}</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <SessionProvider>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { color: colors.text, fontWeight: '900' },
            headerTintColor: colors.gold,
            headerRight: () => <UserButton />,
            tabBarActiveTintColor: colors.gold,
            tabBarInactiveTintColor: colors.textDim,
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              height: 62,
              paddingBottom: 8,
              paddingTop: 6,
            },
            tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
          }}>
          <Tab.Screen name="Caja" component={CajaScreen} options={{ title: '🪙 Caja', tabBarIcon: icon('🪙') }} />
          <Tab.Screen name="Mesa" component={MesaScreen} options={{ title: '🎲 Mesa', tabBarIcon: icon('🎲') }} />
          <Tab.Screen name="Reloj" component={RelojScreen} options={{ title: '⏱️ Reloj', tabBarIcon: icon('⏱️') }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SessionProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 56 }}>🎰</Text>
        <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />
      </View>
    );
  }
  return user ? <MainTabs /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
