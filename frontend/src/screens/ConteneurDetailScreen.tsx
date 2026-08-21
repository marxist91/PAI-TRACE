import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ConteneursStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { Conteneur, Checkpoint, conteneurService } from "../services/api";

type Props = NativeStackScreenProps<ConteneursStackParamList, "ConteneurDetail">;

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: "#f39c12",
  CHEZ_CONSIGNATAIRE: "#9b59b6",
  EN_TRANSIT_VERS_TERMINAL: "#3498db",
  AU_TERMINAL: "#3498db",
  DECHARGE_SOUS_PALAN: "#e67e22",
  EN_TRANSIT_VERS_PIA: "#3498db",
  ARRIVE_PIA: "#2ecc71",
  STOCKE_PIA: "#2ecc71",
  DOUANE: "#1abc9c",
  LIVRE: "#95a5a6",
};

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

const CHECKPOINT_TYPES: Record<string, string> = {
  CONSIGNATAIRE: "Consignataire",
  TERMINAL_LCT: "Terminal LCT",
  TERMINAL_TOGO: "Terminal Togo",
  PIA: "PIA (Port Sec)",
};

const CHECKPOINT_OPTIONS = [
  { type: "CONSIGNATAIRE", label: "Consignataire", lieu: "Port de Lomé", statut: "RECEPTION", icon: "business-outline" },
  { type: "TERMINAL_LCT", label: "Terminal LCT", lieu: "Lomé Container Terminal", statut: "CONTROLE_TERMINAL", icon: "boat-outline" },
  { type: "TERMINAL_TOGO", label: "Togo Terminal", lieu: "Togo Terminal", statut: "CONTROLE_TERMINAL", icon: "boat-outline" },
  { type: "PIA", label: "PIA - Port sec", lieu: "PIA - Port sec", statut: "ARRIVEE", icon: "location-outline" },
] as const;

