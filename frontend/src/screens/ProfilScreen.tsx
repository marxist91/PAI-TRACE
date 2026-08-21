import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function ProfilScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar et nom */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.prenom?.[0] || user?.nom?.[0] || "U").toUpperCase()}
          </Text>
        </View>
        <Text style={styles.fullName}>
          {user?.prenom} {user?.nom}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === "LOGISTICIEN" ? "👨‍💼 Logisticien" : "👤 Client"}
          </Text>
        </View>
      </View>

      {/* Informations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rôle</Text>
            <Text style={styles.infoValue}>
              {user?.role === "LOGISTICIEN" ? "Logisticien" : "Client"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{user?.telephone || "N/A"}</Text>
          </View>
        </View>
      </View>

      {/* À propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>Projet PIA - Traçabilité des conteneurs</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  fullName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#eaf2f8",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    color: "#2980b9",
    fontWeight: "500",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2c3e50",
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: "#bdc3c7",
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
