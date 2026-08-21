import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ConteneursStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { Conteneur, conteneurService } from "../services/api";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<ConteneursStackParamList, "ConteneursList">;

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

const FILTRES = [
  "EN_ATTENTE",
  "CHEZ_CONSIGNATAIRE",
  "EN_TRANSIT_VERS_TERMINAL",
  "AU_TERMINAL",
  "ARRIVE_PIA",
  "LIVRE",
];

export default function ConteneursScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isLogisticien = user?.role === "LOGISTICIEN";
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const [conteneurs, setConteneurs] = useState<Conteneur[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConteneurs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params: { statut?: string; search?: string } = {};
      if (filterStatut) params.statut = filterStatut;
      if (search.trim()) params.search = search.trim();

      const data = await conteneurService.getAll(params);
      setConteneurs(data);
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.response?.data?.error || "Impossible de charger les conteneurs",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatut, search]);

  useEffect(() => {
    loadConteneurs();
  }, [loadConteneurs]);

  useFocusEffect(
    useCallback(() => {
      loadConteneurs(false);
    }, [loadConteneurs]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConteneurs(false);
  };

  const handleDelete = (conteneur: Conteneur) => {
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
              loadConteneurs(false);
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

  const renderConteneur = ({ item }: { item: Conteneur }) => {
    const statutColor = STATUT_COLORS[item.statut] || "#95a5a6";
    const statutLabel = STATUT_LABELS[item.statut] || item.statut;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("ConteneurDetail", { conteneurId: String(item.id) })
        }
        onLongPress={() => isLogisticien && handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.blText}>{item.numeroBL}</Text>
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
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Consignataire</Text>
            <Text style={styles.cardValue}>{item.consignataire.nom}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Client</Text>
            <Text style={styles.cardValue}>
              {item.client.prenom} {item.client.nom}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Destination</Text>
            <Text style={styles.cardValue}>{item.destination}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Type</Text>
            <Text style={styles.cardValueHighlight}>{item.typeMarchandise}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par B/L, consignataire, client..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadConteneurs()}
        />
      </View>

      {/* Filtres rapides */}
      <View style={styles.filters}>
        {FILTRES.map((statut) => (
          <TouchableOpacity
            key={statut}
            style={[
              styles.filterBtn,
              filterStatut === statut && {
                backgroundColor: STATUT_COLORS[statut] + "20",
                borderColor: STATUT_COLORS[statut],
              },
            ]}
            onPress={() =>
              setFilterStatut(filterStatut === statut ? null : statut)
            }
          >
            <Text
              style={[
                styles.filterText,
                filterStatut === statut && {
                  color: STATUT_COLORS[statut],
                },
              ]}
              numberOfLines={1}
            >
              {STATUT_LABELS[statut]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2980b9" />
        </View>
      ) : (
        <FlatList
          data={conteneurs}
          renderItem={renderConteneur}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucun conteneur trouvé</Text>
            </View>
          }
        />
      )}

      {/* Bouton flottant d'ajout (logisticiens uniquement) */}
      {isLogisticien && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("ConteneurForm", undefined)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#dcdde1",
    color: "#2c3e50",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexWrap: "wrap",
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dcdde1",
    backgroundColor: "#fff",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7f8c8d",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
  },
  blText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {},
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: "#7f8c8d",
  },
  cardValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2c3e50",
  },
  cardValueHighlight: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2980b9",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#95a5a6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2980b9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
