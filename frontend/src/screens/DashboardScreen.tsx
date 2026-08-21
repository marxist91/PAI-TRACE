import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { conteneurService, checkpointService, Conteneur, Checkpoint } from "../services/api";

const { width } = Dimensions.get("window");

interface StatCardProps {
  title: string;
  value: string | number;
  color: string;
  icon: string;
  subtitle?: string;
}

function StatCard({ title, value, color, icon, subtitle }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const CHECKPOINT_TYPES: Record<string, string> = {
  CONSIGNATAIRE: "Consignataire",
  TERMINAL_LCT: "Terminal LCT",
  TERMINAL_TOGO: "Terminal Togo",
  PIA: "PIA (Port Sec)",
};

function CheckpointTimeline({ checkpoints }: { checkpoints: Checkpoint[] }) {
  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.sectionTitle}>Derniers checkpoints</Text>
      {checkpoints.length === 0 ? (
        <Text style={styles.emptyText}>Aucun checkpoint récent</Text>
      ) : (
        checkpoints.slice(0, 5).map((cp, index) => (
          <View key={cp.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, styles.dotCompleted]} />
              {index < Math.min(checkpoints.length, 5) - 1 && (
                <View style={styles.timelineLine} />
              )}
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineName}>
                  {CHECKPOINT_TYPES[cp.type] || cp.type}
                </Text>
                <Text style={styles.timelineTime}>
                  {new Date(cp.date).toLocaleString("fr-FR")}
                </Text>
              </View>
              <Text style={styles.timelineCount}>{cp.statut}</Text>
              <Text style={styles.timelineLieu}>{cp.lieu}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function RecentActivity({ conteneurs }: { conteneurs: Conteneur[] }) {
  const recent = conteneurs.slice(0, 5);

  return (
    <View style={styles.activityBox}>
      <Text style={styles.sectionTitle}>Conteneurs récents</Text>
      {recent.map((conteneur) => (
        <View key={conteneur.id} style={styles.activityItem}>
          <View style={styles.activityLeft}>
            <Text style={styles.activityAction}>{conteneur.numeroBL}</Text>
            <Text style={styles.activityContainerText}>
              {conteneur.destination}
            </Text>
          </View>
          <Text style={styles.activityTime}>{conteneur.statut}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conteneurs, setConteneurs] = useState<Conteneur[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [stats, setStats] = useState({
    enTransit: 0,
    arrives: 0,
    enAttente: 0,
    total: 0,
  });

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [conteneursData, checkpointsData] = await Promise.all([
        conteneurService.getAll(),
        checkpointService.getRecent(10),
      ]);

      setConteneurs(conteneursData);
      setCheckpoints(checkpointsData);

      const total = conteneursData.length;
      const enTransit = conteneursData.filter((c) =>
        ["EN_TRANSIT_VERS_TERMINAL", "EN_TRANSIT_VERS_PIA", "AU_TERMINAL", "DECHARGE_SOUS_PALAN"].includes(c.statut)
      ).length;
      const arrives = conteneursData.filter((c) =>
        ["ARRIVE_PIA", "STOCKE_PIA", "DOUANE", "LIVRE"].includes(c.statut)
      ).length;
      const enAttente = conteneursData.filter((c) =>
        ["EN_ATTENTE", "CHEZ_CONSIGNATAIRE"].includes(c.statut)
      ).length;

      setStats({ enTransit, arrives, enAttente, total });
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.response?.data?.error || "Impossible de charger le tableau de bord",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Bonjour, {user?.prenom || user?.nom}
          </Text>
          <Text style={styles.role}>
            {user?.role === "LOGISTICIEN" ? "Logisticien" : "Client"}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title="En transit" value={stats.enTransit} color="#3498db" icon="🚛" subtitle="Vers la PIA" />
        <StatCard title="Arrivés PIA" value={stats.arrives} color="#2ecc71" icon="✅" subtitle="Ce mois" />
        <StatCard title="En attente" value={stats.enAttente} color="#f39c12" icon="⏳" subtitle="Au terminal" />
        <StatCard title="Total" value={stats.total} color="#9b59b6" icon="📦" subtitle="Conteneurs" />
      </View>

      <CheckpointTimeline checkpoints={checkpoints} />

      {user?.role === "LOGISTICIEN" && <RecentActivity conteneurs={conteneurs} />}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  role: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    width: (width - 44) / 2,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statInfo: {},
  statValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  statTitle: {
    fontSize: 13,
    color: "#7f8c8d",
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: "#bdc3c7",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
  },
  timelineContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 8,
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
    borderWidth: 3,
  },
  dotCompleted: {
    backgroundColor: "#2ecc71",
    borderColor: "#2ecc71",
  },
  dotInProgress: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  dotPending: {
    backgroundColor: "#ecf0f1",
    borderColor: "#bdc3c7",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#dcdde1",
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 12,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timelineName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c3e50",
  },
  timelineTime: {
    fontSize: 13,
    color: "#7f8c8d",
  },
  timelineCount: {
    fontSize: 13,
    color: "#3498db",
    marginTop: 4,
    fontWeight: "500",
  },
  timelineLieu: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#95a5a6",
    textAlign: "center",
    paddingVertical: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
  },
  activityBox: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
  },
  activityLeft: {},
  activityAction: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2c3e50",
  },
  activityContainerText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#bdc3c7",
  },
});
