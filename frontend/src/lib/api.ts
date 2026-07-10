const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // --- Nodes ---
  getNodes: () => request("/api/nodes/"),
  getNode: (id: number) => request(`/api/nodes/${id}`),
  createNode: (data: any) => request("/api/nodes/", { method: "POST", body: JSON.stringify(data) }),
  updateNode: (id: number, data: any) => request(`/api/nodes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteNode: (id: number) => request(`/api/nodes/${id}`, { method: "DELETE" }),

  // --- Dashboard ---
  getOverview: () => request("/api/dashboard/overview"),

  // --- Radiation Fault Sim ---
  runSimulation: (nodeId: number, intensity: number) => 
    request(`/api/fault-sim/run/${nodeId}`, { method: "POST", body: JSON.stringify({ intensity }) }),
  getSimulationHistory: (nodeId: number) => request(`/api/fault-sim/history/${nodeId}`),

  // --- Thermal Engine ---
  runThermalStep: (nodeId: number, load: number) =>
    request(`/api/thermal/run/${nodeId}`, { method: "POST", body: JSON.stringify({ compute_load: load }) }),
  getThermalHistory: (nodeId: number) => request(`/api/thermal/history/${nodeId}`),
  getThermalHeatmap: (nodeId: number) => request(`/api/thermal/heatmap/${nodeId}`),

  // --- ECC Health Monitor ---
  getEccHistory: (nodeId: number) => request(`/api/ecc/history/${nodeId}`),
  triggerEccBurst: (nodeId: number, correctable: number, uncorrectable: number) =>
    request(`/api/ecc/trigger/${nodeId}`, { method: "POST", body: JSON.stringify({ correctable, uncorrectable }) }),

  // --- Failure Propagation Graph ---
  getTopology: () => request("/api/graph/topology"),
  simulateCascade: (failedNodeIds: string[]) =>
    request("/api/graph/cascade", { method: "POST", body: JSON.stringify(failedNodeIds) }),

  // --- Recovery Planner ---
  planRecovery: (nodeId: number) => request(`/api/recovery/plan/${nodeId}`, { method: "POST" }),
  getRecoveryHistory: () => request("/api/recovery/history"),
  executeRecovery: (actionId: number) => request(`/api/recovery/execute/${actionId}`, { method: "POST" }),
  getTmrRecommendations: () => request("/api/recovery/tmr"),

  // --- OrbitStack v2 Extensions ---
  getTwins: () => request("/api/twins/list"),
  getTwinTimeline: (id: number) => request(`/api/twins/${id}/timeline`),
  replayTwin: (id: number) => request(`/api/twins/${id}/replay`),
  trainML: () => request("/api/ml/train", { method: "POST" }),
  getMLRankings: () => request("/api/ml/rank"),
  getMLPrediction: (nodeId: number) => request(`/api/ml/predict/${nodeId}`, { method: "POST" }),
  getMLStatus: () => request("/api/ml/status"),
  simulateMission: (data: any) => request("/api/mission/simulate", { method: "POST", body: JSON.stringify(data) }),
  getMissionRuns: () => request("/api/mission/runs"),
  getRadiationProfiles: () => request("/api/radiation-library/profiles"),
  calculateRadiationAttenuation: (params: any) => request(
    `/api/radiation-library/calculate?profile_id=${params.profile_id}&material=${params.material}&thickness=${params.thickness}&device_type=${params.device_type}&duration_hours=${params.duration_hours}`
  ),
  getKernels: () => request("/api/kernels/list"),
  simulateKernel: (params: any) => request(
    `/api/kernels/simulate/${params.profile_id}?bit_flips=${params.bit_flips}&register_corruptions=${params.register_corruptions}`, 
    { method: "POST" }
  ),
  getKernelRuns: (id: number) => request(`/api/kernels/${id}/runs`),
  getGlobalRiskHistory: () => request("/api/risk/history"),
  getCurrentGlobalRisk: () => request("/api/risk/global"),
};
