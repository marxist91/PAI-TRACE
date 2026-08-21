import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"CLIENT" | "LOGISTICIEN">("CLIENT");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nom.trim() || !prenom.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        nom: nom.trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim() || undefined,
        role,
      });
    } catch (error: any) {
      const message =
        error.response?.data?.error || "Erreur lors de l'inscription";
      Alert.alert("Erreur d'inscription", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Rejoignez la plateforme PIA Traçabilité
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre nom"
              placeholderTextColor="#999"
              value={nom}
              onChangeText={setNom}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>Prénom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre prénom"
              placeholderTextColor="#999"
              value={prenom}
              onChangeText={setPrenom}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="+228 XX XX XX XX"
              placeholderTextColor="#999"
              value={telephone}
              onChangeText={setTelephone}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 caractères"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Répétez le mot de passe"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />

            <Text style={styles.label}>Type de compte</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "CLIENT" && styles.roleButtonActive,
                ]}
                onPress={() => setRole("CLIENT")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === "CLIENT" && styles.roleButtonTextActive,
                  ]}
                >
                  Client
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "LOGISTICIEN" && styles.roleButtonActive,
                ]}
                onPress={() => setRole("LOGISTICIEN")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === "LOGISTICIEN" && styles.roleButtonTextActive,
                  ]}
                >
                  Logisticien
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Déjà un compte ?{" "}
              <Text style={styles.linkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 25,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dcdde1",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#2c3e50",
  },
  roleContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dcdde1",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  roleButtonActive: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#2980b9",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#7fb3d8",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  linkBold: {
    color: "#2980b9",
    fontWeight: "bold",
  },
});
