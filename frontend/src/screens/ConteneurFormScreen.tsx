import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ConteneursStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import {
  Conteneur,
  Consignataire,
  consignataireService,
  conteneurService,
} from "../services/api";

type Props = NativeStackScreenProps<ConteneursStackParamList, "ConteneurForm">;

const STATUTS = [
  "EN_ATTENTE",
  "CHEZ_CONSIGNATAIRE",
  "EN_TRANSIT_VERS_TERMINAL",
  "AU_TERMINAL",
  "DECHARGE_SOUS_PALAN",
  "EN_TRANSIT_VERS_PIA",
  "ARRIVE_PIA",
  "STOCKE_PIA",
  "DOUANE",
  "LIVRE",
];

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CHEZ_CONSIGNATAIRE: "Chez consignataire",
  EN_TRANSIT_VERS_TERMINAL: "En transit vers terminal",
  AU_TERMINAL: "Au terminal",
  DECHARGE_SOUS_PALAN: "Déchargé sous palan",
  EN_TRANSIT_VERS_PIA: "En transit vers PIA",
  ARRIVE_PIA: "Arrivé à la PIA",
  STOCKE_PIA: "Stocké à la PIA",
  DOUANE: "En douane",
  LIVRE: "Livré",
};

interface FormData {
  numeroBL: string;
  consignataireId: string;
  clientEmail: string;
  destination: string;
  typeMarchandise: string;
  dateArrivee: string;
  statut: string;
}

const INITIAL_FORM: FormData = {
  numeroBL: "",
  consignataireId: "",
  clientEmail: "",
  destination: "",
  typeMarchandise: "",
  dateArrivee: "",
  statut: "EN_ATTENTE",
};

function formatDateForInput(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export default function ConteneurFormScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const conteneurId = route.params?.conteneurId;
  const isEdit = !!conteneurId;
  const isLogisticien = user?.role === "LOGISTICIEN";

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [consignataires, setConsignataires] = useState<Consignataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLogisticien) {
      Alert.alert(
        "Accès refusé",
        "Seuls les logisticiens peuvent créer ou modifier des conteneurs.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
      return;
    }

    const loadData = async () => {
      try {
        const [consignatairesData, conteneurData] = await Promise.all([
          consignataireService.getAll(),
          isEdit ? conteneurService.getById(Number(conteneurId)) : Promise.resolve(null),
        ]);

        setConsignataires(consignatairesData);

        if (conteneurData) {
          setForm({
            numeroBL: conteneurData.numeroBL,
            consignataireId: String(conteneurData.consignataire.id),
            clientEmail: conteneurData.client.email,
            destination: conteneurData.destination,
            typeMarchandise: conteneurData.typeMarchandise,
            dateArrivee: formatDateForInput(conteneurData.dateArrivee),
            statut: conteneurData.statut,
          });
        }
      } catch (error: any) {
        Alert.alert(
          "Erreur",
          error.response?.data?.error || "Impossible de charger les données",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isLogisticien, isEdit, conteneurId, navigation]);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.numeroBL.trim()) {
      Alert.alert("Erreur", "Le numéro de B/L est requis");
      return false;
    }
    if (!form.consignataireId) {
      Alert.alert("Erreur", "Veuillez sélectionner un consignataire");
      return false;
    }
    if (!form.clientEmail.trim()) {
      Alert.alert("Erreur", "L'email du client est requis");
      return false;
    }
    if (!form.destination.trim()) {
      Alert.alert("Erreur", "La destination est requise");
      return false;
    }
    if (!form.typeMarchandise.trim()) {
      Alert.alert("Erreur", "Le type de marchandise est requis");
      return false;
    }
    if (!form.dateArrivee.trim()) {
      Alert.alert("Erreur", "La date d'arrivée est requise");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        consignataireId: Number(form.consignataireId),
        dateArrivee: new Date(form.dateArrivee).toISOString(),
      };

      if (isEdit) {
        await conteneurService.update(Number(conteneurId), payload);
      } else {
        await conteneurService.create(payload);
      }

      Alert.alert(
        "Succès",
        isEdit
          ? "Conteneur modifié avec succès"
          : "Conteneur créé avec succès",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.response?.data?.error || "Impossible de sauvegarder le conteneur",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {isEdit ? "Modifier le conteneur" : "Nouveau conteneur"}
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Numéro de B/L *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: MSCU-4829173"
            placeholderTextColor="#999"
            value={form.numeroBL}
            onChangeText={(value) => updateForm("numeroBL", value)}
            autoCapitalize="characters"
            editable={!saving && !isEdit}
          />

          <Text style={styles.label}>Consignataire *</Text>
          <View style={styles.selectRow}>
            {consignataires.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.selectBtn,
                  form.consignataireId === String(c.id) && styles.selectBtnActive,
                ]}
                onPress={() => updateForm("consignataireId", String(c.id))}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.selectBtnText,
                    form.consignataireId === String(c.id) && styles.selectBtnTextActive,
                  ]}
                >
                  {c.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Email du client *</Text>
          <TextInput
            style={styles.input}
            placeholder="client@example.com"
            placeholderTextColor="#999"
            value={form.clientEmail}
            onChangeText={(value) => updateForm("clientEmail", value)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!saving}
          />

          <Text style={styles.label}>Destination *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ouagadougou"
            placeholderTextColor="#999"
            value={form.destination}
            onChangeText={(value) => updateForm("destination", value)}
            editable={!saving}
          />

          <Text style={styles.label}>Type de marchandise *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Marchandises diverses"
            placeholderTextColor="#999"
            value={form.typeMarchandise}
            onChangeText={(value) => updateForm("typeMarchandise", value)}
            editable={!saving}
          />

          <Text style={styles.label}>Date d'arrivée *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
            value={form.dateArrivee}
            onChangeText={(value) => updateForm("dateArrivee", value)}
            editable={!saving}
          />

          {isEdit && (
            <>
              <Text style={styles.label}>Statut</Text>
              <View style={styles.statusGrid}>
                {STATUTS.map((statut) => (
                  <TouchableOpacity
                    key={statut}
                    style={[
                      styles.statusBtn,
                      form.statut === statut && styles.statusBtnActive,
                    ]}
                    onPress={() => updateForm("statut", statut)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        form.statut === statut && styles.statusBtnTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {STATUT_LABELS[statut]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? "Enregistrer les modifications" : "Créer le conteneur"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dcdde1",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
    color: "#2c3e50",
  },
  selectRow: {
    flexDirection: "row",
    gap: 10,
  },
  selectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dcdde1",
    backgroundColor: "#fafafa",
    alignItems: "center",
  },
  selectBtnActive: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#7f8c8d",
  },
  selectBtnTextActive: {
    color: "#fff",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dcdde1",
    backgroundColor: "#fafafa",
  },
  statusBtnActive: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7f8c8d",
  },
  statusBtnTextActive: {
    color: "#fff",
  },
  saveBtn: {
    backgroundColor: "#2980b9",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: {
    backgroundColor: "#7fb3d8",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
