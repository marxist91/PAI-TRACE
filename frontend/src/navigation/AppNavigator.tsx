import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ConteneursScreen from "../screens/ConteneursScreen";
import ConteneurDetailScreen from "../screens/ConteneurDetailScreen";
import ConteneurFormScreen from "../screens/ConteneurFormScreen";
import ProfilScreen from "../screens/ProfilScreen";

// Types pour la navigation
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ConteneursStackParamList = {
  ConteneursList: undefined;
  ConteneurDetail: { conteneurId: string };
  ConteneurForm: { conteneurId?: string } | undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Conteneurs: undefined;
  Profil: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ConteneursStack = createNativeStackNavigator<ConteneursStackParamList>();
const AppTab = createBottomTabNavigator<AppTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function ConteneursNavigator() {
  return (
    <ConteneursStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#2980b9" },
        headerTintColor: "#fff",
      }}
    >
      <ConteneursStack.Screen
        name="ConteneursList"
        component={ConteneursScreen}
        options={{ title: "Conteneurs" }}
      />
      <ConteneursStack.Screen
        name="ConteneurDetail"
        component={ConteneurDetailScreen}
        options={{ title: "Détail du conteneur" }}
      />
      <ConteneursStack.Screen
        name="ConteneurForm"
        component={ConteneurFormScreen}
        options={{ title: "Conteneur" }}
      />
    </ConteneursStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppTab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#2980b9" },
        headerTintColor: "#fff",
        tabBarActiveTintColor: "#2980b9",
        tabBarInactiveTintColor: "#95a5a6",
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "help-outline";

          if (route.name === "Dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Conteneurs") {
            iconName = focused ? "cube" : "cube-outline";
          } else if (route.name === "Profil") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <AppTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Tableau de bord" }}
      />
      <AppTab.Screen
        name="Conteneurs"
        component={ConteneursNavigator}
        options={{ title: "Conteneurs", headerShown: false }}
      />
      <AppTab.Screen
        name="Profil"
        component={ProfilScreen}
        options={{ title: "Profil" }}
      />
    </AppTab.Navigator>
  );
}

export default function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