export default function ConteneurDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { conteneurId } = route.params;
  const isLogisticien = user?.role === "LOGISTICIEN";

  const [conteneur, setConteneur] = useState<Conteneur | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [checkpointType, setCheckpointType] = useState<(typeof CHECKPOINT_OPTIONS)[number]["type"]>("CONSIGNATAIRE");
  const [checkpointNotes, setCheckpointNotes] = useState("");
  const [checkpointSaving, setCheckpointSaving] = useState(false);

  const loadConteneur = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await conteneurService.getById(Number(conteneurId));
      setConteneur(data);
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.response?.data?.error || "Impossible de charger le conteneur",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conteneurId]);

  useEffect(() => {
    loadConteneur();
  }, [loadConteneur]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConteneur(false);
  };

  const handleDelete = () => {
    if (!conteneur) return;
    Alert.alert(
      "Supprimer",
      `Supprimer le conteneur ${conteneur.numeroBL} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await conteneurService.delete(conteneur.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                "Erreur",
                error.response?.data?.error || "Impossible de supprimer",
              );
            }
          },
        },
      ],
    );
  };

  const handleAddCheckpoint = async () => {
    if (!conteneur) return;
    const option = CHECKPOINT_OPTIONS.find((item) => item.type === checkpointType)!;
    setCheckpointSaving(true);
    try {
      await conteneurService.addCheckpoint(conteneur.id, {
        type: option.type,
        statut: option.statut,
        date: new Date().toISOString(),
        lieu: option.lieu,
        notes: checkpointNotes.trim() || undefined,
      });
      setCheckpointOpen(false);
      setCheckpointNotes("");
      await loadConteneur(false);
      Alert.alert("Checkpoint enregistré", `${option.label} a été ajouté au parcours.`);
    } catch (error: any) {
      Alert.alert(
        "Checkpoint non enregistré",
        error.response?.data?.error || "Impossible d’ajouter le checkpoint",
      );
    } finally {
      setCheckpointSaving(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  if (!conteneur) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Conteneur non trouvé</Text>
      </View>
    );
  }

  const statutColor = STATUT_COLORS[conteneur.statut] || "#95a5a6";
  const statutLabel = STATUT_LABELS[conteneur.statut] || conteneur.statut;
  const checkpoints = conteneur.checkpoints || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* En-tête */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.blLabel}>N° B/L</Text>
            <Text style={styles.blValue}>{conteneur.numeroBL}</Text>
          </View>
          <View
            style={[
              styles.statutBadge,
              { backgroundColor: statutColor + "20" },
            ]}
          >
            <Text style={[styles.statutText, { color: statutColor }]}>
              {statutLabel}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={18} color="#7f8c8d" />
            <Text style={styles.infoLabel}>Consignataire</Text>
            <Text style={styles.infoValue}>{conteneur.consignataire.nom}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={18} color="#7f8c8d" />
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoValue}>
              {conteneur.client.prenom} {conteneur.client.nom}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={18} color="#7f8c8d" />
            <Text style={styles.infoLabel}>Destination</Text>
            <Text style={styles.infoValue}>{conteneur.destination}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cube-outline" size={18} color="#7f8c8d" />
            <Text style={styles.infoLabel}>Type marchandise</Text>
            <Text style={styles.infoValue}>{conteneur.typeMarchandise}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
          <Text style={styles.dateText}>
            Date d'arrivée estimée :{" "}
            {new Date(conteneur.dateArrivee).toLocaleDateString("fr-FR")}
          </Text>
        </View>
      </View>

      {/* Actions logisticien */}
      {isLogisticien && (
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.checkpointBtn]}
            onPress={() => setCheckpointOpen(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Checkpoint</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() =>
              navigation.navigate("ConteneurForm", {
                conteneurId: String(conteneur.id),
              })
            }
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline des checkpoints */}
      <View style={styles.timelineCard}>
        <Text style={styles.sectionTitle}>Historique des checkpoints</Text>
        {checkpoints.length === 0 ? (
          <Text style={styles.emptyText}>Aucun checkpoint enregistré</Text>
        ) : (
          checkpoints.map((cp, index) => (
            <View key={cp.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={styles.timelineDot} />
                {index < checkpoints.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineType}>
                    {CHECKPOINT_TYPES[cp.type] || cp.type}
                  </Text>
                  <Text style={styles.timelineDate}>
                    {new Date(cp.date).toLocaleString("fr-FR")}
                  </Text>
                </View>
                <Text style={styles.timelineStatut}>{cp.statut}</Text>
                <Text style={styles.timelineLieu}>{cp.lieu}</Text>
                {cp.notes && (
                  <Text style={styles.timelineNotes}>{cp.notes}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <Modal visible={checkpointOpen} transparent animationType="slide" onRequestClose={() => setCheckpointOpen(false)}>
        <View style={styles.modalLayer}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCheckpointOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nouveau checkpoint</Text>
                <Text style={styles.modalSubtitle}>{conteneur.numeroBL}</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setCheckpointOpen(false)} accessibilityLabel="Fermer">
                <Ionicons name="close" size={23} color="#5d6d7e" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Poste de contrôle</Text>
            <View style={styles.checkpointOptions}>
              {CHECKPOINT_OPTIONS.map((option) => {
                const selected = checkpointType === option.type;
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[styles.checkpointOption, selected && styles.checkpointOptionSelected]}
                    onPress={() => setCheckpointType(option.type)}
                  >
                    <Ionicons name={option.icon} size={20} color={selected ? "#0b4f8a" : "#718096"} />
                    <View style={styles.checkpointOptionCopy}>
                      <Text style={[styles.checkpointOptionTitle, selected && styles.checkpointOptionTitleSelected]}>{option.label}</Text>
                      <Text style={styles.checkpointOptionPlace}>{option.lieu}</Text>
                    </View>
                    <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? "#f0ce00" : "#a0aec0"} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Note opérationnelle (facultatif)</Text>
            <TextInput
              style={styles.notesInput}
              value={checkpointNotes}
              onChangeText={setCheckpointNotes}
              placeholder="Ex. contrôle documentaire terminé"
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={[styles.saveCheckpointButton, checkpointSaving && styles.buttonDisabled]}
              onPress={handleAddCheckpoint}
              disabled={checkpointSaving}
            >
              {checkpointSaving ? <ActivityIndicator color="#071b39" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#071b39" />}
              <Text style={styles.saveCheckpointText}>{checkpointSaving ? "Enregistrement..." : "Valider le checkpoint"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerCard: {
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  blLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  blValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 2,
  },
  statutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statutText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    width: "47%",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginTop: 2,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f2f6",
  },
  dateText: {
    fontSize: 13,
    color: "#7f8c8d",
    marginLeft: 6,
  },
  actionsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  editBtn: {
    backgroundColor: "#2980b9",
  },
  checkpointBtn: {
    backgroundColor: "#27ae60",
  },
  deleteBtn: {
    backgroundColor: "#c0392b",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
  },
  timelineLeft: {
    alignItems: "center",
    width: 24,
    marginRight: 12,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2980b9",
    borderWidth: 3,
    borderColor: "#eaf2f8",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#dcdde1",
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  timelineDate: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  timelineStatut: {
    fontSize: 13,
    color: "#2980b9",
    fontWeight: "500",
    marginTop: 2,
  },
  timelineLieu: {
    fontSize: 13,
    color: "#7f8c8d",
    marginTop: 2,
  },
  timelineNotes: {
    fontSize: 12,
    color: "#95a5a6",
    marginTop: 4,
    fontStyle: "italic",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
  },
  emptyText: {
    fontSize: 16,
    color: "#95a5a6",
  },
  modalLayer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(4, 18, 40, 0.62)",
  },
  modalSheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#102a4c",
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    marginTop: 3,
    color: "#718096",
    fontSize: 13,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#edf2f7",
  },
  fieldLabel: {
    marginBottom: 9,
    color: "#334e68",
    fontSize: 13,
    fontWeight: "700",
  },
  checkpointOptions: {
    gap: 8,
    marginBottom: 18,
  },
  checkpointOption: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 10,
    paddingHorizontal: 13,
    backgroundColor: "#f8fafc",
  },
  checkpointOptionSelected: {
    borderColor: "#0b4f8a",
    backgroundColor: "#eef6ff",
  },
  checkpointOptionCopy: {
    flex: 1,
  },
  checkpointOptionTitle: {
    color: "#334e68",
    fontSize: 14,
    fontWeight: "700",
  },
  checkpointOptionTitleSelected: {
    color: "#0b4f8a",
  },
  checkpointOptionPlace: {
    marginTop: 2,
    color: "#718096",
    fontSize: 12,
  },
  notesInput: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    color: "#1e293b",
    fontSize: 14,
    textAlignVertical: "top",
  },
  saveCheckpointButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    borderRadius: 9,
    backgroundColor: "#f0ce00",
  },
  saveCheckpointText: {
    color: "#071b39",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.58,
  },
});
