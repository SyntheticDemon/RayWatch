import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { ActorsPage } from "@/features/actors/actors-page";
import { ClusterPage } from "@/features/cluster/cluster-page";
import { NodeDetailPage } from "@/features/cluster/node-detail-page";
import { OverviewPage } from "@/features/overview/overview-page";
import { InternalRunsPage } from "@/features/jobs/internal-runs-page";
import { JobDetailPage } from "@/features/jobs/job-detail-page";
import { JobsPage } from "@/features/jobs/jobs-page";
import { TaskDetailPage } from "@/features/jobs/task-detail-page";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App>
          <Routes>
            <Route path="/" element={<JobsPage />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/actors" element={<ActorsPage />} />
            <Route path="/cluster" element={<ClusterPage />} />
            <Route path="/cluster/nodes/:nodeId" element={<NodeDetailPage />} />
            <Route path="/internal-runs" element={<InternalRunsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          </Routes>
        </App>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
