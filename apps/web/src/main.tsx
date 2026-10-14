import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
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
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          </Routes>
        </App>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
